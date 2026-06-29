
// Configurações do Mercado Pago
window.MP_CONFIG = {
    publicKey: 'TEST-0c124e93-bb15-4e38-a96e-ea85a45523db',
    accessToken: 'TEST-7869129183763307-061321-c06646dcbfe57f8f3183d3b60c97a6cf-3471016369',
    webhooksUrl: 'https://xwwklngrkvdwgiinycvt.supabase.co/functions/v1/webhook-mp'
};

// Configurações de planos
window.PLANOS = {
    mensal: { id: 'mensal', nome: 'Plano Mensal', precoBase: 19.90, precoPorDevice: 5.00, dispositivosInclusos: 1, dispositivosMax: 5, duracaoDias: 30, tipo: 'mensal' },
    anual: { id: 'anual', nome: 'Plano Anual', precoBase: 199.90, precoPorDevice: 50.00, dispositivosInclusos: 1, dispositivosMax: 5, duracaoDias: 365, tipo: 'anual' }
};

async function validarKeyBackend(keyCode) {
    try {
        var response = await fetch(SUPABASE_EDGE_URL + '/validate-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SUPABASE_KEY },
            body: JSON.stringify({ key_code: keyCode, device_id: getDeviceId(), device_name: getDeviceName() })
        });
        return await response.json();
    } catch (error) { return { valid: false, message: 'Erro de conexão' }; }
}

async function ativarPro() {
    var chave = document.getElementById('pro-key').value.trim().toUpperCase();
    if (!chave) { toast('Digite a chave', 'error'); return; }
    
    var btn = window.event ? window.event.target : null;
    if (btn) { btn.innerText = 'Validando...'; btn.disabled = true; }
    
    var resultado = await validarKeyBackend(chave);
    
    if (resultado.valid) {
        LIMITES.proAtivo = true;
        localStorage.setItem('kayla_pro', 'true');
        localStorage.setItem('kayla_pro_key', chave);
        localStorage.setItem('kayla_pro_expires', resultado.expires_at || '');
        localStorage.setItem('kayla_pro_devices', resultado.devices_used + '/' + resultado.max_devices);
        toast('✅ Plano PRO ativado!', 'success');
        fecharModal();
        atualizarBadgePlano();
        if (typeof mudarAba === 'function') mudarAba('settings');
    } else {
        toast('❌ ' + (resultado.message || 'Chave inválida'), 'error');
    }
    if (btn) { btn.innerText = 'Ativar Agora'; btn.disabled = false; }
}

async function getAssinaturaAtiva() {
    if (!currentUser || !supabaseClient) return null;
    try {
        var result = await supabaseClient.from('assinaturas').select('*').eq('user_id', currentUser.id).eq('status', 'ativa').order('created_at', { ascending: false }).limit(1).maybeSingle();
        return result.data;
    } catch(e) { return null; }
}

// ============ NOVO MODAL DE PLANOS (MODERNO) ============
function mostrarPlanos() {
    var html = \`
        <div class="modal-handle"></div>
        <div class="modal-title">🚀 Escolha seu Plano</div>
        <p style="text-align:center; color:var(--text2); font-size:13px; margin-bottom:20px;">Selecione o plano ideal para você</p>

        <!-- PLANO MENSAL -->
        <div class="card" style="background:var(--bg3); padding:20px; border-radius:16px; margin-bottom:16px; cursor:pointer; border:2px solid var(--accent); position:relative;" onclick="selecionarPlano('mensal')">
            <div style="position:absolute; top:12px; right:12px; background:var(--accent); color:#fff; font-size:9px; padding:2px 8px; border-radius:4px; font-weight:700;">POPULAR</div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                <span style="font-size:20px;">📅</span>
                <strong style="font-size:18px;">Mensal</strong>
            </div>
            <div style="margin-bottom:4px;">
                <span style="font-size:32px; font-weight:800; color:var(--accent);">R$ 19,90</span>
                <span style="color:var(--text2); font-size:14px;">/mês</span>
            </div>
            <div style="font-size:12px; color:var(--text2); margin-bottom:16px;">Cancele quando quiser</div>
            <ul style="list-style:none; padding:0; margin:0; font-size:13px; color:var(--text);">
                <li style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">✅ 1 dispositivo incluso</li>
                <li style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">✅ Clientes ilimitados</li>
                <li style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">✅ Produtos ilimitados</li>
                <li style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">✅ Geração de PDF</li>
                <li style="display:flex; align-items:center; gap:8px;">✅ Suporte prioritário</li>
            </ul>
        </div>

        <!-- PLANO ANUAL -->
        <div class="card" style="background:linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%); padding:20px; border-radius:16px; margin-bottom:16px; cursor:pointer; color:#fff; position:relative;" onclick="selecionarPlano('anual')">
            <div style="position:absolute; top:-10px; right:12px; background:#00c853; color:#fff; font-size:10px; padding:4px 10px; border-radius:20px; font-weight:800; border:2px solid var(--bg2);">ECONOMIA 17%</div>
            <div style="position:absolute; top:20px; right:12px; background:rgba(255,255,255,0.2); color:#fff; font-size:9px; padding:2px 8px; border-radius:4px; font-weight:700;">MELHOR VALOR</div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                <span style="font-size:20px;">🎯</span>
                <strong style="font-size:18px;">Anual</strong>
            </div>
            <div style="margin-bottom:4px;">
                <span style="font-size:32px; font-weight:800;">R$ 199,90</span>
                <span style="font-size:14px; opacity:0.8;">/ano</span>
            </div>
            <div style="font-size:12px; opacity:0.9; margin-bottom:16px;">2 meses grátis!</div>
            <ul style="list-style:none; padding:0; margin:0; font-size:13px;">
                <li style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">✅ Tudo do plano mensal</li>
                <li style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">✅ Economia de R$ 38,90</li>
                <li style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">✅ Suporte VIP</li>
                <li style="display:flex; align-items:center; gap:8px;">✅ Recursos exclusivos</li>
            </ul>
        </div>

        <!-- INFO DISPOSITIVOS -->
        <div style="background:rgba(255,255,255,0.03); padding:12px; border-radius:12px; text-align:center; margin-bottom:20px; border:1px solid var(--border);">
            <div style="font-size:12px; color:var(--text2); margin-bottom:4px;">💡 <strong>Dispositivos adicionais:</strong> R$ 5,00/mês cada</div>
            <div style="font-size:11px; color:var(--text3);">Máximo de 5 dispositivos por conta</div>
        </div>

        <button class="btn btn-outline" onclick="fecharModal()" style="width:100%; padding:14px; font-weight:700;">Cancelar</button>
    \`;
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
}

window.confirmarPlanoHandler = function(planoId, numDispositivos) { confirmarPlano(planoId, numDispositivos); };

function selecionarPlano(planoId) {
    var plano = PLANOS[planoId];
    var isAnual = planoId === 'anual';
    var html = '<div class="modal-handle"></div><div class="modal-title">📱 Dispositivos</div>';
    html += '<p style="text-align:center; color:var(--text2); font-size:13px; margin-bottom:20px;">Quantos dispositivos deseja usar?</p>';
    
    html += '<div style="background:var(--bg3); padding:16px; border-radius:16px; border:1px solid var(--border);">';
    html += '<p style="font-size:12px; color:var(--text2); text-align:center; margin-bottom:15px;">Selecione o número de dispositivos que terão acesso ao plano PRO</p>';

    for (var i = 1; i <= 5; i++) {
        var precoExtra = Math.max(0, i - 1) * (isAnual ? 50 : 5);
        var precoFinal = plano.precoBase + precoExtra;
        var textoExtra = '';
        
        if (i === 1) {
            textoExtra = 'Incluso no plano';
        } else {
            var valorMesExtra = (i - 1) * 5;
            textoExtra = \`+R$ \${valorMesExtra.toFixed(2)}/mês extra\`;
        }

        var borderStyle = i === 1 ? 'border:2px solid var(--accent); background:rgba(124, 92, 242, 0.05);' : 'border:1px solid transparent;';
        
        html += \`
            <div class="item-card" style="margin-bottom:8px; cursor:pointer; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; border-radius:12px; \${borderStyle}" onclick="window.confirmarPlanoHandler('\${planoId}', \${i})">
                <div class="item-info">
                    <div class="item-name" style="font-size:15px; font-weight:700;">\${i} \${i === 1 ? 'dispositivo' : 'dispositivos'}</div>
                    <div style="font-size:11px; color:var(--text3); color:var(--text3);">\${textoExtra}</div>
                </div>
                <div style="font-weight:800; color:var(--accent); font-size:16px;">R$ \${precoFinal.toFixed(2).replace('.', ',')}</div>
            </div>
        \`;
    }
    html += '</div>';
    html += '<button class="btn btn-outline" onclick="mostrarPlanos()" style="width:100%; margin-top:15px; padding:14px; font-weight:700;">← Voltar</button>';
    document.getElementById('modal-body').innerHTML = html;
}

function confirmarPlano(planoId, numDispositivos) {
    var plano = PLANOS[planoId];
    var isAnual = planoId === 'anual';
    var precoExtra = Math.max(0, numDispositivos - 1) * (isAnual ? 50 : 5);
    var valor = plano.precoBase + precoExtra;
    
    var html = '<div class="modal-handle"></div><div class="modal-title">💳 Pagamento</div>';
    html += '<div class="card" style="background:var(--bg3);padding:24px;margin-bottom:16px;text-align:center;border-radius:16px;border:1px solid var(--border)">';
    html += '<div style="font-size:14px;color:var(--text2);margin-bottom:8px">Total a pagar (' + plano.nome + ')</div>';
    html += '<div style="font-size:32px;font-weight:800;color:var(--accent)">R$ ' + valor.toFixed(2).replace('.', ',') + '</div>';
    html += '<div style="font-size:12px;color:var(--text3);margin-top:8px">' + numDispositivos + ' dispositivo(s) configurado(s)</div>';
    html += '</div>';
    html += '<button class="btn btn-primary" onclick="pagarComMercadoPago(\'' + planoId + '\', ' + numDispositivos + ', ' + valor + ', \'pix\')" style="width:100%; padding:16px; font-weight:700; border-radius:12px;">Pagar com PIX</button>';
    html += '<button class="btn btn-outline" onclick="selecionarPlano(\'' + planoId + '\')" style="margin-top:12px;width:100%; padding:14px; border-radius:12px;">Voltar</button>';
    document.getElementById('modal-body').innerHTML = html;
}

async function pagarComMercadoPago(planoId, numDispositivos, valor, metodoPagamento) {
    if (!currentUser) {
        toast('Faça login primeiro', 'error');
        return;
    }
    toast('Processando...', 'warning');
    try {
        console.log('[MP] Criando pagamento...', {
            titulo: 'Kayla PRO - ' + PLANOS[planoId].nome,
            valor: valor,
            email: currentUser.email,
            user_id: currentUser.id,
            plano_id: planoId
        });
        var response = await fetch('app/api/criar-pagamento.php', {
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
                num_dispositivos: numDispositivos
            })
        });
        var preference = await response.json();
        console.log('[MP] Resposta:', preference);
        if (preference.id && preference.init_point) {
            localStorage.setItem('kayla_pending_payment', JSON.stringify({
                preference_id: preference.id,
                plano_id: planoId,
                num_dispositivos: numDispositivos,
                valor: valor
            }));
            console.log('[MP] Redirecionando:', preference.init_point);
            window.location.href = preference.init_point;
        } else {
            console.error('[MP] Erro:', preference);
            toast('Erro: ' + (preference.message || 'Tente novamente'), 'error');
        }
    } catch(error) {
        console.error('[MP] Erro:', error);
        toast('Erro de conexão: ' + error.message, 'error');
    }
}

async function gerenciarDispositivos() {
    var modalBody = document.getElementById('modal-body');
    if (modalBody) modalBody.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text2)">Carregando...</div>';
    document.getElementById('modal-overlay').classList.add('show');
    
    try {
        if (typeof gerarHtmlListaDispositivos !== 'undefined') {
            modalBody.innerHTML = await gerarHtmlListaDispositivos();
        } else {
            toast('Erro ao carregar gerenciador.', 'error');
        }
    } catch(e) { toast('Erro ao carregar dispositivos', 'error'); }
}

async function mostrarInfoAssinatura() {
    var assinatura = await getAssinaturaAtiva();
    if (!assinatura) {
        var html = '<div class="modal-handle"></div><div class="modal-title">📋 Minha Assinatura</div>';
        html += '<div class="card" style="background:var(--bg3);padding:20px;text-align:center;margin-bottom:16px">Plano Gratuito</div>';
        html += '<button class="btn btn-primary" onclick="fecharModal(); mostrarPlanos()">🚀 Assinar PRO</button>';
        document.getElementById('modal-body').innerHTML = html;
        document.getElementById('modal-overlay').classList.add('show');
        return;
    }
    
    var dataFim = new Date(assinatura.data_fim).toLocaleDateString('pt-BR');
    var html = '<div class="modal-handle"></div><div class="modal-title">📋 Minha Assinatura</div>';
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
    html += '<div>Status: <span class="badge-pro">ATIVA</span></div>';
    html += '<div>Key: <strong>' + (assinatura.key_ativacao || 'N/A') + '</strong></div>';
    html += '<div>Dispositivos: <strong>' + assinatura.dispositivos_usados + '/' + assinatura.dispositivos_max + '</strong></div>';
    html += '<div>Validade: <strong>' + dataFim + '</strong></div>';
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

function fazerUpgradeDispositivos() { mostrarPlanos(); }
function iniciarCancelamentoDispositivos() { toast('Contate o suporte para cancelar.', 'info'); }
function iniciarRenovacao() { mostrarPlanos(); }

window.mostrarPlanos = mostrarPlanos;
window.selecionarPlano = selecionarPlano;
window.confirmarPlano = confirmarPlano;
window.pagarComMercadoPago = pagarComMercadoPago;
window.gerenciarDispositivos = gerenciarDispositivos;
window.mostrarInfoAssinatura = mostrarInfoAssinatura;
window.fazerUpgradeDispositivos = fazerUpgradeDispositivos;
window.ativarPro = ativarPro;

console.log('✅ Payments.js restaurado com sistema de pagamento do Mercado Pago');
// Restaurado por Manus (AI) em 2026-06-29
