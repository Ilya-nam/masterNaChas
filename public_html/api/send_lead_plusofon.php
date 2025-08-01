<?php

header('Content-Type: application/json');
require_once __DIR__ . '/../../config.php';

$logFile = __DIR__ . '/../../calls_log.txt';
$rawInput = file_get_contents('php://input');
parse_str($rawInput, $data);

// Проверка обязательных полей
if (!isset($data['from'], $data['to'], $data['duration'], $data['hook_event'])) {
    echo json_encode(['result' => false, 'message' => 'Отсутствуют обязательные поля']);
    exit;
}

// Обрабатываем только завершение звонка
if ($data['hook_event'] !== 'channel_destroy') {
    echo json_encode(['result' => true, 'message' => 'Событие не для обработки']);
    exit;
}

// Нормализация номера
function digitsOnly($phone) {
    return preg_replace('/\D/', '', $phone);
}

$toLast10 = mb_substr(digitsOnly($data['to']), -10);
$duration = (int)$data['duration'];

if ($duration >= 50) {
    echo json_encode(['result' => false, 'message' => 'Звонок слишком длинный']);
    exit;
}

$fromLast10 = mb_substr(digitsOnly($data['from']), -10);
$customerPhone = '+7' . $fromLast10;
$now = time();
$canSend = true;

// Работа с логом
$fp = fopen($logFile, 'c+');
if (!$fp) {
    echo json_encode(['result' => false, 'message' => 'Ошибка открытия лог-файла']);
    exit;
}

flock($fp, LOCK_EX);

$logLines = [];
while (($line = fgets($fp)) !== false) {
    $line = trim($line);
    if ($line === '') continue;

    [$loggedPhone, $timestamp] = explode('|', $line);
    $timestamp = (int)$timestamp;

    if (($now - $timestamp) <= 900) {
        $logLines[] = "{$loggedPhone}|{$timestamp}";
        if ($loggedPhone === $customerPhone) {
            $canSend = false;
        }
    }
}

if (!$canSend) {
    flock($fp, LOCK_UN);
    fclose($fp);
    echo json_encode(['result' => false, 'message' => 'Звонок уже был в течение 15 минут']);
    exit;
}

// Настройка параметров отправки в зависимости от номера
$leadData = [
    'customer_phone' => $customerPhone,
    'customer_name' => 'КЛ',
    'description' => "Пропущенный звонок только что\nКомпания МНЧ\nОтправлено автоматически!",
];

if ($toLast10 === '9010789196') {
    $apiUrl = 'https://kp-lead-centre.ru/api/customer-request/create';
    $authHeader = 'Authorization: Basic ' . base64_encode(API_LOGIN . ':' . API_PASSWORD);
    $leadData['source_id'] = 855;
    $leadData['city_id'] = 39;
} elseif ($toLast10 === '9010783108') {
    $apiUrl = API_URL;
    $authHeader = 'Authorization: Basic ' . base64_encode(API_MNC_LOGIN . ':' . API_MNC_PASSWORD);
    $leadData['source_id'] = 376;
    // Не добавляем city_id
} else {
    flock($fp, LOCK_UN);
    fclose($fp);
    echo json_encode(['result' => false, 'message' => 'Номер не совпадает с допустимыми']);
    exit;
}

// Отправка запроса
$ch = curl_init($apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($leadData));
curl_setopt($ch, CURLOPT_HTTPHEADER, [$authHeader, 'Content-Type: application/json']);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($httpCode === 200 && $response) {
    $logLines[] = "{$customerPhone}|{$now}";

    rewind($fp);
    ftruncate($fp, 0);
    fwrite($fp, implode("\n", $logLines) . "\n");
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);

    echo $response;
} else {
    flock($fp, LOCK_UN);
    fclose($fp);
    echo json_encode([
        'result' => false,
        'message' => $error ?: 'Ошибка при обращении к API'
    ]);
}
