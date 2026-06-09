<?php
/**
 * Cron sync výsledků: football-data.org -> Firestore (kolekce `results`).
 *
 * Spouští se serverovým cronem (každých ~5 min) i ručně z prohlížeče.
 * ID zápasů odvozuje POZIČNĚ (skupina + chronologické pořadí, KO podle fáze) —
 * stejný algoritmus jako resultService.fetchSchedule v JS, takže netřeba
 * duplikovat rozpis ani mapu názvů týmů.
 *
 * Cron příklad (Wedos plánovač úloh, každých 5 min):
 *   curl -s "https://levinger.cz/tipovacka/api/sync-results.php?token=ms2026_sync_n7Qk2pX9"
 */

header('Content-Type: application/json; charset=utf-8');
// Nikdy necachovat na ATS edge — cron musí PHP reálně spustit při každém volání,
// jinak by se vracel cached výstup bez fetch+zápisu do Firestore.
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// --- Slabá ochrana endpointu (jen proti drive-by botům). ---
// POZOR: skutečné zabezpečení = uzamčené Firestore rules. Tenhle token
// brání jen náhodným hitům, protože zápis do Firestore je teď stejně otevřený.
$SYNC_TOKEN = 'ms2026_sync_n7Qk2pX9';
if (($_GET['token'] ?? '') !== $SYNC_TOKEN) {
    http_response_code(403);
    echo json_encode(['error' => 'forbidden']);
    exit;
}

$API_BASE   = 'https://api.football-data.org/v4';
$API_KEY    = 'db35374c3fe748069840d3f664bfda3c';
$FB_PROJECT = 'msfotbaltipovacka';
$FB_KEY     = 'AIzaSyCrcDs70l_CJdQCPZGPHnNf2A9AdCnBb4U';

// === 1) Stáhni zápasy z football-data ===
$ch = curl_init("$API_BASE/competitions/WC/matches");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => ["X-Auth-Token: $API_KEY", 'Accept: application/json'],
    CURLOPT_TIMEOUT        => 20,
    CURLOPT_FOLLOWLOCATION => true,
]);
$resp = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err  = curl_error($ch);
curl_close($ch);

if ($err || $code !== 200) {
    http_response_code(502);
    echo json_encode(['error' => "upstream $code $err"]);
    exit;
}

$data    = json_decode($resp, true);
$matches = $data['matches'] ?? [];

// === 2) Odvození našich ID (poziční, mirror fetchSchedule) ===
$groups = []; // 'A' => [apiMatch, ...]
$ko     = []; // 'LAST_32' => [apiMatch, ...]
$order  = 0;  // původní pořadí z API — stabilní tie-break při shodném utcDate
foreach ($matches as $m) {
    $m['_idx'] = $order++;
    if (($m['stage'] ?? '') === 'GROUP_STAGE') {
        $letter = str_replace('GROUP_', '', $m['group'] ?? '');
        if ($letter === '') continue;
        $groups[$letter][] = $m;
    } else {
        $ko[$m['stage'] ?? ''][] = $m;
    }
}

// Řazení: primárně utcDate, sekundárně původní pořadí z API (stabilní napříč verzemi PHP)
$byDate = function ($a, $b) {
    return strcmp($a['utcDate'] ?? '', $b['utcDate'] ?? '') ?: ($a['_idx'] - $b['_idx']);
};

$withId = []; // 'A1' => apiMatch

foreach ($groups as $letter => $ms) {
    usort($ms, $byDate);
    foreach ($ms as $i => $m) {
        $withId[$letter . ($i + 1)] = $m;
    }
}

$stageMap = [
    'LAST_32'         => 'R32',
    'LAST_16'         => 'R16',
    'QUARTER_FINALS'  => 'QF',
    'SEMI_FINALS'     => 'SF',
    'THIRD_PLACE'     => '3RD',
    'FINAL'           => 'F',
];
foreach ($stageMap as $apiStage => $prefix) {
    $ms = $ko[$apiStage] ?? [];
    usort($ms, $byDate);
    foreach ($ms as $i => $m) {
        $id = ($apiStage === 'THIRD_PLACE' || $apiStage === 'FINAL')
            ? $prefix
            : "$prefix-" . ($i + 1);
        $withId[$id] = $m;
    }
}

// === 3) Zápis hotových / živých výsledků do Firestore ===
$written = 0; $skipped = 0; $errors = [];
foreach ($withId as $id => $m) {
    $st = $m['status'] ?? '';
    if ($st === 'FINISHED') {
        $status = 'finished';
    } elseif ($st === 'IN_PLAY' || $st === 'PAUSED') {
        $status = 'live';
    } else {
        $skipped++; // scheduled apod. nezapisujeme
        continue;
    }

    // ZÁKLADNÍ HRACÍ DOBA (90 min). U zápasů na prodloužení/penalty je 90min
    // skóre v `regularTime`; `fullTime` by obsahoval prodloužení i penalty.
    // U normálně dohraných zápasů `regularTime` chybí a `fullTime` = 90 min.
    $reg = $m['score']['regularTime'] ?? null;
    if (isset($reg['home']) && $reg['home'] !== null) {
        $hs = $reg['home'];
        $as = $reg['away'] ?? null;
    } else {
        $hs = $m['score']['fullTime']['home'] ?? null;
        $as = $m['score']['fullTime']['away'] ?? null;
    }
    if ($hs === null || $as === null) { $skipped++; continue; }

    $body = json_encode(['fields' => [
        'homeScore' => ['integerValue' => (string)$hs],
        'awayScore' => ['integerValue' => (string)$as],
        'status'    => ['stringValue'  => $status],
        'updatedAt' => ['stringValue'  => gmdate('c')],
    ]]);

    // PATCH = upsert dokumentu results/{id}
    $url = "https://firestore.googleapis.com/v1/projects/$FB_PROJECT/databases/(default)/documents/results/$id?key=$FB_KEY";
    $c = curl_init($url);
    curl_setopt_array($c, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST  => 'PATCH',
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS     => $body,
        CURLOPT_TIMEOUT        => 15,
    ]);
    curl_exec($c);
    $rc = curl_getinfo($c, CURLINFO_HTTP_CODE);
    curl_close($c);

    if ($rc === 200) {
        $written++;
    } else {
        $skipped++;
        $errors[$id] = $rc;
    }
}

echo json_encode([
    'ok'      => true,
    'written' => $written,
    'skipped' => $skipped,
    'total'   => count($withId),
    'errors'  => $errors,
], JSON_PRETTY_PRINT);
