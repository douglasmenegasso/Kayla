// ============ PAGAMENTOS E ATIVAÇÃO ============

// Configurações do Mercado Pago
window.MP_CONFIG = {
    publicKey: 'TEST-0c124e93-bb15-4e38-a96e-ea85a45523db',
    accessToken: 'TEST-7869129183763307-061321-c06646dcbfe57f8f3183d3b60c97a6cf-3471016369',
    webhooksUrl: 'https://xwwklngrkvdwgiinycvt.supabase.co/functions/v1/webhook-mp'
};

// Configurações de planos
window.PLANOS = {
    mensal: {
        id: 'mensal',
        nome: 'Plano Mensal',
        precoBase: 19.90,
        precoPorDevice: 5.00,
        dispositivosInclusos: 1,
        dispositivosMax: 5,
        duracaoDias: 30,
        tipo: 'mensal'
    },
    anual: {
        id: 'anual',
        nome: 'Plano Anual',
        precoBase: 199.90,
        precoPorDevice: 5.00,
        dispositivosInclusos: 1,
        dispositivosMax: 5,
        duracaoDias: 365,
        tipo: 'anual'
    }
};

// ============ VALIDAÇÃO E ATIVAÇÃO ============

async function validarKeyBackend(keyCode) {
    try {
        var response = await fetch(SUPABASE_EDGE_URL + '/validate-key', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + SUPABASE_KEY
            },
            body: JSON.stringify({
                key_code: keyCode,
                device_id: getDeviceId(),
                device_name: getDeviceName()
            })
        });
        
        var data = await response.json();
        return data;
    } catch (error) {
        console.error('Erro ao validar key:', error);
        return { valid: false, message: 'Erro de conexão' };
    }
}

async function ativarPro() {
    var chave = document.getElementById('pro-key').value.trim().toUpperCase();
    if (!chave || !chave.startsWith('PRO-')) { 
        toast('Chave inválida', 'error'); 
        return; 
    }
    
    var btn = window.event ? window.event.target : null;
    var texto = btn ? btn.innerText : 'Validando...';
    if (btn) {
        btn.innerText = 'Validando...';
        btn.disabled = true;
    }
    
    var resultado = await validarKeyBackend(chave);
    
    if (resultado.valid) {
        LIMITES.proAtivo = true;
        localStorage.setItem('kayla_pro', 'true');
        localStorage.setItem('kayla_pro_key', chave);
        localStorage.setItem('kayla_pro_expires', resultado.expires_at || '');
        localStorage.setItem('kayla_pro_devices', resultado.devices_used + '/' + resultado.max_devices);
        
        toast('✅ Plano PRO ativado! ' + resultado.devices_used + '/' + resultado.max_devices + ' dispositivos', 'success');
        fecharModal();
        atualizarBadgePlano();
        mudarAba('settings');
    } else {
        toast('❌ ' + resultado.message, 'error');
    }
    
    if (btn) {
        btn.innerText = texto;
        btn.disabled = false;
    }
}

// ============ FUNÇÃO AUXILIAR ============

async function getAssinaturaAtiva() {
    if (!currentUser || !supabaseClient) {
        return null;
    }
    
    try {
        var result = await supabaseClient
            .from('assinaturas')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('status', 'ativa')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        
        if (result.error || !result.data) {
            return null;
        }
        
        return result.data;
    } catch(e) {
        console.error('[getAssinaturaAtiva] Erro:', e);
        return null;
    }
}

// ============ TELA DE PLANOS ============

function mostrarPlanos() {
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">🚀 Escolha seu Plano</div>';
    html += '<div class="modal-sub">Selecione o plano ideal para você</div>';
    
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:12px;cursor:pointer;border:2px solid var(--accent)" onclick="selecionarPlano(\'mensal\')">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
    html += '<div style="font-weight:700;font-size:16px">📅 Mensal</div>';
    html += '<span class="badge-pro">POPULAR</span>';
    html += '</div>';
    html += '<div style="font-size:28px;font-weight:700;color:var(--accent);margin-bottom:4px">R$ 19,90<span style="font-size:14px;color:var(--text2)">/mês</span></div>';
    html += '<div style="font-size:12px;color:var(--text2);margin-bottom:12px">Cancele quando quiser</div>';
    html += '<ul style="padding-left:20px;font-size:12px;color:var(--text2);margin:0">';
    html += '<li>✅ 1 dispositivo incluso</li>';
    html += '<li>✅ Clientes ilimitados</li>';
    html += '<li>✅ Produtos ilimitados</li>';
    html += '<li>✅ Geração de PDF</li>';
    html += '<li>✅ Suporte prioritário</li>';
    html += '</ul></div>';
    
    html += '<div class="card" style="background:linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%);padding:16px;margin-bottom:12px;cursor:pointer;border:2px solid var(--accent);position:relative" onclick="selecionarPlano(\'anual\')">';
    html += '<div style="position:absolute;top:-10px;right:16px;background:var(--success);color:#fff;padding:4px 12px;border-radius:12px;font-size:11px;font-weight:700">ECONOMIA 17%</div>';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
    html += '<div style="font-weight:700;font-size:16px;color:#fff">🎯 Anual</div>';
    html += '<span style="background:rgba(255,255,255,0.2);color:#fff;padding:4px 8px;border-radius:4px;font-size:11px;font-weight:600">MELHOR VALOR</span>';
    html += '</div>';
    html += '<div style="font-size:28px;font-weight:700;color:#fff;margin-bottom:4px">R$ 199,90<span style="font-size:14px;opacity:0.9">/ano</span></div>';
    html += '<div style="font-size:12px;color:rgba(255,255,255,0.8);margin-bottom:12px">2 meses grátis!</div>';
    html += '<ul style="padding-left:20px;font-size:12px;color:rgba(255,255,255,0.95);margin:0">';
    html += '<li>✅ Tudo do plano mensal</li>';
    html += '<li>✅ Economia de R$ 38,90</li>';
    html += '<li>✅ Suporte VIP</li>';
    html += '<li>✅ Recursos exclusivos</li>';
    html += '</ul></div>';
    
    html += '<div class="card" style="background:var(--bg3);padding:12px;margin-bottom:12px">';
    html += '<div style="font-size:12px;color:var(--text2);text-align:center">';
    html += '💡 <strong>Dispositivos adicionais:</strong> R$ 5,00/mês cada<br>';
    html += 'Máximo de 5 dispositivos por conta';
    html += '</div></div>';
    
    html += '<button class="btn btn-outline" onclick="fecharModal()">Cancelar</button>';
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
}

// Handler global
window.confirmarPlanoHandler = function(planoId, numDispositivos) {
    confirmarPlano(planoId, numDispositivos);
};

function selecionarPlano(planoId) {
    var plano = PLANOS[planoId];
    
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">📱 Dispositivos</div>';
    html += '<div class="modal-sub">Quantos dispositivos deseja usar?</div>';
    
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
    html += '<div style="font-size:13px;color:var(--text2);margin-bottom:16px;text-align:center">';
    html += 'Selecione o número de dispositivos que terão acesso ao plano PRO';
    html += '</div>';
    
    for (var i = 1; i <= 5; i++) {
        var dispositivosExtras = Math.max(0, i - plano.dispositivosInclusos);
        var precoTotal = planoId === 'anual' 
            ? plano.precoBase + (dispositivosExtras * plano.precoPorDevice * 12)
            : plano.precoBase + (dispositivosExtras * plano.precoPorDevice);
        
        var destaque = i === 1 ? 'border:2px solid var(--accent);' : '';
        var descricaoExtra = i === 1 
            ? '<div class="item-detail">Incluso no plano</div>'
            : '<div class="item-detail">+R$ ' + (dispositivosExtras * plano.precoPorDevice).toFixed(2).replace('.', ',') + '/mês extra</div>';
        
        html += '<div class="item-card" style="margin-bottom:8px;cursor:pointer;' + destaque + '" onclick="window.confirmarPlanoHandler(\'' + planoId + '\', ' + i + ')">';
        html += '<div class="item-info">';
        html += '<div class="item-name">' + i + ' dispositivo' + (i > 1 ? 's' : '') + '</div>';
        html += descricaoExtra;
        html += '</div>';
        html += '<div style="font-weight:700;color:var(--accent);font-size:16px">R$ ' + precoTotal.toFixed(2).replace('.', ',') + '</div>';
        html += '</div>';
    }
    
    html += '</div>';
    html += '<button class="btn btn-outline" onclick="mostrarPlanos()">← Voltar</button>';
    
    document.getElementById('modal-body').innerHTML = html;
}

function confirmarPlano(planoId, numDispositivos) {
    var plano = PLANOS[planoId];
    var dispositivosExtras = Math.max(0, numDispositivos - plano.dispositivosInclusos);
    var precoTotal = planoId === 'anual' 
        ? plano.precoBase + (dispositivosExtras * plano.precoPorDevice * 12)
        : plano.precoBase + (dispositivosExtras * plano.precoPorDevice);
    
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">💳 Pagamento</div>';
    html += '<div class="modal-sub">' + plano.nome + '</div>';
    
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Plano:</span><strong>' + plano.nome + '</strong></div>';
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Dispositivos:</span><strong>' + numDispositivos + '</strong></div>';
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Duração:</span><strong>' + (planoId === 'anual' ? '12 meses' : '1 mês') + '</strong></div>';
    html += '<div style="display:flex;justify-content:space-between;padding-top:12px;border-top:1px solid var(--border);margin-top:12px"><span style="font-size:16px">Total:</span><strong style="color:var(--accent);font-size:20px">R$ ' + precoTotal.toFixed(2).replace('.', ',') + '</strong></div>';
    html += '</div>';
    
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
    html += '<div style="font-weight:600;margin-bottom:12px">Escolha a forma de pagamento:</div>';
    
    // PIX
    html += '<div class="item-card" style="margin-bottom:8px;cursor:pointer;border:2px solid var(--success)" onclick="selecionarMetodoPagamento(\'pix\', \'' + planoId + '\', ' + numDispositivos + ', ' + precoTotal + ')">';
    html += '<div style="display:flex;align-items:center;gap:12px">';
    html += '<div style="font-size:32px">📱</div>';
    html += '<div style="flex:1">';
    html += '<div style="font-weight:700;font-size:16px">PIX</div>';
    html += '<div style="font-size:12px;color:var(--text2)">Aprovação instantânea</div>';
    html += '</div>';
    html += '<div style="background:var(--success);color:#fff;padding:4px 12px;border-radius:12px;font-size:11px;font-weight:600">RECOMENDADO</div>';
    html += '</div></div>';
    
    // Cartão de Crédito
    html += '<div class="item-card" style="margin-bottom:8px;cursor:pointer" onclick="selecionarMetodoPagamento(\'cartao\', \'' + planoId + '\', ' + numDispositivos + ', ' + precoTotal + ')">';
    html += '<div style="display:flex;align-items:center;gap:12px">';
    html += '<div style="font-size:32px">💳</div>';
    html += '<div style="flex:1">';
    html += '<div style="font-weight:700;font-size:16px">Cartão de Crédito</div>';
    html += '<div style="font-size:12px;color:var(--text2)">Parcele em até 12x</div>';
    html += '</div>';
    html += '</div></div>';
    
    // Débito
    html += '<div class="item-card" style="margin-bottom:8px;cursor:pointer" onclick="selecionarMetodoPagamento(\'debito\', \'' + planoId + '\', ' + numDispositivos + ', ' + precoTotal + ')">';
    html += '<div style="display:flex;align-items:center;gap:12px">';
    html += '<div style="font-size:32px">💳</div>';
    html += '<div style="flex:1">';
    html += '<div style="font-weight:700;font-size:16px">Cartão de Débito</div>';
    html += '<div style="font-size:12px;color:var(--text2)">Aprovação imediata</div>';
    html += '</div>';
    html += '</div></div>';
    
    html += '</div>';
    
    html += '<button class="btn btn-outline" onclick="selecionarPlano(\'' + planoId + '\')">← Voltar</button>';
    
    document.getElementById('modal-body').innerHTML = html;
}

// ============ SELEÇÃO DE MÉTODO DE PAGAMENTO ============

function selecionarMetodoPagamento(metodo, planoId, numDispositivos, valor) {
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">💳 Confirmar Pagamento</div>';
    
    var metodoNome = metodo === 'pix' ? 'PIX' : (metodo === 'cartao' ? 'Cartão de Crédito' : 'Cartão de Débito');
    var metodoIcon = metodo === 'pix' ? '📱' : '💳';
    var metodoCor = metodo === 'pix' ? 'var(--success)' : 'var(--accent)';
    
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px;text-align:center">';
    html += '<div style="font-size:48px;margin-bottom:12px">' + metodoIcon + '</div>';
    html += '<div style="font-size:18px;font-weight:700;color:' + metodoCor + '">' + metodoNome + '</div>';
    html += '<div style="font-size:14px;color:var(--text2);margin-top:8px">Você será redirecionado para o Mercado Pago</div>';
    html += '</div>';
    
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
    html += '<div style="font-size:12px;color:var(--text2);margin-bottom:12px">';
    if (metodo === 'pix') {
        html += '✅ <strong>Aprovação instantânea</strong><br>';
        html += '✅ <strong>Escaneie o QR Code</strong> ou copie o código<br>';
        html += '✅ <strong>Disponível 24 horas</strong>';
    } else if (metodo === 'cartao') {
        html += '✅ <strong>Parcele em até 12x</strong><br>';
        html += '✅ <strong>Aceita todos os cartões</strong><br>';
        html += '✅ <strong>Aprovação em segundos</strong>';
    } else {
        html += '✅ <strong>Aprovação imediata</strong><br>';
        html += '✅ <strong>Débito direto da conta</strong><br>';
        html += '✅ <strong>Seguro e prático</strong>';
    }
    html += '</div></div>';
    
    html += '<button class="btn btn-primary" onclick="pagarComMercadoPago(\'' + planoId + '\', ' + numDispositivos + ', ' + valor + ', \'' + metodo + '\')" style="width:100%">🚀 Continuar para Pagamento</button>';
    html += '<button class="btn btn-outline" onclick="confirmarPlano(\'' + planoId + '\', ' + numDispositivos + ')" style="margin-top:8px;width:100%">← Voltar</button>';
    
    document.getElementById('modal-body').innerHTML = html;
}

// ============ PAGAMENTO MERCADO PAGO ============

async function pagarComMercadoPago(planoId, numDispositivos, valor, metodoPagamento) {
    metodoPagamento = metodoPagamento || 'pix';
    
    if (!currentUser) {
        toast('Faça login primeiro', 'error');
        return;
    }
    
    toast('Processando...', 'warning');
    
    try {
        // Buscar ID do plano
        var planoResult = await supabaseClient
            .from('planos')
            .select('id')
            .eq('id', planoId)
            .single();
        
        var planoUUID = planoId;
        if (planoResult.error || !planoResult.data) {
            var buscaPlano = await supabaseClient
                .from('planos')
                .select('id')
                .eq('tipo', planoId)
                .limit(1)
                .single();
            
            if (buscaPlano.data) {
                planoUUID = buscaPlano.data.id;
            } else {
                toast('Plano não encontrado', 'error');
                return;
            }
        } else {
            planoUUID = planoResult.data.id;
        }
        
        // Registrar pagamento
        var registroPagamento = await supabaseClient
            .from('pagamentos')
            .insert({
                user_id: currentUser.id,
                plano_id: planoUUID,
                valor: valor,
                metodo_pagamento: metodoPagamento,
                status: 'pendente'
            })
            .select()
            .single();
        
        if (registroPagamento.error) {
            toast('Erro ao iniciar pagamento', 'error');
            return;
        }
        
        var pagamentoId = registroPagamento.data.id;
        
        // Chamar Edge Function
        var response = await fetch('https://xwwklngrkvdwgiinycvt.supabase.co/functions/v1/criar-pagamento', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3d2tsbmdya3Zkd2dpaW55Y3Z0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NDYwODUsImV4cCI6MjA5NjAyMjA4NX0.XhnNESlgV4Q_kkXRYh4QY2e9RBG-u-qgP9sDHyKfEG4'
            },
            body: JSON.stringify({
                titulo: 'Kayla PRO - ' + PLANOS[planoId].nome,
                valor: valor,
                email: currentUser.email,
                user_id: currentUser.id,
                plano_id: planoUUID,
                num_dispositivos: numDispositivos,
                pagamento_id: pagamentoId,
                metodo_pagamento: metodoPagamento
            })
        });
        
        var resultado = await response.json();
        
        console.log('[MP] Resultado:', resultado);
        
        // Se for PIX, mostrar QR Code na tela
        if (resultado.payment_method === 'pix' && resultado.qr_code) {
            mostrarQRCodePIX(resultado, pagamentoId);
            return;
        }
        
        // Se for Cartão/Débito, redirecionar para MP
        if (resultado.init_point) {
            localStorage.setItem('kayla_pending_payment', JSON.stringify({
                preference_id: resultado.id,
                pagamento_id: pagamentoId,
                plano_id: planoId,
                num_dispositivos: numDispositivos,
                valor: valor,
                metodo: metodoPagamento
            }));
            
            window.location.href = resultado.init_point;
        } else {
            toast('Erro: ' + (resultado.error || 'Tente novamente'), 'error');
        }
        
    } catch(error) {
        console.error('[MP] Erro:', error);
        toast('Erro de conexão: ' + error.message, 'error');
    }
}

// Nova função para mostrar QR Code do PIX
function mostrarQRCodePIX(dados, pagamentoId) {
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">📱 Pagamento PIX</div>';
    html += '<div class="modal-sub">Escaneie o QR Code ou copie o código</div>';
    
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px;text-align:center">';
    
    // Verificar se tem QR Code base64
    if (dados.qr_code_base64 && dados.qr_code_base64.length > 100) {
        html += '<div style="background:#fff;padding:16px;border-radius:8px;margin-bottom:16px;display:inline-block">';
        html += '<img src="' + dados.qr_code_base64 + '" alt="QR Code PIX" style="width:250px;height:250px">';
        html += '</div>';
        html += '<div style="font-size:12px;color:var(--success);margin-bottom:16px">✅ QR Code gerado com sucesso!</div>';
    } else {
        // Se não tem base64, mostrar mensagem e botão para abrir no MP
        html += '<div style="background:var(--bg2);padding:20px;border-radius:8px;margin-bottom:16px">';
        html += '<div style="font-size:48px;margin-bottom:12px">📱</div>';
        html += '<div style="font-size:14px;color:var(--text2);margin-bottom:12px">';
        html += 'O QR Code será gerado no app do seu banco<br>';
        html += 'ou você pode abrir no Mercado Pago';
        html += '</div>';
        html += '</div>';
    }
    
    // Código Copia e Cola
    if (dados.qr_code) {
        html += '<div style="margin-bottom:16px">';
        html += '<div style="font-size:12px;color:var(--text2);margin-bottom:8px">Código PIX (Copia e Cola):</div>';
        html += '<textarea id="pix-codigo" readonly style="width:100%;height:80px;padding:8px;border-radius:8px;border:1px solid var(--border);font-size:11px;resize:none;background:var(--bg2);font-family:monospace">' + dados.qr_code + '</textarea>';
        html += '</div>';
        
        // Botão Copiar
        html += '<button class="btn btn-primary" onclick="copiarCodigoPIX()" style="width:100%;margin-bottom:8px">📋 Copiar Código PIX</button>';
    }
    
    // Link de pagamento (sempre mostrar)
    if (dados.ticket_url) {
        html += '<a href="' + dados.ticket_url + '" target="_blank" class="btn btn-outline" style="width:100%;display:block;text-align:center;margin-bottom:8px;text-decoration:none;padding:12px">🔗 Abrir QR Code no App do Banco</a>';
    }
    
    // Se tiver payment_url (fallback)
    if (dados.payment_url || dados.init_point) {
        var url = dados.payment_url || dados.init_point;
        html += '<a href="' + url + '" target="_blank" class="btn btn-outline" style="width:100%;display:block;text-align:center;margin-bottom:8px;text-decoration:none;padding:12px">🌐 Ver no Mercado Pago</a>';
    }
    
    html += '</div>';
    
    // Instruções
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
    html += '<div style="font-weight:600;margin-bottom:12px">📋 Como pagar:</div>';
    html += '<ol style="padding-left:20px;font-size:12px;color:var(--text2);margin:0">';
    html += '<li style="margin-bottom:8px">Abra o app do seu banco</li>';
    html += '<li style="margin-bottom:8px">Escolha pagar com PIX</li>';
    html += '<li style="margin-bottom:8px">Escaneie o QR Code ou copie o código</li>';
    html += '<li style="margin-bottom:8px">Confirme o pagamento</li>';
    html += '<li>Aprovação é instantânea!</li>';
    html += '</ol>';
    html += '</div>';
    
    html += '<div style="font-size:11px;color:var(--text2);text-align:center;margin-bottom:12px">';
    html += '⏱️ Este QR Code expira em 24 horas';
    html += '</div>';
    
    html += '<button class="btn btn-outline" onclick="fecharModal()">Fechar</button>';
    
    document.getElementById('modal-body').innerHTML = html;
}

// Função para copiar código PIX
function copiarCodigoPIX() {
    var codigo = document.getElementById('pix-codigo');
    codigo.select();
    codigo.setSelectionRange(0, 99999);
    
    try {
        document.execCommand('copy');
        toast('✅ Código PIX copiado!', 'success');
    } catch(err) {
        // Fallback para navegadores modernos
        navigator.clipboard.writeText(codigo.value).then(function() {
            toast('✅ Código PIX copiado!', 'success');
        }).catch(function() {
            toast('❌ Erro ao copiar. Selecione manualmente.', 'error');
        });
    }
}

// ============ RESTO DAS FUNÇÕES (Upgrade, Dispositivos, etc) ============

async function criarRegistroPagamento(planoId, numDispositivos, valor, metodo) {
    if (!currentUser || !supabaseClient) {
        toast('Faça login primeiro', 'error');
        return null;
    }
    
    try {
        var pagamentoData = {
            user_id: currentUser.id,
            valor: valor,
            metodo_pagamento: metodo,
            status: 'pendente'
        };
        
        var result = await supabaseClient
            .from('pagamentos')
            .insert(pagamentoData)
            .select()
            .single();
        
        if (result.error) {
            console.error('Erro ao criar pagamento:', result.error);
            toast('Erro ao iniciar pagamento', 'error');
            return null;
        }
        
        return result.data;
    } catch(e) {
        console.error('Erro no pagamento:', e);
        toast('Erro de conexão', 'error');
        return null;
    }
}

async function verificarStatusPagamento(pagamentoId) {
    toast('Verificando pagamento...', 'warning');
    
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">✅ Confirmar Pagamento</div>';
    html += '<div class="modal-sub">Insira o código da transação</div>';
    
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
    html += '<div style="font-size:12px;color:var(--text2);margin-bottom:12px">';
    html += 'Após pagar, você receberá um código de confirmação. Insira-o abaixo:';
    html += '</div>';
    html += '<input type="text" class="form-input" id="codigo-transacao" placeholder="Código da transação">';
    html += '</div>';
    
    html += '<button class="btn btn-primary" onclick="confirmarPagamentoManual(\'' + pagamentoId + '\')">✅ Confirmar</button>';
    html += '<button class="btn btn-outline" onclick="fecharModal()">Cancelar</button>';
    
    document.getElementById('modal-body').innerHTML = html;
}

async function confirmarPagamentoManual(pagamentoId) {
    var codigo = document.getElementById('codigo-transacao').value.trim();
    if (!codigo) {
        toast('Digite o código da transação', 'warning');
        return;
    }
    
    toast('Pagamento em análise. Aguarde aprovação.', 'warning');
    fecharModal();
}

function calcularUpgradeProporcional(assinaturaAtual, novosDispositivos) {
    var dataFim = new Date(assinaturaAtual.data_fim);
    
    // Calcular APENAS os dispositivos extras
    var dispositivosExtras = novosDispositivos - assinaturaAtual.dispositivos_max;
    
    if (dispositivosExtras <= 0) {
        return {
            dispositivosExtras: 0,
            valorPorDispositivo: 0,
            valorTotal: 0,
            novaDataFim: dataFim.toISOString()
        };
    }
    
    // Cobra R$ 5,00 POR DISPOSITIVO EXTRA (sempre!)
    // NÃO multiplica pelos meses restantes
    var valorPorDispositivo = 5.00;
    var valorTotal = dispositivosExtras * valorPorDispositivo;
    
    return {
        dispositivosExtras: dispositivosExtras,
        valorPorDispositivo: valorPorDispositivo,
        valorTotal: valorTotal,
        novaDataFim: dataFim.toISOString()
    };
}

async function fazerUpgradeDispositivos() {
    if (!currentUser) {
        toast('Faça login primeiro', 'error');
        return;
    }
    
    var assinatura = await getAssinaturaAtiva();
    if (!assinatura) {
        toast('Nenhuma assinatura ativa encontrada', 'error');
        mostrarPlanos();
        return;
    }
    
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">⬆️ Upgrade de Dispositivos</div>';
    html += '<div class="modal-sub">Adicione mais dispositivos ao seu plano</div>';
    
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
    html += '<div style="text-align:center;margin-bottom:16px">';
    html += '<div style="font-size:14px;color:var(--text2)">Dispositivos atuais: <strong>' + assinatura.dispositivos_max + '</strong></div>';
    html += '<div style="font-size:12px;color:var(--text2);margin-top:8px">Meses restantes: <strong>' + Math.ceil((new Date(assinatura.data_fim) - new Date()) / (1000 * 60 * 60 * 24 * 30)) + '</strong></div>';
    html += '</div>';
    
    for (var i = assinatura.dispositivos_max + 1; i <= 5; i++) {
        var calculo = calcularUpgradeProporcional(assinatura, i);
        
        html += '<div class="item-card" style="margin-bottom:8px;cursor:pointer" onclick="confirmarUpgradeDispositivos(' + i + ', ' + calculo.valorTotal + ')">';
        html += '<div class="item-info">';
        html += '<div class="item-name">' + i + ' dispositivo' + (i > 1 ? 's' : '') + '</div>';
        html += '<div class="item-detail">+' + (i - assinatura.dispositivos_max) + ' dispositivo(s) extra(s) por ' + calculo.mesesRestantes + ' meses</div>';
        html += '</div>';
        html += '<div style="font-weight:700;color:var(--accent);font-size:16px">R$ ' + calculo.valorTotal.toFixed(2).replace('.', ',') + '</div>';
        html += '</div>';
    }
    
    html += '</div>';
    html += '<button class="btn btn-outline" onclick="fecharModal()">Cancelar</button>';
    
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
}

async function confirmarUpgradeDispositivos(novosDispositivos, valor) {
    if (!currentUser) return;
    
    var assinatura = await getAssinaturaAtiva();
    if (!assinatura) return;
    
    var calculo = calcularUpgradeProporcional(assinatura, novosDispositivos);
    
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">⬆️ Confirmar Upgrade</div>';
    
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
    html += '<div style="text-align:center;margin-bottom:16px">';
    html += '<div style="font-size:14px;color:var(--text2)">De ' + assinatura.dispositivos_max + ' para ' + novosDispositivos + ' dispositivo(s)</div>';
    html += '<div style="font-size:12px;color:var(--text2);margin-top:8px">' + calculo.mesesRestantes + ' meses restantes na assinatura</div>';
    html += '</div>';
    
    html += '<div style="background:var(--bg2);padding:12px;border-radius:8px;margin-bottom:12px">';
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:8px">';
    html += '<span style="font-size:12px;color:var(--text2)">Dispositivos extras:</span>';
    html += '<strong>' + calculo.dispositivosExtras + '</strong>';
    html += '</div>';
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:8px">';
    html += '<span style="font-size:12px;color:var(--text2)">Valor por mês:</span>';
    html += '<strong>R$ ' + calculo.valorPorMes.toFixed(2).replace('.', ',') + '</strong>';
    html += '</div>';
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:8px">';
    html += '<span style="font-size:12px;color:var(--text2)">Meses restantes:</span>';
    html += '<strong>' + calculo.mesesRestantes + '</strong>';
    html += '</div>';
    html += '<div style="border-top:1px solid var(--border);padding-top:8px;margin-top:8px;display:flex;justify-content:space-between">';
    html += '<span style="font-size:16px;font-weight:700">Total:</span>';
    html += '<strong style="color:var(--accent);font-size:20px">R$ ' + calculo.valorTotal.toFixed(2).replace('.', ',') + '</strong>';
    html += '</div>';
    html += '</div>';
    
    html += '<div style="font-size:11px;color:var(--text2);text-align:center">';
    html += '💡 Os dispositivos extras ficarão ativos até ' + new Date(assinatura.data_fim).toLocaleDateString('pt-BR');
    html += '</div>';
    html += '</div>';
    
    html += '<button class="btn btn-primary" onclick="processarUpgradeDispositivos(' + novosDispositivos + ', ' + calculo.valorTotal + ')">✅ Confirmar e Pagar</button>';
    html += '<button class="btn btn-outline" onclick="fazerUpgradeDispositivos()">← Voltar</button>';
    
    document.getElementById('modal-body').innerHTML = html;
}

async function processarUpgradeDispositivos(novosDispositivos, valor) {
    if (!currentUser) return;
    
    var assinatura = await getAssinaturaAtiva();
    if (!assinatura) return;
    
    try {
        // PASSO 1: Registrar pagamento no banco como "upgrade"
        console.log('[Upgrade] Registrando pagamento no banco...');
        
        var registroPagamento = await supabaseClient
            .from('pagamentos')
            .insert({
                user_id: currentUser.id,
                plano_id: assinatura.plano_id,
                valor: valor,
                metodo_pagamento: 'mercado_pago',
                status: 'pendente',
                metadata: {
                    tipo: 'upgrade',
                    assinatura_id: assinatura.id,
                    novos_dispositivos: novosDispositivos
                }
            })
            .select()
            .single();
        
        if (registroPagamento.error) {
            console.error('[Upgrade] Erro ao registrar:', registroPagamento.error);
            toast('Erro ao iniciar upgrade', 'error');
            return;
        }
        
        var pagamentoId = registroPagamento.data.id;
        console.log('[Upgrade] Pagamento registrado:', pagamentoId);
        
        // PASSO 2: Chamar Edge Function do MP
        console.log('[Upgrade] Criando preferência...');
        
        var response = await fetch('https://xwwklngrkvdwgiinycvt.supabase.co/functions/v1/criar-pagamento', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3d2tsbmdya3Zkd2dpaW55Y3Z0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NDYwODUsImV4cCI6MjA5NjAyMjA4NX0.XhnNESlgV4Q_kkXRYh4QY2e9RBG-u-qgP9sDHyKfEG4'
            },
            body: JSON.stringify({
                titulo: 'Kayla PRO - Upgrade de Dispositivos',
                valor: valor,
                email: currentUser.email,
                user_id: currentUser.id,
                plano_id: assinatura.plano_id,
                num_dispositivos: novosDispositivos,
                pagamento_id: pagamentoId,
                tipo: 'upgrade',
                assinatura_id: assinatura.id
            })
        });
        
        var preference = await response.json();
        
        if (preference.id && preference.init_point) {
            // Atualizar pagamento com o ID do Mercado Pago
            await supabaseClient
                .from('pagamentos')
                .update({
                    pagamento_gateway_id: preference.id,
                    preference_id: preference.id
                })
                .eq('id', pagamentoId);
            
            console.log('[Upgrade] Redirecionando:', preference.init_point);
            window.location.href = preference.init_point;
        } else {
            console.error('[Upgrade] Erro:', preference);
            
            await supabaseClient
                .from('pagamentos')
                .update({ status: 'cancelado' })
                .eq('id', pagamentoId);
            
            toast('Erro ao criar pagamento', 'error');
        }
        
    } catch(e) {
        console.error('[Upgrade] Erro:', e);
        toast('Erro ao processar upgrade', 'error');
    }
}

async function confirmarUpgradePago(pagamentoId, novosDispositivos) {
    if (!currentUser) return;
    
    var assinatura = await getAssinaturaAtiva();
    if (!assinatura) return;
    
    try {
        await supabaseClient
            .from('assinaturas')
            .update({
                dispositivos_max: novosDispositivos,
                updated_at: new Date().toISOString()
            })
            .eq('id', assinatura.id);
        
        await supabaseClient
            .from('pagamentos')
            .update({
                status: 'aprovado',
                data_pagamento: new Date().toISOString()
            })
            .eq('id', pagamentoId);
        
        localStorage.setItem('kayla_pro_devices', assinatura.dispositivos_usados + '/' + novosDispositivos);
        
        toast('✅ Upgrade realizado! Dispositivos adicionados.', 'success');
        fecharModal();
        atualizarBadgePlano();
        
    } catch(e) {
        console.error('Erro ao confirmar upgrade:', e);
        toast('Erro ao processar', 'error');
    }
}

async function gerenciarDispositivos() {
    if (!currentUser || !supabaseClient) {
        toast('Faça login primeiro', 'error');
        return;
    }
    
    var assinatura = await getAssinaturaAtiva();
    if (!assinatura) {
        toast('Nenhuma assinatura ativa', 'error');
        return;
    }
    
    try {
        var result = await supabaseClient
            .from('dispositivos')
            .select('*')
            .eq('assinatura_id', assinatura.id)
            .order('ultimo_acesso', { ascending: false });
        
        var dispositivos = result.data || [];
        
        var html = '<div class="modal-handle"></div>';
        html += '<div class="modal-title">📱 Dispositivos</div>';
        html += '<div class="modal-sub">' + assinatura.dispositivos_usados + ' de ' + assinatura.dispositivos_max + ' dispositivos em uso</div>';
        
        if (dispositivos.length === 0) {
            html += '<div class="card" style="background:var(--bg3);padding:20px;text-align:center">';
            html += '<div style="font-size:48px;margin-bottom:12px">📱</div>';
            html += '<div style="color:var(--text2)">Nenhum dispositivo registrado</div>';
            html += '</div>';
        } else {
            html += '<div class="item-list">';
            dispositivos.forEach(function(device) {
                var tipoIcon = device.device_type === 'mobile' ? '📱' : (device.device_type === 'tablet' ? '📱' : '💻');
                var ultimoAcesso = new Date(device.ultimo_acesso).toLocaleString('pt-BR');
                
                html += '<div class="item-card" style="margin-bottom:8px">';
                html += '<div class="item-info">';
                html += '<div class="item-name">' + tipoIcon + ' ' + (device.device_name || 'Dispositivo') + '</div>';
                html += '<div class="item-detail">Último acesso: ' + ultimoAcesso + '</div>';
                html += '</div>';
                html += '<button class="btn btn-sm btn-red" onclick="removerDispositivo(\'' + device.id + '\')">🗑️</button>';
                html += '</div>';
            });
            html += '</div>';
        }
        
        if (assinatura.dispositivos_usados < assinatura.dispositivos_max) {
            html += '<button class="btn btn-primary" onclick="fecharModal(); fazerUpgradeDispositivos()">⬆️ Adicionar Dispositivo</button>';
        } else {
            html += '<button class="btn btn-primary" onclick="fecharModal(); fazerUpgradeDispositivos()">⬆️ Fazer Upgrade</button>';
        }
        
        html += '<button class="btn btn-outline" onclick="fecharModal()">Fechar</button>';
        
        document.getElementById('modal-body').innerHTML = html;
        document.getElementById('modal-overlay').classList.add('show');
        
    } catch(e) {
        console.error('Erro ao buscar dispositivos:', e);
        toast('Erro ao carregar dispositivos', 'error');
    }
}

async function removerDispositivo(deviceId) {
    confirmar('Remover Dispositivo', 'Deseja realmente remover este dispositivo? Ele perderá acesso ao plano PRO.', async function(confirmed) {
        if (!confirmed) return;
        
        if (!currentUser || !supabaseClient) return;
        
        try {
            var assinatura = await getAssinaturaAtiva();
            if (!assinatura) return;
            
            await supabaseClient
                .from('dispositivos')
                .delete()
                .eq('id', deviceId);
            
            await supabaseClient
                .from('assinaturas')
                .update({ 
                    dispositivos_usados: Math.max(0, assinatura.dispositivos_usados - 1)
                })
                .eq('id', assinatura.id);
            
            toast('✅ Dispositivo removido', 'success');
            gerenciarDispositivos();
            
        } catch(e) {
            console.error('Erro ao remover dispositivo:', e);
            toast('Erro ao remover', 'error');
        }
    });
}

// Nova função para mostrar QR Code do PIX
function mostrarQRCodePIX(dados, pagamentoId) {
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">📱 Pagamento PIX</div>';
    html += '<div class="modal-sub">Escaneie o QR Code ou copie o código</div>';
    
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px;text-align:center">';
    
    // QR Code
    if (dados.qr_code_base64) {
        html += '<div style="background:#fff;padding:16px;border-radius:8px;margin-bottom:16px;display:inline-block">';
        html += '<img src="' + dados.qr_code_base64 + '" alt="QR Code PIX" style="width:250px;height:250px">';
        html += '</div>';
    }
    
    // Código Copia e Cola
    html += '<div style="margin-bottom:16px">';
    html += '<div style="font-size:12px;color:var(--text2);margin-bottom:8px">Código PIX (Copia e Cola):</div>';
    html += '<textarea id="pix-codigo" readonly style="width:100%;height:80px;padding:8px;border-radius:8px;border:1px solid var(--border);font-size:11px;resize:none;background:var(--bg2)">' + dados.qr_code + '</textarea>';
    html += '</div>';
    
    // Botão Copiar
    html += '<button class="btn btn-primary" onclick="copiarCodigoPIX()" style="width:100%;margin-bottom:8px">📋 Copiar Código PIX</button>';
    
    // Link de pagamento
    if (dados.ticket_url) {
        html += '<a href="' + dados.ticket_url + '" target="_blank" class="btn btn-outline" style="width:100%;display:block;text-align:center;margin-bottom:8px">🔗 Abrir no App do Banco</a>';
    }
    
    html += '</div>';
    
    // Instruções
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
    html += '<div style="font-weight:600;margin-bottom:12px">📋 Como pagar:</div>';
    html += '<ol style="padding-left:20px;font-size:12px;color:var(--text2);margin:0">';
    html += '<li style="margin-bottom:8px">Abra o app do seu banco</li>';
    html += '<li style="margin-bottom:8px">Escolha pagar com PIX</li>';
    html += '<li style="margin-bottom:8px">Escaneie o QR Code ou copie o código</li>';
    html += '<li style="margin-bottom:8px">Confirme o pagamento</li>';
    html += '<li>Aprovação é instantânea!</li>';
    html += '</ol>';
    html += '</div>';
    
    html += '<div style="font-size:11px;color:var(--text2);text-align:center;margin-bottom:12px">';
    html += '⏱️ Este QR Code expira em 24 horas';
    html += '</div>';
    
    html += '<button class="btn btn-outline" onclick="fecharModal()">Fechar</button>';
    
    document.getElementById('modal-body').innerHTML = html;
}

// Função para copiar código PIX
function copiarCodigoPIX() {
    var codigo = document.getElementById('pix-codigo');
    codigo.select();
    codigo.setSelectionRange(0, 99999);
    
    try {
        document.execCommand('copy');
        toast('✅ Código PIX copiado!', 'success');
    } catch(err) {
        navigator.clipboard.writeText(codigo.value).then(function() {
            toast('✅ Código PIX copiado!', 'success');
        }).catch(function() {
            toast('❌ Erro ao copiar. Selecione manualmente.', 'error');
        });
    }
}

console.log('✅ Payments.js carregado');
