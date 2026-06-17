import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { 
      titulo, 
      valor, 
      email, 
      user_id, 
      plano_id, 
      num_dispositivos, 
      pagamento_id,
      metodo_pagamento = 'pix',  // pix, cartao, debito
      tipo = 'novo',  // novo ou upgrade
      assinatura_id  // para upgrades
    } = await req.json()
    
    const accessToken = 'TEST-7869129183763307-061321-c06646dcbfe57f8f3183d3b60c97a6cf-3471016369'

    // Determinar tipo de pagamento para o Mercado Pago
    // Se for PIX, não definimos payment_method_id para mostrar todas as opções
    let paymentMethodsConfig = {}
    
    if (metodo_pagamento === 'cartao') {
      paymentMethodsConfig = {
        default_payment_method_id: 'credit_card',
        excluded_payment_types: [
          { id: 'debit_card' },
          { id: 'ticket' }  // Boleto
        ],
        installments: 12
      }
    } else if (metodo_pagamento === 'debito') {
      paymentMethodsConfig = {
        default_payment_method_id: 'debit_card',
        excluded_payment_types: [
          { id: 'credit_card' },
          { id: 'ticket' }
        ],
        installments: 1
      }
    } else {
      // PIX - Mostrar todas as opções mas priorizar PIX
      paymentMethodsConfig = {
        excluded_payment_types: [],  // Mostrar todos
        installments: 12
      }
    }

    const preference = {
      items: [{
        title: titulo || 'Kayla PRO',
        quantity: 1,
        unit_price: parseFloat(valor),
        currency_id: 'BRL'
      }],
      payer: {
        email: email || 'usuario@kayla.app.br'
      },
      back_urls: {
        success: 'https://kayla.app.br/app/?payment=success',
        failure: 'https://kayla.app.br/app/?payment=failure',
        pending: 'https://kayla.app.br/app/?payment=pending'
      },
      auto_return: 'approved',
      notification_url: 'https://xwwklngrkvdwgiinycvt.supabase.co/functions/v1/webhook-mp',
      external_reference: pagamento_id || '',
      metadata: {
        user_id: user_id || '',
        plano_id: plano_id || '',
        num_dispositivos: num_dispositivos || 1,
        pagamento_id: pagamento_id || '',
        tipo: tipo || 'novo',
        assinatura_id: assinatura_id || '',
        metodo_pagamento: metodo_pagamento || 'pix'
      },
      // CONFIGURAÇÃO DE MÉTODOS DE PAGAMENTO
      payment_methods: paymentMethodsConfig,
      
      // CONFIGURAÇÕES ADICIONAIS PARA MELHOR EXPERIÊNCIA
      additional_info: {
        items: [{
          id: 'kayla-pro',
          title: titulo || 'Kayla PRO',
          description: 'Plano Kayla PRO - Sistema de Venda Consignada',
          picture_url: 'https://kayla.app.br/assets/icons/icon-192-dark.png',
          category_id: 'others',
          quantity: 1,
          unit_price: parseFloat(valor)
        }],
        payer: {
          first_name: 'Usuario',
          last_name: 'Kayla',
          email: email || 'usuario@kayla.app.br',
          phone: {
            area_code: '11',
            number: '999999999'
          },
          address: {
            zip_code: '01001000',
            street_name: 'Praça da Sé',
            street_number: '1',
            neighborhood: 'Sé',
            city: 'São Paulo',
            state: 'SP'
          }
        }
      },
      
      // IMPORTANTE: Não usar binary_mode para permitir PIX
      binary_mode: false,
      
      // Processamento como agregador
      processing_modes: ['aggregator']
    }

    console.log('[MP] Criando preferência:', JSON.stringify(preference, null, 2))

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(preference)
    })

    const data = await response.json()

    console.log('[MP] Resposta:', JSON.stringify(data, null, 2))

    if (!response.ok) {
      throw new Error(data.message || 'Erro ao criar preferência')
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('[MP] Erro:', error)
    return new Response(JSON.stringify({ 
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
