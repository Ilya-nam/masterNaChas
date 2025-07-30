<?php
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Only POST allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || empty($data['message'])) {
    http_response_code(400);
    echo json_encode(['error' => 'No message provided']);
    exit;
}

require __DIR__ . '/../../config.php';

$message = trim($data['message']);
$chat_id = TELEGRAM_GROUP_ID;
$token = TELEGRAM_BOT_API_TOKEN;

$url = "https://api.telegram.org/bot$token/sendMessage";

$post_fields = [
    'chat_id' => $chat_id,
    'text' => $message,
];

$ch = curl_init();

curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $post_fields);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if ($response === false) {
    http_response_code(500);
    echo json_encode(['error' => curl_error($ch)]);
    curl_close($ch);
    exit;
}

curl_close($ch);

// Пробуем декодировать ответ от Telegram
$decoded = json_decode($response, true);

// Если декодирование неудачно — возвращаем ошибку
if ($decoded === null) {
    http_response_code(500);
    echo json_encode(['error' => 'Invalid response from Telegram API']);
    exit;
}

// Если Telegram API вернул ошибку (ok === false)
if (isset($decoded['ok']) && $decoded['ok'] === false) {
    http_response_code(500);
    echo json_encode(['error' => $decoded['description'] ?? 'Telegram API error']);
    exit;
}

// Всё успешно
http_response_code(200);
echo json_encode(['result' => true, 'telegram_response' => $decoded]);
