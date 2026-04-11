<?php
/**
 * CORS proxy pro football-data.org API.
 * Volá se z browseru: /tipovacka/api/wc.php?path=/competitions/WC/matches
 * Skrývá API key + řeší CORS.
 */

// CORS — povol naši doménu
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

// Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Konfigurace
$API_BASE = 'https://api.football-data.org/v4';
$API_KEY = 'db35374c3fe748069840d3f664bfda3c';

// Validace path parametru — povolit jen WC matches endpointy
$path = $_GET['path'] ?? '';
if (!preg_match('#^/competitions/WC/matches(\?[\w&=\-:]*)?$#', $path)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid path: ' . $path]);
    exit;
}

// Cache (3 minuty) — šetří API calls
$cacheKey = md5($path);
$cacheFile = sys_get_temp_dir() . "/wc_proxy_$cacheKey.json";
$cacheTtl = 180; // 3 min

if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < $cacheTtl) {
    readfile($cacheFile);
    exit;
}

// Volání football-data.org
$url = $API_BASE . $path;
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "X-Auth-Token: $API_KEY",
    'Accept: application/json',
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err = curl_error($ch);
curl_close($ch);

if ($err) {
    http_response_code(502);
    echo json_encode(['error' => 'Upstream fetch failed: ' . $err]);
    exit;
}

http_response_code($httpCode);

// Cache úspěšné odpovědi
if ($httpCode === 200) {
    @file_put_contents($cacheFile, $response);
}

echo $response;
