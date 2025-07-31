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

$targetNumberLast10 = '9010789196';
$toLast10 = mb_substr(digitsOnly($data['to']), -10);
if ($toLast10 !== $targetNumberLast10) {
    echo json_encode(['result' => false, 'message' => 'Номер не совпадает']);
    exit;
}

$duration = (int)$data['duration'];
if ($duration >= 50) {
    echo json_encode(['result' => false, 'message' => 'Звонок слишком длинный']);
    exit;
}

$fromLast10 = mb_substr(digitsOnly($data['from']), -10);
$customerPhone = '+7' . $fromLast10;
$now = time();
$canSend = true;

// === Работа с логом с блокировкой ===
$fp = fopen($logFile, 'c+'); // c+ = create if not exists, read/write
if (!$fp) {
    echo json_encode(['result' => false, 'message' => 'Ошибка открытия лог-файла']);
    exit;
}

flock($fp, LOCK_EX); // Блокировка

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

// Отправка лида
$leadData = [
    'customer_phone' => $customerPhone,
    'customer_name' => 'КЛ',
    'city_id' => 39,
    'description' => "Пропущенный звонок только что\nКомпания МНЧ\nОтправлено автоматически!",
    'source_id' => 855
];

$apiUrl = 'https://kp-lead-centre.ru/api/customer-request/create';
$authHeader = 'Authorization: Basic ' . base64_encode(API_LOGIN . ':' . API_PASSWORD);

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
    // Обновляем лог внутри блокировки
    $logLines[] = "{$customerPhone}|{$now}";

    rewind($fp);             // перемещаем курсор в начало
    ftruncate($fp, 0);       // очищаем файл
    fwrite($fp, implode("\n", $logLines) . "\n"); // записываем обновлённый лог
    fflush($fp);             // сбрасываем буфер
    flock($fp, LOCK_UN);     // снимаем блокировку
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
