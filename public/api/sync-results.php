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
 *   curl -s "https://levinger.cz/tipovacka/api/sync-results.php?token=VAS_SYNC_TOKEN"
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
$cfg = require __DIR__ . '/secrets.php';
$SYNC_TOKEN = $cfg['SYNC_TOKEN'];
$hasToken = (($_GET['token'] ?? '') === $SYNC_TOKEN);

// Tokenless režim `?live=1`: appka si během zápasu vyžádá refresh sama
// (Wedos cron umí jen 1× za hodinu, na live skóre je to k ničemu).
// Ochrana = throttle přes lockfile: max 1 reálný běh za 240 s, jinak se
// vrátí `throttled` bez jediného upstream requestu. Cron (s tokenem)
// throttle obchází, ale lockfile taky aktualizuje, takže se počítá
// jako čerstvý refresh i pro klienty.
$LIVE_THROTTLE_S = 240;
$lockFile = sys_get_temp_dir() . '/tipovacka-sync-last';
if (!$hasToken) {
    if (!isset($_GET['live'])) {
        http_response_code(403);
        echo json_encode(['error' => 'forbidden']);
        exit;
    }
    $last = (int)@file_get_contents($lockFile);
    $age  = time() - $last;
    if ($age < $LIVE_THROTTLE_S) {
        echo json_encode(['ok' => true, 'throttled' => true, 'retryInS' => $LIVE_THROTTLE_S - $age]);
        exit;
    }
}
// Označ běh hned (ne až po dokončení) — dva souběžné live requesty by jinak
// prošly oba. Bez flocku: worst case je 1 request navíc, kvótu to neohrozí.
@file_put_contents($lockFile, (string)time());

$API_BASE   = 'https://api.football-data.org/v4';
$API_KEY    = $cfg['FOOTBALL_DATA_KEY'];
$FB_PROJECT = 'msfotbaltipovacka';
$FB_KEY     = $cfg['FIREBASE_API_KEY'];

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

// === 3) Sestav zápisy: primárně football-data, fallback api-football ===
$toWrite   = [];  // id => ['hs','as','status','minute','src' => 'fd'|'espn']
$missing   = [];  // id => apiMatch — hraje se / dohráno, ale FD nedodal skóre
$needClock = [];  // id => apiMatch — live z FD, ale bez minuty → doplní ESPN
$nowTs     = time();

foreach ($withId as $id => $m) {
    $st = $m['status'] ?? '';
    $status = null;
    if ($st === 'FINISHED') $status = 'finished';
    elseif ($st === 'IN_PLAY' || $st === 'PAUSED') $status = 'live';

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

    if ($status !== null && $hs !== null && $as !== null) {
        // Minuta: PAUSED = poločasová pauza; jinak z FD `minute`, a když
        // chybí, doplní se z ESPN (needClock) — display-ready string ("57'").
        $min = null;
        if ($status === 'live') {
            if ($st === 'PAUSED') {
                $min = 'HT';
            } elseif (isset($m['minute']) && $m['minute'] !== null && $m['minute'] !== '') {
                $min = is_numeric($m['minute']) ? $m['minute'] . "'" : (string)$m['minute'];
            } else {
                $needClock[$id] = $m;
            }
        }
        $toWrite[$id] = ['hs' => $hs, 'as' => $as, 'status' => $status, 'minute' => $min, 'src' => 'fd'];
        continue;
    }

    // FD skóre nedodal (WC 2026 bug: FINISHED s null skóre). Kandidát na
    // fallback, pokud se zápas hraje nebo dohrál:
    // - FD status FINISHED/IN_PLAY bez skóre, nebo
    // - FD status TIMED, ale výkop byl před < 6 h (FD nepřeklopil ani status)
    $kick = strtotime($m['utcDate'] ?? '') ?: 0;
    if ($status !== null || ($kick > 0 && $kick <= $nowTs && $nowTs - $kick < 6 * 3600)) {
        $missing[$id] = $m;
    }
}

// === 3b) Fallback: ESPN public API (keyless) ===
// FD má pro WC 2026 zpožděnou/rozbitou score pipeline (otvírák: FINISHED
// s null skóre ještě 3 h po konci). ESPN scoreboard dává live i finální
// skóre bez klíče. Volá se JEN když FD něco nedodal (0 requestů navíc jinak).
$fallback = ['candidates' => count($missing), 'used' => false, 'matched' => 0, 'unmatched' => [], 'clock' => 0];

if (count($missing) > 0 || count($needClock) > 0) {
    $fallback['used'] = true;

    // 1 request na každý hrací den, kde něco chybí (typicky 1)
    $dates = [];
    foreach (array_merge(array_values($missing), array_values($needClock)) as $m) {
        $ts = strtotime($m['utcDate'] ?? '');
        if ($ts) $dates[gmdate('Ymd', $ts)] = true;
    }
    $afMatches = []; // ESPN events napříč dny
    foreach (array_keys($dates) as $d) {
        $ch = curl_init("https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=$d");
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => ['Accept: application/json'],
            CURLOPT_TIMEOUT        => 20,
            CURLOPT_FOLLOWLOCATION => true,
        ]);
        $resp = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($code !== 200) { $fallback['error'] = "espn $d HTTP $code"; continue; }
        foreach ((json_decode($resp, true)['events'] ?? []) as $ev) {
            $afMatches[] = $ev;
        }
    }

    // Normalizace názvů týmů — FD a ESPN se občas liší (USA vs United States…)
    $norm = function ($s) {
        $s = strtolower(trim($s ?? ''));
        $t = @iconv('UTF-8', 'ASCII//TRANSLIT', $s);
        if ($t !== false) $s = $t;
        $s = preg_replace('/[^a-z ]/', '', $s);
        $alias = [
            'usa' => 'united states', 'korea republic' => 'south korea',
            'ir iran' => 'iran', 'cote divoire' => 'ivory coast',
            'czechia' => 'czech republic', 'turkiye' => 'turkey',
        ];
        return $alias[$s] ?? $s;
    };
    $sim = function ($a, $b) use ($norm) {
        $ta = array_filter(explode(' ', $norm($a)));
        $tb = array_filter(explode(' ', $norm($b)));
        return count(array_intersect($ta, $tb));
    };

    // Index ESPN events podle výkopu (UTC, na minutu) — páruje se výkop + názvy
    $byKickoff = [];
    foreach ($afMatches as $ev) {
        $ts = strtotime($ev['date'] ?? '');
        if (!$ts) continue;
        $byKickoff[gmdate('Y-m-d\TH:i', $ts)][] = $ev;
    }

    // Najdi ESPN event k FD zápasu — výkop na minutu + token-overlap názvů
    $findBest = function ($m) use ($byKickoff, $sim) {
        $key = substr($m['utcDate'] ?? '', 0, 16);
        $best = null;
        $bestSim = 0;
        foreach ($byKickoff[$key] ?? [] as $ev) {
            $home = null; $away = null;
            foreach (($ev['competitions'][0]['competitors'] ?? []) as $c) {
                if (($c['homeAway'] ?? '') === 'home') $home = $c;
                if (($c['homeAway'] ?? '') === 'away') $away = $c;
            }
            if (!$home || !$away) continue;
            $s = $sim($m['homeTeam']['name'] ?? '', $home['team']['displayName'] ?? '')
               + $sim($m['awayTeam']['name'] ?? '', $away['team']['displayName'] ?? '');
            if ($s > $bestSim) { $bestSim = $s; $best = ['home' => $home, 'away' => $away, 'ev' => $ev]; }
        }
        return $best;
    };

    // Minuta z ESPN eventu — display-ready ("57'", "45'+2'", "HT")
    $espnMinute = function ($ev) {
        $tName = $ev['status']['type']['name'] ?? '';
        if ($tName === 'STATUS_HALFTIME') return 'HT';
        $clock = trim($ev['status']['displayClock'] ?? '');
        if ($clock === '' || $clock === "0'") return null;
        return is_numeric($clock) ? $clock . "'" : $clock;
    };

    // Live z FD bez minuty → jen doplň hodiny, skóre už máme
    foreach ($needClock as $id => $m) {
        $best = $findBest($m);
        if (!$best) continue;
        $min = $espnMinute($best['ev']);
        if ($min !== null) {
            $toWrite[$id]['minute'] = $min;
            $fallback['clock']++;
        }
    }

    foreach ($missing as $id => $m) {
        $best = $findBest($m);
        if (!$best) { $fallback['unmatched'][] = $id; continue; }

        $state  = $best['ev']['status']['type']['state'] ?? '';
        $stName = $best['ev']['status']['type']['name'] ?? '';
        if ($state === 'post') {
            // Prodloužení/penalty: ESPN skóre zahrnuje góly z prodloužení,
            // naše pravidla chtějí 90min výsledek → nechá se dopsat z FD.
            if (strpos($stName, 'EXTRA') !== false || strpos($stName, 'AET') !== false
                || strpos($stName, 'PEN') !== false || strpos($stName, 'SHOOTOUT') !== false) {
                continue;
            }
            $status = 'finished';
        } elseif ($state === 'in') {
            $status = 'live';
        } else {
            continue; // pre — ještě se nehraje
        }

        $hs = $best['home']['score'] ?? null;
        $as = $best['away']['score'] ?? null;
        if ($hs === null || $hs === '' || $as === null || $as === '') continue;

        $toWrite[$id] = [
            'hs' => (int)$hs, 'as' => (int)$as, 'status' => $status,
            'minute' => $status === 'live' ? $espnMinute($best['ev']) : null,
            'src' => 'espn',
        ];
        $fallback['matched']++;
    }
}

// === 3c) Zápis do Firestore ===
$written = 0; $errors = []; $bySource = ['fd' => 0, 'espn' => 0];
$skipped = count($withId) - count($toWrite);
foreach ($toWrite as $id => $w) {
    $fields = [
        'homeScore' => ['integerValue' => (string)$w['hs']],
        'awayScore' => ['integerValue' => (string)$w['as']],
        'status'    => ['stringValue'  => $w['status']],
        'updatedAt' => ['stringValue'  => gmdate('c')],
    ];
    // Minuta jen u live — PATCH bez updateMask přepisuje celý dokument,
    // takže u finished pole samo zmizí (nezůstane stará minuta).
    if ($w['status'] === 'live' && !empty($w['minute'])) {
        $fields['minute'] = ['stringValue' => (string)$w['minute']];
    }
    $body = json_encode(['fields' => $fields]);

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
        $bySource[$w['src']]++;
    } else {
        $errors[$id] = $rc;
    }
}

// Připomínky na deadline: Wedos má limit 3 cronů (všechny zabrané), takže
// notify spouštíme přívěškem na tomhle sync cronu. Oddělený soubor = když
// notify selže, sync to neovlivní. Vlastní fetch + notifyLog hlídá duplicity.
$notify = null;
$nc = curl_init('https://levinger.cz/tipovacka/api/notify-deadlines.php?token=' . urlencode($SYNC_TOKEN));
curl_setopt_array($nc, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 30,
]);
$notify = curl_exec($nc);
$nrc = curl_getinfo($nc, CURLINFO_HTTP_CODE);
curl_close($nc);

echo json_encode([
    'ok'       => true,
    'written'  => $written,
    'skipped'  => $skipped,
    'total'    => count($withId),
    'sources'  => $bySource,
    'fallback' => $fallback,
    'errors'   => $errors,
    'notify'   => ['code' => $nrc, 'resp' => json_decode($notify, true)],
], JSON_PRETTY_PRINT);
