<?php
// Permitir CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Apenas POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método não permitido']);
    exit();
}

// Receber dados
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data || !isset($data['valor'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Dados inválidos', 'received' => $input]);
    exit();
}

// Configurações
$accessToken = 'TEST-7869129183763307-061321-c06646dcbfe57f8f3183d3b60c97a6cf-3471016369';

// Criar preferência
$preference = [
    "items" => [
        [
            "title" => isset($data['titulo']) ? $data['titulo'] : 'Kayla PRO',
            "quantity" => 1,
            "unit_price" => floatval($data['valor']),
            "currency_id" => "BRL"
        ]
    ],
    "back_urls" => [
        "success" => "https://kayla.app.br/app/pagamento-sucesso.html",
        "failure" => "https://kayla.app.br/app/pagamento-falha.html",
        "pending" => "https://kayla.app.br/app/pagamento-pendente.html"
    ],
    "auto_return" => "approved",
    "notification_url" => "https://kayla.app.br/webhook/mercado-pago",
    "metadata" => [
        "user_id" => isset($data['user_id']) ? $data['user_id'] : '',
        "plano_id" => isset($data['plano_id']) ? $data['plano_id'] : ''
    ]
];

// Log para debug
error_log('[MP] Criando preferência: ' . json_encode($preference));

// Chamar API do Mercado Pago
$ch = curl_init("https://api.mercadopago.com/checkout/preferences");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($preference));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "Authorization: Bearer " . $accessToken
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

// Log resposta
error_log('[MP] Resposta HTTP: ' . $httpCode);
error_log('[MP] Resposta: ' . $response);

if ($httpCode === 201 && $response) {
    echo $response;
} else {
    http_response_code($httpCode);
    echo json_encode([
        'error' => 'Erro ao criar preferência',
        'http_code' => $httpCode,
        'curl_error' => $curlError,
        'response' => $response
    ]);
}
?>
