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
curl_close($ch);

if ($httpCode === 201) {
    echo $response;
} else {
    http_response_code($httpCode);
    echo $response;
}
?>
