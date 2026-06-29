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
            .maybeSingle();
        
        if (result.error) {
            console.warn('[getAssinaturaAtiva] Erro:', result.error);
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
        console.log('[MP] Iniciando pagamento...');
        console.log('[MP] Plano:', planoId);
        console.log('[MP] Valor:', valor);
        console.log('[MP] Método:', metodoPagamento);
        
        var response = await fetch('/app/api/criar-pagamento.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                titulo: 'Kayla PRO - ' + PLANOS[planoId].nome,
                valor: valor,
                email: currentUser.email,
                user_id: currentUser.id,
                plano_id: planoId,
                num_dispositivos: numDispositivos,
                metodo_pagamento: metodoPagamento
            })
        });
        
        console.log('[MP] Status HTTP:', response.status);
        console.log('[MP] Content-Type:', response.headers.get('content-type'));
        
        // ✅ LER A RESPOSTA COMO TEXTO PRIMEIRO
        var responseText = await response.text();
        console.log('[MP] Resposta bruta:', responseText);
        
        // ✅ TENTAR PARSEAR COMO JSON
        try {
            var preference = JSON.parse(responseText);
            
            if (preference.id && preference.init_point) {
                localStorage.setItem('kayla_pending_payment', JSON.stringify({
                    preference_id: preference.id,
                    plano_id: planoId,
                    num_dispositivos: numDispositivos,
                    valor: valor,
                    metodo: metodoPagamento
                }));
                
                console.log('[MP] ✅ Redirecionando para:', preference.init_point);
                window.location.href = preference.init_point;
            } else {
                console.error('[MP] ❌ Erro na resposta:', preference);
                toast('Erro: ' + (preference.message || 'Resposta inválida do servidor'), 'error');
            }
            
        } catch (parseError) {
            console.error('[MP] ❌ Erro ao fazer parse do JSON:', parseError);
            console.error('[MP] ❌ Resposta recebida:', responseText.substring(0, 500));
            toast('Erro no servidor. Verifique o console para detalhes.', 'error');
        }
        
    } catch(error) {
        console.error('[MP] ❌ Erro na requisição:', error);
        toast('Erro de conexão: ' + error.message, 'error');
    }
}

// ============ QR CODE PIX ============

function mostrarQRCodePIX(dados, pagamentoId) {
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">📱 Pagamento PIX</div>';
    html += '<div class="modal-sub">Escaneie o QR Code ou copie o código</div>';
    
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px;text-align:center">';
    
    if (dados.qr_code_base64 && dados.qr_code_base64.length > 100) {
        html += '<div style="background:#fff;padding:16px;border-radius:8px;margin-bottom:16px;display:inline-block">';
        html += '<img src="' + dados.qr_code_base64 + '" alt="QR Code PIX" style="width:250px;height:250px">';
        html += '</div>';
        html += '<div style="font-size:12px;color:var(--success);margin-bottom:16px">✅ QR Code gerado com sucesso!</div>';
    } else {
        html += '<div style="background:var(--bg2);padding:20px;border-radius:8px;margin-bottom:16px">';
        html += '<div style="font-size:48px;margin-bottom:12px">📱</div>';
        html += '<div style="font-size:14px;color:var(--text2);margin-bottom:12px">';
        html += 'O QR Code será gerado no app do seu banco<br>';
        html += 'ou você pode abrir no Mercado Pago';
        html += '</div>';
        html += '</div>';
    }
    
    if (dados.qr_code) {
        html += '<div style="margin-bottom:16px">';
        html += '<div style="font-size:12px;color:var(--text2);margin-bottom:8px">Código PIX (Copia e Cola):</div>';
        html += '<textarea id="pix-codigo" readonly style="width:100%;height:80px;padding:8px;border-radius:8px;border:1px solid var(--border);font-size:11px;resize:none;background:var(--bg2);font-family:monospace;color:#fff">' + dados.qr_code + '</textarea>';
        html += '</div>';
        
        html += '<button class="btn btn-primary" onclick="copiarCodigoPIX()" style="width:100%;margin-bottom:8px">📋 Copiar Código PIX</button>';
    }
    
    if (dados.ticket_url) {
        html += '<a href="' + dados.ticket_url + '" target="_blank" class="btn btn-outline" style="width:100%;display:block;text-align:center;margin-bottom:8px;text-decoration:none;padding:12px">🔗 Abrir QR Code no App do Banco</a>';
    }
    
    if (dados.payment_url || dados.init_point) {
        var url = dados.payment_url || dados.init_point;
        html += '<a href="' + url + '" target="_blank" class="btn btn-outline" style="width:100%;display:block;text-align:center;margin-bottom:8px;text-decoration:none;padding:12px">🌐 Ver no Mercado Pago</a>';
    }
    
    html += '</div>';
    
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

// ============ UPGRADE DE DISPOSITIVOS ============

function calcularUpgradeProporcional(assinaturaAtual, novosDispositivos) {
    var dataFim = new Date(assinaturaAtual.data_fim);
    var mesesRestantes = 1; 
    var dispositivosExtras = novosDispositivos - assinaturaAtual.dispositivos_max;
    
    if (dispositivosExtras <= 0) {
        return {
            dispositivosExtras: 0,
            valorPorMes: 0,
            valorPorDispositivo: 0,
            mesesRestantes: mesesRestantes,
            valorTotal: 0,
            novaDataFim: dataFim.toISOString()
        };
    }
    
    var valorPorMes = 5.00;
    var valorPorDispositivo = 5.00;
    var valorTotal = dispositivosExtras * valorPorMes;
    
    return {
        dispositivosExtras: dispositivosExtras,
        valorPorMes: valorPorMes,
        valorPorDispositivo: valorPorDispositivo,
        mesesRestantes: mesesRestantes,
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
    html += '</div>';
    
    for (var i = assinatura.dispositivos_max + 1; i <= 5; i++) {
        var calculo = calcularUpgradeProporcional(assinatura, i);
        
        html += '<div class="item-card" style="margin-bottom:8px;cursor:pointer" onclick="confirmarUpgradeDispositivos(' + i + ', ' + calculo.valorTotal + ')">';
        html += '<div class="item-info">';
        html += '<div class="item-name">' + i + ' dispositivo' + (i > 1 ? 's' : '') + '</div>';
        html += '<div class="item-detail">+' + (i - assinatura.dispositivos_max) + ' dispositivo(s) extra(s)</div>';
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
    html += '<div class="modal-sub">Escolha a forma de pagamento</div>';
    
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
    html += '<div style="text-align:center;margin-bottom:16px">';
    html += '<div style="font-size:14px;color:var(--text2)">De ' + assinatura.dispositivos_max + ' para ' + novosDispositivos + ' dispositivo(s)</div>';
    html += '<div style="font-size:12px;color:var(--text2);margin-top:8px">Válido até: <strong>' + new Date(assinatura.data_fim).toLocaleDateString('pt-BR') + '</strong></div>';
    html += '</div>';
    
    html += '<div style="background:var(--bg2);padding:12px;border-radius:8px;margin-bottom:12px">';
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:8px">';
    html += '<span style="font-size:12px;color:var(--text2)">Dispositivos extras:</span>';
    html += '<strong>' + calculo.dispositivosExtras + '</strong>';
    html += '</div>';
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:8px">';
    html += '<span style="font-size:12px;color:var(--text2)">Valor por dispositivo:</span>';
    html += '<strong>R$ ' + calculo.valorPorDispositivo.toFixed(2).replace('.', ',') + '</strong>';
    html += '</div>';
    html += '<div style="border-top:1px solid var(--border);padding-top:8px;margin-top:8px;display:flex;justify-content:space-between">';
    html += '<span style="font-size:16px;font-weight:700">Total:</span>';
    html += '<strong style="color:var(--accent);font-size:20px">R$ ' + calculo.valorTotal.toFixed(2).replace('.', ',') + '</strong>';
    html += '</div>';
    html += '</div>';
    
    html += '<div style="font-size:11px;color:var(--text2);text-align:center;margin-bottom:12px">';
    html += '💡 Os dispositivos extras ficarão ativos até ' + new Date(assinatura.data_fim).toLocaleDateString('pt-BR');
    html += '</div>';
    html += '</div>';
    
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
    html += '<div style="font-weight:600;margin-bottom:12px">Escolha a forma de pagamento:</div>';
    
    html += '<div class="item-card" style="margin-bottom:8px;cursor:pointer;border:2px solid var(--success)" onclick="processarUpgradeDispositivos(' + novosDispositivos + ', ' + calculo.valorTotal + ', \'pix\')">';
    html += '<div style="display:flex;align-items:center;gap:12px">';
    html += '<div style="font-size:32px">📱</div>';
    html += '<div style="flex:1">';
    html += '<div style="font-weight:700;font-size:16px">PIX</div>';
    html += '<div style="font-size:12px;color:var(--text2)">Aprovação instantânea</div>';
    html += '</div>';
    html += '<div style="background:var(--success);color:#fff;padding:4px 12px;border-radius:12px;font-size:11px;font-weight:600">RECOMENDADO</div>';
    html += '</div></div>';
    
    html += '<div class="item-card" style="margin-bottom:8px;cursor:pointer" onclick="processarUpgradeDispositivos(' + novosDispositivos + ', ' + calculo.valorTotal + ', \'cartao\')">';
    html += '<div style="display:flex;align-items:center;gap:12px">';
    html += '<div style="font-size:32px">💳</div>';
    html += '<div style="flex:1">';
    html += '<div style="font-weight:700;font-size:16px">Cartão de Crédito</div>';
    html += '<div style="font-size:12px;color:var(--text2)">Parcele em até 12x</div>';
    html += '</div>';
    html += '</div></div>';
    
    html += '</div>';
    
    html += '<button class="btn btn-outline" onclick="fazerUpgradeDispositivos()">← Voltar</button>';
    
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
}

async function processarUpgradeDispositivos(novosDispositivos, valor, metodoPagamento) {
    if (!currentUser) return;
    metodoPagamento = metodoPagamento || 'pix';
    
    var assinatura = await getAssinaturaAtiva();
    if (!assinatura) return;
    
    try {
        // ✅ USAR PHP (como no app de teste)
        var response = await fetch('/app/api/criar-pagamento.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                titulo: 'Kayla PRO - Upgrade de Dispositivos',
                valor: valor,
                email: currentUser.email,
                user_id: currentUser.id,
                plano_id: assinatura.plano_id,
                num_dispositivos: novosDispositivos,
                tipo: 'upgrade',
                assinatura_id: assinatura.id,
                metodo_pagamento: metodoPagamento
            })
        });
        
        var resultado = await response.json();
        console.log('[Upgrade] Resultado:', resultado);
        
        if (resultado.init_point) {
            localStorage.setItem('kayla_pending_payment', JSON.stringify({
                preference_id: resultado.id,
                plano_id: assinatura.plano_id,
                num_dispositivos: novosDispositivos,
                valor: valor,
                metodo: metodoPagamento,
                tipo: 'upgrade'
            }));
            
            console.log('[Upgrade] Redirecionando para:', resultado.init_point);
            window.location.href = resultado.init_point;
        } else {
            console.error('[Upgrade] Erro:', resultado);
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

// ============ GERENCIAR DISPOSITIVOS ============

async function gerenciarDispositivos() {
    var modalBody = document.getElementById('modal-body');
    if (modalBody) modalBody.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text2)">Carregando...</div>';
    
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
            .eq('ativo', true) 
            .order('ultimo_acesso', { ascending: false });
        
        var dispositivos = result.data || [];
        
        var html = '<div class="modal-handle"></div>';
        html += '<div class="modal-title">📱 Dispositivos</div>';
        html += '<div class="modal-sub">' + dispositivos.length + ' de ' + assinatura.dispositivos_max + ' dispositivos em uso</div>';
        
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
                html += '<button class="btn btn-sm btn-red" onclick="removerDispositivo(\'' + device.id + '\', \'' + assinatura.id + '\', this)">🗑️</button>';
                html += '</div>';
            });
            html += '</div>';
        }
        
        if (dispositivos.length < assinatura.dispositivos_max) {
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

async function removerDispositivo(deviceId, assinaturaId, elementoHtml) {
    if (!currentUser || !supabaseClient) {
        toast('Faça login primeiro', 'error');
        return false;
    }
    
    if (!assinaturaId) {
        try {
            var assinatura = await getAssinaturaAtiva();
            if (assinatura) {
                assinaturaId = assinatura.id;
            } else {
                toast('Assinatura não encontrada. Recarregue a página.', 'error');
                return false;
            }
        } catch(e) {
            console.error('[Dispositivo] Erro ao buscar assinatura:', e);
            toast('Erro ao buscar assinatura', 'error');
            return false;
        }
    }
    
    try {
        var { error } = await supabaseClient
            .from('dispositivos')
            .update({ ativo: false }) 
            .eq('id', deviceId)
            .eq('assinatura_id', assinaturaId);
        
        if (error) {
            console.error('[Dispositivo] Erro ao remover:', error);
            toast('Erro ao remover dispositivo: ' + error.message, 'error');
            return false;
        }
        
        var { data: assinatura, error: assError } = await supabaseClient
            .from('assinaturas')
            .select('dispositivos_usados')
            .eq('id', assinaturaId)
            .single();
        
        if (!assError && assinatura) {
            var novosUsados = Math.max(0, assinatura.dispositivos_usados - 1);
            
            await supabaseClient
                .from('assinaturas')
                .update({ 
                    dispositivos_usados: novosUsados,
                    updated_at: new Date().toISOString()
                })
                .eq('id', assinaturaId);
            
            var contadorTexto = document.querySelector('#modal-body .modal-sub');
            if (contadorTexto) {
                var textoAtual = contadorTexto.innerText;
                var match = textoAtual.match(/(\d+)\s+de\s+(\d+)/);
                if (match) {
                    var max = parseInt(match[2]);
                    contadorTexto.innerText = novosUsados + ' de ' + max + ' dispositivos em uso';
                }
            }
        }
        
        console.log('[Dispositivo] ✅ Dispositivo removido com sucesso!');
        
        if (elementoHtml && elementoHtml.parentElement) {
            elementoHtml.style.transition = 'all 0.3s ease';
            elementoHtml.style.opacity = '0';
            elementoHtml.style.transform = 'scale(0.95)';
            
            setTimeout(function() {
                elementoHtml.remove();
                toast('✅ Dispositivo removido!', 'success');
            }, 300);
        } else {
            if (typeof gerenciarDispositivos === 'function') {
                gerenciarDispositivos();
            }
        }
        
        return true;
        
    } catch(e) {
        console.error('[Dispositivo] Erro:', e);
        toast('Erro ao remover dispositivo', 'error');
        return false;
    }
}

// ============ CANCELAMENTO / DOWNGRADE DE DISPOSITIVOS ============

async function cancelarDispositivos(novosDispositivos) {
    if (!currentUser) { toast('Faça login primeiro', 'error'); return; }
    var assinatura = await getAssinaturaAtiva();
    if (!assinatura) { toast('Nenhuma assinatura ativa encontrada', 'error'); return; }
    if (novosDispositivos >= assinatura.dispositivos_max) { toast('Você só pode reduzir o número de dispositivos.', 'warning'); return; }
    
    var dispositivosRemovidos = assinatura.dispositivos_max - novosDispositivos;
    var valorCredito = dispositivosRemovidos * 5; 
    valorCredito = Math.round(valorCredito * 100) / 100;
    
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">📉 Reduzir Dispositivos</div>';
    html += '<div class="modal-sub">Removendo <strong>' + dispositivosRemovidos + '</strong> dispositivo(s) (de ' + assinatura.dispositivos_max + ' para ' + novosDispositivos + ')</div>';
    
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
    html += '<div style="display:flex;justify-content:space-between;padding-top:0px;border-top:0px;align-items:center">';
    html += '<div style="display:flex;flex-direction:column;align-items:flex-start">';
    html += '<span style="font-weight:700;font-size:16px;color:var(--success)">Crédito a receber:</span>';
    html += '<span style="font-size:11px;color:var(--text2);margin-top:4px">* Crédito referente ao mês atual (R$ 5,00 por dispositivo)</span>';
    html += '</div>';
    html += '<strong style="color:var(--success);font-size:20px">R$ ' + valorCredito.toFixed(2).replace('.', ',') + '</strong>';
    html += '</div>';
    html += '</div>';
    
    html += '<button class="btn btn-primary" onclick="confirmarCancelamentoDispositivos(' + novosDispositivos + ', ' + valorCredito + ', \'' + assinatura.id + '\')">✅ Confirmar Redução</button>';
    html += '<button class="btn btn-outline" onclick="fecharModal()">Cancelar</button>';
    document.getElementById('modal-body').innerHTML = html; document.getElementById('modal-overlay').classList.add('show');
}

async function confirmarCancelamentoDispositivos(novosDispositivos, valorCredito, assinaturaId) {
    if (!currentUser || !supabaseClient) { toast('Erro de autenticação', 'error'); return; }
    try {
        await supabaseClient.from('assinaturas').update({ dispositivos_max: novosDispositivos, updated_at: new Date().toISOString() }).eq('id', assinaturaId);
        if (valorCredito > 0) { await supabaseClient.from('creditos').insert({ user_id: currentUser.id, assinatura_id: assinaturaId, valor: valorCredito, tipo: 'cancelamento_dispositivos', data_criacao: new Date().toISOString(), utilizado: false }); }
        var devices = localStorage.getItem('kayla_pro_devices') || '0/0'; var usado = devices.split('/')[0] || '0';
        localStorage.setItem('kayla_pro_devices', usado + '/' + novosDispositivos);
        fecharModal(); if (typeof mudarAba === 'function') mudarAba('settings');
        toast('✅ Redução concluída!', 'success');
    } catch(e) { toast('Erro de conexão', 'error'); }
}

function iniciarCancelamentoDispositivos() {
    if (!currentUser) { toast('Faça login primeiro', 'error'); return; }
    getAssinaturaAtiva().then(function(assinatura) {
        if (!assinatura || assinatura.dispositivos_max <= 1) { toast('Você já está no mínimo de 1 dispositivo.', 'warning'); return; }
        
        var html = '<div class="modal-handle"></div><div class="modal-title">📉 Reduzir Dispositivos</div><div class="modal-sub">Atual: ' + assinatura.dispositivos_max + ' dispositivo(s)</div><div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
        for (var i = 1; i < assinatura.dispositivos_max; i++) {
            var qtdRemovida = assinatura.dispositivos_max - i;
            var economizando = qtdRemovida * 5;
            html += '<div class="item-card" style="margin-bottom:8px;cursor:pointer;border:1px solid var(--border)" onclick="cancelarDispositivos(' + i + ')">';
            html += '<div class="item-info"><div class="item-name">' + i + ' dispositivo(s)</div>';
            html += '<div class="item-detail">Remover <strong>' + qtdRemovida + '</strong> dispositivo(s) • Economia de R$ ' + economizando.toFixed(2).replace('.', ',') + '/mês</div></div>';
            html += '<div style="font-weight:700;color:var(--accent)">Selecionar →</div></div>';
        }
        html += '</div><button class="btn btn-outline" onclick="fecharModal()">Cancelar</button>';
        document.getElementById('modal-body').innerHTML = html; document.getElementById('modal-overlay').classList.add('show');
    });
}

// ============ RENOVAÇÃO INTELIGENTE DE ASSINATURA ============

function iniciarRenovacao() {
    if (!currentUser) { toast('Faça login primeiro', 'error'); return; }
    getAssinaturaAtiva().then(async function(assinatura) {
        if (!assinatura) { toast('Nenhuma assinatura ativa para renovar', 'error'); return; }
        if (Math.ceil((new Date(assinatura.data_fim) - new Date()) / (1000 * 60 * 60 * 24)) > 15) { toast('⚠️ Renove apenas quando faltar menos de 15 dias.', 'warning'); return; }
        
        var { data: creditos } = await supabaseClient
            .from('creditos')
            .select('valor')
            .eq('user_id', currentUser.id)
            .eq('utilizado', false);
        var saldoCredito = 0;
        if (creditos && creditos.length > 0) {
            creditos.forEach(function(cred) { saldoCredito += cred.valor; });
        }

        var html = '<div class="modal-handle"></div><div class="modal-title">🔄 Renovar Assinatura</div><div class="modal-sub">Atual: ' + assinatura.dispositivos_max + ' dispositivo(s)</div>';
        html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px"><div style="font-size:13px;color:var(--text2);margin-bottom:12px;text-align:center">Escolha quantos dispositivos deseja renovar:</div>';
        
        for (var i = 1; i <= 5; i++) {
            var precoFinal = 19.90 + ((i - 1) * 5);
            var precoComDesconto = Math.max(0, precoFinal - saldoCredito);
            var destaque = i === assinatura.dispositivos_max ? 'border:2px solid var(--accent);' : '';
            
            html += '<div class="item-card" style="margin-bottom:8px;cursor:pointer;' + destaque + '" onclick="confirmarRenovacao(' + i + ', ' + precoComDesconto + ')">';
            html += '<div class="item-info"><div class="item-name">' + i + ' dispositivo(s)</div>';
            if (saldoCredito > 0) {
                html += '<div class="item-detail" style="color:var(--success)">💰 Desconto de R$ ' + saldoCredito.toFixed(2).replace('.', ',') + ' aplicado!</div>';
            }
            html += '</div><div style="font-weight:700;color:var(--accent);font-size:16px">R$ ' + precoComDesconto.toFixed(2).replace('.', ',') + '</div></div>';
        }
        html += '</div><button class="btn btn-outline" onclick="fecharModal()">Cancelar</button>';
        document.getElementById('modal-body').innerHTML = html; document.getElementById('modal-overlay').classList.add('show');
    });
}

async function confirmarRenovacao(novosDispositivos, valorPagar) {
    if (!currentUser || !supabaseClient) { toast('Erro de autenticação', 'error'); return; }
    try {
        var assinatura = await getAssinaturaAtiva();
        if (!assinatura) { toast('Assinatura não encontrada', 'error'); return; }
        
        await supabaseClient
            .from('creditos')
            .update({ utilizado: true })
            .eq('user_id', currentUser.id)
            .eq('utilizado', false);

        var novaDataFim = new Date(); novaDataFim.setDate(novaDataFim.getDate() + 30);
        await supabaseClient.from('assinaturas').update({ 
            data_fim: novaDataFim.toISOString(), 
            dispositivos_max: novosDispositivos, 
            updated_at: new Date().toISOString() 
        }).eq('id', assinatura.id);
        
        localStorage.setItem('kayla_pro_expires', novaDataFim.toISOString());
        localStorage.setItem('kayla_pro_devices', Math.min(assinatura.dispositivos_usados, novosDispositivos) + '/' + novosDispositivos);
        fecharModal(); if (typeof mudarAba === 'function') mudarAba('settings');
        toast('✅ Assinatura renovada com sucesso!', 'success');
    } catch(e) { toast('Erro ao renovar', 'error'); }
}

// ============ MOSTRAR INFORMAÇÕES DA ASSINATURA ============

async function mostrarInfoAssinatura() {
    if (!currentUser || !supabaseClient) {
        toast('Faça login primeiro', 'error');
        return;
    }
    
    var result = await supabaseClient
        .from('assinaturas')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('status', 'ativa')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
    
    if (result.error || !result.data) {
        if (localStorage.getItem('kayla_pro')) {
            localStorage.removeItem('kayla_pro');
            localStorage.removeItem('kayla_pro_key');
            localStorage.removeItem('kayla_pro_expires');
            localStorage.removeItem('kayla_pro_devices');
            LIMITES.proAtivo = false;
        }
        var html = '<div class="modal-handle"></div>';
        html += '<div class="modal-title">📋 Minha Assinatura</div>';
        html += '<div class="card" style="background:var(--bg3);padding:20px;text-align:center;margin-bottom:16px">';
        html += '<div style="font-size:48px;margin-bottom:12px">🆓</div>';
        html += '<div style="font-size:16px;font-weight:700;margin-bottom:8px">Plano Gratuito</div>';
        html += '<div style="font-size:13px;color:var(--text2);margin-bottom:16px">';
        html += 'Você está usando o plano gratuito com limitações.';
        html += '</div>';
        html += '</div>';
        html += '<button class="btn btn-primary" onclick="fecharModal(); mostrarPlanos()">🚀 Assinar PRO</button>';
        html += '<button class="btn btn-outline" onclick="fecharModal()">Fechar</button>';
        document.getElementById('modal-body').innerHTML = html;
        document.getElementById('modal-overlay').classList.add('show');
        return;
    }
    
    var assinatura = result.data;
    var dataFim = new Date(assinatura.data_fim).toLocaleDateString('pt-BR');
    var diasRestantes = Math.floor((new Date(assinatura.data_fim) - new Date()) / (1000 * 60 * 60 * 24));

    var saldoCredito = 0;
    try {
        var { data: creditos, error: credError } = await supabaseClient
            .from('creditos')
            .select('valor')
            .eq('user_id', currentUser.id)
            .eq('utilizado', false);
        if (!credError && creditos && creditos.length > 0) {
            creditos.forEach(function(cred) { saldoCredito += cred.valor; });
        }
    } catch(e) { console.warn('Erro ao buscar créditos:', e); }
    
    localStorage.setItem('kayla_pro', 'true');
    localStorage.setItem('kayla_pro_key', assinatura.key_ativacao || '');
    localStorage.setItem('kayla_pro_expires', assinatura.data_fim || '');
    localStorage.setItem('kayla_pro_devices', assinatura.dispositivos_usados + '/' + assinatura.dispositivos_max);
    LIMITES.proAtivo = true;
    atualizarBadgePlano();
    
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">📋 Minha Assinatura</div>';

    if (saldoCredito > 0) {
        html += '<div style="background:#15803d;color:#fff;padding:12px;border-radius:8px;text-align:center;margin-bottom:12px;font-size:13px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px">';
        html += '💰 Você tem <strong>R$ ' + saldoCredito.toFixed(2).replace('.', ',') + '</strong> em crédito disponível para sua próxima renovação!';
        html += '</div>';
    }
    
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:12px">';
    html += '<span style="color:var(--text2)">Status:</span>';
    html += '<span class="badge-pro">ATIVA</span>';
    html += '</div>';
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:12px">';
    html += '<span style="color:var(--text2)">Key:</span>';
    html += '<strong style="font-family:monospace;font-size:12px">' + (assinatura.key_ativacao || 'N/A') + '</strong>';
    html += '</div>';
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:12px">';
    html += '<span style="color:var(--text2)">Dispositivos:</span>';
    html += '<strong>' + assinatura.dispositivos_usados + '/' + assinatura.dispositivos_max + '</strong>';
    html += '</div>';
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:12px">';
    html += '<span style="color:var(--text2)">Validade:</span>';
    html += '<strong>' + dataFim + '</strong>';
    html += '</div>';
    html += '<div style="display:flex;justify-content:space-between">';
    html += '<span style="color:var(--text2)">Dias restantes:</span>';
    html += '<strong style="color:' + (diasRestantes <= 7 ? 'var(--warning)' : 'var(--success)') + '">' + diasRestantes + ' dias</strong>';
    html += '</div>';
    html += '</div>';
    
    html += '<button class="btn btn-outline" onclick="fecharModal()" style="width:100%">Fechar</button>';
    
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
}

// ============ VERIFICAÇÃO DE RETORNO DE PAGAMENTO ============

function verificarRetornoPagamento() {
    var urlParams = new URLSearchParams(window.location.search);
    var collectionStatus = urlParams.get('collection_status');
    var paymentId = urlParams.get('payment_id');
    var preferenceId = urlParams.get('preference_id');
    
    if (collectionStatus === 'approved' || paymentId || preferenceId) {
        toast('✅ Pagamento detectado! Verificando status...', 'success');
        setTimeout(async function() {
            if (typeof verificarStatusPro === 'function') {
                var ativo = await verificarStatusPro();
                if (ativo) {
                    toast('🎉 Plano PRO ativado com sucesso!', 'success');
                    if (typeof mudarAba === 'function') mudarAba('settings');
                }
            }
        }, 3000);
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

if (typeof window !== 'undefined') {
    verificarRetornoPagamento();
    window.addEventListener('DOMContentLoaded', function() {
        setTimeout(verificarRetornoPagamento, 500);
    });
}

console.log('✅ Payments.js carregado (Versão completa com PHP funcionando)');
