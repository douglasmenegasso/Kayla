<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Receber dados do frontend
$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Dados inválidos']);
    exit;
}

// Configurações do Mercado Pago
$accessToken = 'TEST-7869129183763307-061321-c06646dcbfe57f8f3183d3b60c97a6cf-3471016369';

// Criar preferência
$preference = [
    "items" => [
        [
            "title" => $data['titulo'] ?? 'Kayla PRO',
            "quantity" => 1,
            "unit_price" => floatval($data['valor'] ?? 0),
            "currency_id" => "BRL"
        ]
    ],
    "payer" => [
        "name" => "Usuario",
        "surname" => "Teste",
        "email" => $data['email'] ?? 'teste@teste.com'
    ],
    "back_urls" => [
        "success" => "https://kayla.app.br/app/pagamento-sucesso.html",
        "failure" => "https://kayla.app.br/app/pagamento-falha.html",
        "pending" => "https://kayla.app.br/app/pagamento-pendente.html"
    ],
    "auto_return" => "approved",
    "notification_url" => "https://kayla.app.br/webhook/mercado-pago",
    "metadata" => [
        "user_id" => $data['user_id'] ?? '',
        "plano_id" => $data['plano_id'] ?? '',
        "num_dispositivos" => $data['num_dispositivos'] ?? 1
    ]
];

// Chamar API do Mercado Pago - endpoint corrigido
$ch = curl_init("https://api.mercadopago.com/checkout/preferences?access_token=" . $accessToken);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($preference));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json"
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

// Log para debug
error_log('[MP] Criando preferência: ' . json_encode($preference));
error_log('[MP] Resposta HTTP: ' . $httpCode);
error_log('[MP] Resposta: ' . $response);
error_log('[MP] Curl Error: ' . $curlError);

if ($httpCode === 201 && $response) {
    echo $response;
} else {
    http_response_code($httpCode);
    // Retorna o erro detalhado do Mercado Pago
    $errorData = json_decode($response, true);
    echo json_encode([
        'error' => 'Erro ao criar preferência',
        'http_code' => $httpCode,
        'curl_error' => $curlError,
        'mp_error' => $errorData,
        'response' => $response
    ]);
}
?>
