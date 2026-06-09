<?php
/**
 * Cron: připomínka na blížící se DEADLINE hracího dne.
 *
 * ~1–2 h před uzávěrkou tipů rozešle všem přihlášeným odběratelům (kolekce
 * `pushSubs`) contentless Web Push (bez payloadu — text je napevno v sw.js).
 * Aby se neposlalo víckrát, značí odeslání do `notifyLog/{hraciDen}`.
 *
 * Deadline = 90 min před prvním zápasem hracího dne. Hrací den se počítá
 * stejně jako v klientu (src/utils/date.js): zápas s místním začátkem PŘED
 * polednem patří k předchozímu hracímu dni (kvůli zámořským nočním zápasům).
 *
 * Cron (Wedos, každou hodinu):
 *   curl -s "https://levinger.cz/tipovacka/api/notify-deadlines.php?token=ms2026_sync_n7Qk2pX9"
 *
 * Testovací parametry:
 *   &dry=1            — nic neodešle, jen vypíše co by udělal
 *   &force=YYYY-MM-DD — vynutí odeslání pro daný hrací den (ignoruje okno i log)
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

$cfg = require __DIR__ . '/secrets.php';

if (($_GET['token'] ?? '') !== $cfg['SYNC_TOKEN']) {
    http_response_code(403);
    echo json_encode(['error' => 'forbidden']);
    exit;
}

$DRY        = ($_GET['dry'] ?? '') === '1';
$FORCE_DAY  = $_GET['force'] ?? '';
$FB_PROJECT = 'msfotbaltipovacka';
$FB_KEY     = $cfg['FIREBASE_API_KEY'];
$FB_BASE    = "https://firestore.googleapis.com/v1/projects/$FB_PROJECT/databases/(default)/documents";
$WINDOW_SEC = 5400; // 90 min — okno před deadlinem, kdy se připomínka pošle

// === 1) Zápasy z football-data → deadliny hracích dnů ===
// Fetch z Wedosu je občas flaky (TLS „end of file"). Kritická cesta —
// když selže zrovna tik v okně deadlinu, připomínka nevyjde. Proto retry.
$resp = false; $code = 0;
for ($attempt = 1; $attempt <= 3; $attempt++) {
    $ch = curl_init('https://api.football-data.org/v4/competitions/WC/matches');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => ['X-Auth-Token: ' . $cfg['FOOTBALL_DATA_KEY'], 'Accept: application/json'],
        CURLOPT_TIMEOUT        => 20,
        CURLOPT_FOLLOWLOCATION => true,
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($code === 200) break;
    if ($attempt < 3) sleep(2);
}

if ($code !== 200) {
    http_response_code(502);
    echo json_encode(['error' => "upstream $code"]);
    exit;
}

$matches = json_decode($resp, true)['matches'] ?? [];

// První zápas (UTC timestamp) každého hracího dne
$tz = new DateTimeZone('Europe/Prague');
$firstByDay = []; // 'YYYY-MM-DD' => unix ts prvního zápasu
foreach ($matches as $m) {
    if (empty($m['utcDate'])) continue;
    $dt = new DateTime($m['utcDate']); // ISO Z
    $ts = $dt->getTimestamp();
    $dt->setTimezone($tz);
    $localHour = (int)$dt->format('G');
    $day = $dt->format('Y-m-d');
    if ($localHour < 12) { // před polednem → patří k předchozímu hracímu dni
        $prev = clone $dt;
        $prev->modify('-1 day');
        $day = $prev->format('Y-m-d');
    }
    if (!isset($firstByDay[$day]) || $ts < $firstByDay[$day]) {
        $firstByDay[$day] = $ts;
    }
}

// === 2) Které hrací dny mají teď „za chvíli" deadline? ===
$now = time();
$due = []; // ['day'=>..., 'deadline'=>ts]
foreach ($firstByDay as $day => $firstTs) {
    $deadline = $firstTs - 90 * 60; // 90 min před prvním zápasem
    if ($FORCE_DAY !== '') {
        if ($day === $FORCE_DAY) $due[] = ['day' => $day, 'deadline' => $deadline];
    } elseif ($now >= $deadline - $WINDOW_SEC && $now < $deadline) {
        $due[] = ['day' => $day, 'deadline' => $deadline];
    }
}

if (!$due) {
    echo json_encode(['ok' => true, 'due' => [], 'now' => gmdate('c', $now)]);
    exit;
}

// === 3) Pro každý due den: zkontroluj log, rozešli, zaznamenej ===
$VAPID_PUBLIC = $cfg['VAPID_PUBLIC'];
$pkey = openssl_pkey_get_private($cfg['VAPID_PRIVATE_PEM']);
if ($pkey === false) {
    http_response_code(500);
    echo json_encode(['error' => 'vapid key load failed: ' . openssl_error_string()]);
    exit;
}

$report = [];
foreach ($due as $d) {
    $day = $d['day'];

    // Už posláno? (přeskočit, pokud není force/dry)
    if ($FORCE_DAY === '' && !$DRY) {
        $lc = curl_init("$FB_BASE/notifyLog/$day?key=$FB_KEY");
        curl_setopt_array($lc, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10]);
        curl_exec($lc);
        $lcode = curl_getinfo($lc, CURLINFO_HTTP_CODE);
        curl_close($lc);
        if ($lcode === 200) {
            $report[$day] = ['skipped' => 'already sent'];
            continue;
        }
    }

    $subs = fetchSubs($FB_BASE, $FB_KEY);
    $sent = 0; $gone = 0; $failed = 0;

    foreach ($subs as $sub) {
        if ($DRY) { $sent++; continue; }
        $rc = sendPush($sub['endpoint'], $pkey, $VAPID_PUBLIC, $cfg['VAPID_SUBJECT']);
        if ($rc === 201 || $rc === 200) {
            $sent++;
        } elseif ($rc === 404 || $rc === 410) {
            $gone++;
            deleteSub($FB_BASE, $FB_KEY, $sub['id']); // mrtvý odběr → smaž
        } else {
            $failed++;
        }
    }

    // Zaznamenej odeslání (jen reálný cron běh — force je test, log nešpiní)
    if (!$DRY && $FORCE_DAY === '') {
        $body = json_encode(['fields' => [
            'sentAt' => ['stringValue' => gmdate('c')],
            'sent'   => ['integerValue' => (string)$sent],
        ]]);
        $wc = curl_init("$FB_BASE/notifyLog/$day?key=$FB_KEY");
        curl_setopt_array($wc, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST  => 'PATCH',
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            CURLOPT_POSTFIELDS     => $body,
            CURLOPT_TIMEOUT        => 10,
        ]);
        curl_exec($wc);
        curl_close($wc);
    }

    $report[$day] = compact('sent', 'gone', 'failed') + ['subs' => count($subs), 'deadline' => gmdate('c', $d['deadline'])];
}

echo json_encode(['ok' => true, 'dry' => $DRY, 'report' => $report], JSON_PRETTY_PRINT);

// ---------- pomocné funkce ----------

function b64url($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

// DER ECDSA podpis (SEQUENCE{INTEGER r, INTEGER s}) → raw 64B (R||S) pro JOSE
function ecSigDerToRaw($der) {
    $off = 0;
    if (ord($der[$off++]) !== 0x30) return false;
    $off++; // délka sekvence (P-256 podpis je krátký, jednobajtová délka)
    if (ord($der[$off++]) !== 0x02) return false;
    $rLen = ord($der[$off++]);
    $r = substr($der, $off, $rLen); $off += $rLen;
    if (ord($der[$off++]) !== 0x02) return false;
    $sLen = ord($der[$off++]);
    $s = substr($der, $off, $sLen);
    $r = str_pad(ltrim($r, "\x00"), 32, "\x00", STR_PAD_LEFT);
    $s = str_pad(ltrim($s, "\x00"), 32, "\x00", STR_PAD_LEFT);
    return $r . $s;
}

// Podepíše VAPID JWT pro dané audience (origin push endpointu)
function vapidJwt($aud, $pkey, $sub) {
    $header  = b64url(json_encode(['typ' => 'JWT', 'alg' => 'ES256']));
    $payload = b64url(json_encode(['aud' => $aud, 'exp' => time() + 43200, 'sub' => $sub]));
    $input   = "$header.$payload";
    $der = '';
    if (!openssl_sign($input, $der, $pkey, OPENSSL_ALGO_SHA256)) return false;
    $raw = ecSigDerToRaw($der);
    if ($raw === false) return false;
    return "$input." . b64url($raw);
}

// Pošle prázdný (contentless) push na endpoint, vrátí HTTP kód
function sendPush($endpoint, $pkey, $vapidPublic, $subject) {
    $p = parse_url($endpoint);
    $aud = $p['scheme'] . '://' . $p['host'];
    $jwt = vapidJwt($aud, $pkey, $subject);
    if ($jwt === false) return 0;

    $ch = curl_init($endpoint);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => [
            "Authorization: vapid t=$jwt, k=$vapidPublic",
            'TTL: 86400',
            'Content-Length: 0',
            'Urgency: normal',
        ],
        CURLOPT_POSTFIELDS     => '',
        CURLOPT_TIMEOUT        => 15,
    ]);
    curl_exec($ch);
    $rc = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return $rc;
}

// Načte všechny odběry z Firestore: [['id'=>docId,'endpoint'=>url], ...]
function fetchSubs($base, $key) {
    $out = [];
    $ch = curl_init("$base/pushSubs?key=$key&pageSize=300");
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15]);
    $r = curl_exec($ch);
    curl_close($ch);
    $docs = json_decode($r, true)['documents'] ?? [];
    foreach ($docs as $doc) {
        $endpoint = $doc['fields']['endpoint']['stringValue'] ?? '';
        if ($endpoint === '') continue;
        $name = $doc['name'] ?? '';
        $id = substr($name, strrpos($name, '/') + 1);
        $out[] = ['id' => $id, 'endpoint' => $endpoint];
    }
    return $out;
}

// Smaže mrtvý odběr (push služba vrátila 404/410)
function deleteSub($base, $key, $id) {
    $ch = curl_init("$base/pushSubs/$id?key=$key");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST  => 'DELETE',
        CURLOPT_TIMEOUT        => 10,
    ]);
    curl_exec($ch);
    curl_close($ch);
}
