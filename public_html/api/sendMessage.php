<?php
// Отправлять JSON в ответ
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(['error' => 'Only POST allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || empty($data['message'])) {
    http_response_code(400);
    echo json_encode(['error' => 'No message provided']);
    exit;
}

require __DIR__ . '/config.php';

$message = trim($data['message']);
$chat_id = TELEGRAM_CHAT_ID;
$token = TELEGRAM_BOT_API_TOKEN;

$url = "https://api.telegram.org/bot$token/sendMessage";

$post_fields = [
    'chat_id' => $chat_id,
    'text' => $message,
];

// Отправка POST запроса через cURL
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

http_response_code($httpCode);
echo $response;
