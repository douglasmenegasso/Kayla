<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Tratar requisição OPTIONS (preflight do navegador)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Receber dados do frontend
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Dados inválidos ou não JSON', 'received' => $input]);
    exit;
}

// Validação rápida para evitar erros genéricos do Mercado Pago
if (!isset($data['valor']) || !isset($data['user_id'])) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Dados incompletos. É necessário enviar "valor" e "user_id".',
        'received_keys' => array_keys($data)
    ]);
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
            "unit_price" => floatval($data['valor']), // Garante que seja número
            "currency_id" => "BRL"
        ]
    ],
    "payer" => [
        "email" => $data['email'] ?? 'teste@teste.com'
    ],
    "back_urls" => [
        "success" => "https://kayla.app.br/app/pagamento-sucesso.html",
        "failure" => "https://kayla.app.br/app/pagamento-falha.html",
        "pending" => "https://kayla.app.br/app/pagamento-pendente.html"
    ],
    "auto_return" => "approved",
    
    // ✅ CORREÇÃO 1: Notification URL correta (Supabase Edge Function)
    "notification_url" => "https://xwwklngrkvdwgiinycvt.supabase.co/functions/v1/webhook-mp",
    
    // ✅ CORREÇÃO 2: External reference (ID do pagamento no banco)
    "external_reference" => (string)($data['pagamento_id'] ?? ''),
    
    // ✅ CORREÇÃO 3: Metadata completo (webhook precisa desses dados)
    "metadata" => [
        "user_id" => (string)$data['user_id'],
        "plano_id" => (string)($data['plano_id'] ?? ''),
        "num_dispositivos" => intval($data['num_dispositivos'] ?? 1),
        "tipo" => (string)($data['tipo'] ?? 'novo'),
        "assinatura_id" => (string)($data['assinatura_id'] ?? ''),
        "device_id" => (string)($data['device_id'] ?? ''),
        "device_name" => (string)($data['device_name'] ?? 'Web'),
        "device_type" => (string)($data['device_type'] ?? 'web')
    ]
];

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

// Retornar resposta
if ($httpCode === 201 && $response) {
    echo $response;
} else {
    http_response_code($httpCode);
    
    // Garante que o frontend sempre receba um JSON válido, mesmo em caso de erro do MP
    $errorData = json_decode($response, true);
    if ($errorData) {
        echo json_encode([
            'error' => 'Erro ao criar preferência no Mercado Pago',
            'http_code' => $httpCode,
            'mp_response' => $errorData
        ]);
    } else {
        echo json_encode([
            'error' => 'Erro de comunicação',
            'http_code' => $httpCode,
            'curl_error' => $curlError,
            'raw_response' => $response
        ]);
    }
}
?>
