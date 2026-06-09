<?php
/**
 * Serverové ověření admin PINu. PIN je TADY, ne v klientském buildu.
 * Klient POSTuje {"pin":"..."}, dostane {"ok":true|false}.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

// >>> Až budeš chtít, změň si PIN tady (a nikde jinde už není potřeba). <<<
$ADMIN_PIN = 'AdminjeBuh7';

$raw  = file_get_contents('php://input');
$body = json_decode($raw, true);
$pin  = is_array($body) && isset($body['pin']) ? (string)$body['pin'] : '';

echo json_encode(['ok' => hash_equals($ADMIN_PIN, $pin)]);
