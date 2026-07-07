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
    
    // ✅ CORREÇÃO 1: Notification URL correta (Supabase Edge Function)
    "notification_url" => "https://xwwklngrkvdwgiinycvt.supabase.co/functions/v1/webhook-mp",
    
    // ✅ CORREÇÃO 2: External reference (ID do pagamento no banco)
    // O webhook usa isso para encontrar o pagamento e atualizar o status
    "external_reference" => $data['pagamento_id'] ?? '',
    
    // ✅ CORREÇÃO 3: Metadata completo (webhook precisa desses dados)
    "metadata" => [
        "user_id" => $data['user_id'] ?? '',
        "plano_id" => $data['plano_id'] ?? '',
        "num_dispositivos" => $data['num_dispositivos'] ?? 1,
        "tipo" => $data['tipo'] ?? 'novo',
        "assinatura_id" => $data['assinatura_id'] ?? '',
        "device_id" => $data['device_id'] ?? '',
        "device_name" => $data['device_name'] ?? 'Web',
        "device_type" => $data['device_type'] ?? 'web'
    ]
];
