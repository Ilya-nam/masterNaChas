<?php

if ($_SERVER['HTTP_X_REQUESTED_WITH'] !== 'XMLHttpRequest') {
    http_response_code(403);
    exit('Access denied');
}

header('Content-Type: application/json');

require_once __DIR__ . '/../../config.php';

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

if (!isset($data['customer_phone']) || !isset($data['customer_name'])) {
    echo json_encode([
        'result' => false,
        'message' => 'Некорректные данные'
    ]);
    exit;
}

$apiUrl = 'https://kp-lead-centre.ru/api/customer-request/create';

$ch = curl_init($apiUrl);

curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Basic ' . base64_encode(API_LOGIN . ':' . API_PASSWORD),
    'Content-Type: application/json'
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($httpCode === 200 && $response) {
    echo $response;
} else {
    echo json_encode([
        'result' => false,
        'message' => $error ?: 'Ошибка при обращении к API'
    ]);
}
