// ============ CONFIGURAÇÕES GLOBAIS ============

// Supabase
var SUPABASE_URL = 'https://xwwklngrkvdwgiinycvt.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3d2tsbmdya3Zkd2dpaW55Y3Z0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NDYwODUsImV4cCI6MjA5NjAyMjA4NX0.XhnNESlgV4Q_kkXRYh4QY2e9RBG-u-qgP9sDHyKfEG4';

// Edge Functions
var SUPABASE_EDGE_URL = 'https://xwwklngrkvdwgiinycvt.supabase.co/functions/v1';

// Versão do App
var appVersion = '5.4.1';

// Configurações do App
var APP_CONFIG = {
    nome: 'Kayla',
    descricao: 'Sistema de Venda Consignada',
    cor: '#7c5cfc',
    suporte: 'https://wa.me/5541996427444'
};

// Variáveis globais
var currentUser = null;
var supabaseClient = null;
var clientes = [];
var produtos = [];
var vendas = [];
var pedidos = [];
var configEmpresa = {};

// Inicializar Supabase Client
function inicializarSupabase() {
    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('[Config] Supabase inicializado');
        return true;
    } else {
        console.error('[Config] Supabase não carregado');
        return false;
    }
}

// Inicializar ao carregar
if (typeof window !== 'undefined') {
    window.addEventListener('load', function() {
        setTimeout(function() {
            inicializarSupabase();
        }, 100);
    });
}

// ====================================================================
// 🆕 FUNÇÕES DE GERENCIAMENTO DE DISPOSITIVOS
// ====================================================================

async function listarDispositivosAtivos() {
    if (!currentUser) return [];
    try {
        var result = await supabaseClient.from('assinaturas').select('id').eq('user_id', currentUser.id).eq('status', 'ativa').limit(1).maybeSingle();
        if (result.error || !result.data) return [];
        var assinaturaId = result.data.id;
        var { data } = await supabaseClient.from('dispositivos').select('id, device_id, device_name, device_type, ultimo_acesso, user_agent').eq('assinatura_id', assinaturaId).eq('ativo', true).order('ultimo_acesso', { ascending: false });
        return data || [];
    } catch(e) { return []; }
}

async function desativarDispositivo(deviceId) {
    if (!currentUser) { toast('Usuário não logado.', 'error'); return false; }
    try {
        await supabaseClient.from('dispositivos').update({ ativo: false }).eq('id', deviceId);
        toast('✅ Dispositivo removido com sucesso!', 'success');
        if (typeof verificarStatusPro === 'function') await verificarStatusPro();
        var modalBody = document.getElementById('modal-body');
        if (modalBody) modalBody.innerHTML = await gerarHtmlListaDispositivos();
        if (typeof atualizarBadgePlano === 'function') atualizarBadgePlano();
        return true;
    } catch(e) { return false; }
}

async function ativarDispositivoAtual() {
    if (!currentUser) { toast('Usuário não logado.', 'error'); return false; }
    try {
        if (typeof registrarDispositivoAtual === 'function') {
            var resultado = await registrarDispositivoAtual();
            if (resultado === true) {
                if (typeof verificarStatusPro === 'function') await verificarStatusPro();
                var modalBody = document.getElementById('modal-body');
                if (modalBody) modalBody.innerHTML = await gerarHtmlListaDispositivos();
                if (typeof atualizarBadgePlano === 'function') atualizarBadgePlano();
                toast('✅ Dispositivo ativado com sucesso!', 'success');
                return true;
            }
        }
        toast('❌ Limite atingido. Remova um dispositivo primeiro.', 'error');
        return false;
    } catch(e) { return false; }
}

async function gerarHtmlListaDispositivos() {
    var dispositivos = await listarDispositivosAtivos();
    var assinatura = await getAssinaturaAtiva();
    
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">📱 Dispositivos</div>';

    if (!assinatura) {
        html += '<div style="text-align:center; padding:20px; color:var(--text2);">Nenhuma assinatura PRO ativa encontrada.</div>';
        html += '<button class="btn btn-outline" onclick="fecharModal()" style="margin-top:12px; width:100%">Fechar</button>';
        return html;
    }

    var maxDevices = assinatura.dispositivos_max;
    var currentDeviceId = getDeviceId();
    var isCurrentDeviceActive = dispositivos.some(function(d) { return d.device_id === currentDeviceId; });

    html += '<div style="text-align:center; margin-bottom:15px; font-weight:600; color:var(--accent);">' + dispositivos.length + ' de ' + maxDevices + ' dispositivos em uso</div>';

    if (dispositivos.length === 0) {
        html += '<div style="text-align:center; padding:20px; color:var(--text2);">Nenhum dispositivo ativo encontrado.</div>';
    } else {
        html += '<div class="item-list">';
        for (var i = 0; i < dispositivos.length; i++) {
            var d = dispositivos[i];
            var isMe = d.device_id === currentDeviceId;
            var dataAcesso = new Date(d.ultimo_acesso).toLocaleString('pt-BR');
            var borderStyle = isMe ? 'border:2px solid var(--success); background:rgba(34, 197, 94, 0.1);' : 'border:1px solid var(--border-color);';
            
            html += `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-radius:8px; margin-bottom:8px; ${borderStyle}">
                    <div style="flex:1">
                        <div style="display:flex; align-items:center; gap:8px">
                            <strong>${d.device_name || 'Dispositivo'}</strong>
                            ${isMe ? '<span style="background:var(--success); color:#fff; font-size:10px; padding:2px 6px; border-radius:4px; font-weight:700">ESTE DISPOSITIVO</span>' : ''}
                        </div>
                        <small style="color:var(--text2);">${d.device_type === 'mobile' ? '📱' : '💻'} ${d.device_type || 'desktop'} • Acesso: ${dataAcesso}</small>
                    </div>
                    <button class="btn btn-outline btn-sm" style="padding:4px 12px; font-size:12px; margin-left:8px" onclick="desativarDispositivo('${d.id}')">
                        Remover
                    </button>
                </div>
            `;
        }
        html += '</div>';
    }

    if (!isCurrentDeviceActive) {
        html += `
            <div style="margin-top:20px; padding:20px; text-align:center; background:var(--bg3); border-radius:8px; border:1px dashed var(--warning);">
                <p style="margin-bottom:12px; color:var(--text2); font-size:14px;">
                    <strong>Este dispositivo não está ativado.</strong><br>
                    Deseja ativá-lo agora usando uma vaga disponível?
                </p>
                <button class="btn btn-primary" onclick="ativarDispositivoAtual()" style="width:100%;">
                    📱 Ativar este dispositivo
                </button>
            </div>
        `;
    }

    html += '<button class="btn btn-outline" onclick="fecharModal()" style="margin-top:12px; width:100%">Fechar</button>';
    return html;
}

console.log('[Config] Kayla v' + appVersion + ' - Configurações carregadas');
