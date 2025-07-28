<?php
// Отправлять JSON в ответ
header('Content-Type: application/json');

// Получаем сырые данные из тела запроса
$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, true);

if (!$input) {
    echo json_encode(['error' => 'Некорректные входные данные']);
    http_response_code(400);
    exit;
}

// Подключаем config.php с константами API_LOGIN, API_PASSWORD, API_URL
require __DIR__ . '/../../config.php';

// Формируем Basic Auth из констант
$authString = base64_encode(API_LOGIN . ':' . API_PASSWORD);
$headers = [
    "Authorization: Basic $authString",
    "Content-Type: application/json",
];

// Минимальная валидация
if (empty($input['customer_phone']) || empty($input['customer_name'])) {
    echo json_encode(['error' => 'Не указаны обязательные поля']);
    http_response_code(422);
    exit;
}

// Отправляем запрос на API
$ch = curl_init();

curl_setopt($ch, CURLOPT_URL, API_URL);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($input));

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if ($response === false) {
    echo json_encode(['error' => curl_error($ch)]);
    http_response_code(500);
    curl_close($ch);
    exit;
}

curl_close($ch);

// Возвращаем ответ API клиенту
http_response_code($httpCode);
echo $response;
