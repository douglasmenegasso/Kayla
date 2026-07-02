// ============ CONFIGURAÇÕES GLOBAIS ============

// Supabase
var SUPABASE_URL = 'https://xwwklngrkvdwgiinycvt.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3d2tsbmdya3Zkd2dpaW55Y3Z0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NDYwODUsImV4cCI6MjA5NjAyMjA4NX0.XhnNESlgV4Q_kkXRYh4QY2e9RBG-u-qgP9sDHyKfEG4';

// Edge Functions
var SUPABASE_EDGE_URL = 'https://xwwklngrkvdwgiinycvt.supabase.co/functions/v1';

// Versão do App
var appVersion = '5.4.2';

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
var isOnline = navigator.onLine;

// Inicializar Supabase Client
function inicializarSupabase() {
    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('[Config] Supabase inicializado');
        
        // Inicializar sessão após Supabase estar pronto
        if (typeof verificarSessao === 'function') {
            verificarSessao();
        }
        return true;
    }
    return false;
}

// Inicializar ao carregar
if (typeof window !== 'undefined') {
    window.addEventListener('load', function() {
        // Garantir que isOnline esteja correto no boot
        if (typeof verificarConexao === 'function') {
            verificarConexao();
        }
        setTimeout(inicializarSupabase, 100);
    });
    
    // Listeners de conexão
    window.addEventListener('online', function() { if (typeof verificarConexao === 'function') verificarConexao(); });
    window.addEventListener('offline', function() { if (typeof verificarConexao === 'function') verificarConexao(); });
}

// ====================================================================
// 🆕 FUNÇÕES DE GERENCIAMENTO DE DISPOSITIVOS
// ====================================================================

async function listarDispositivosAtivos() {
    if (!currentUser) return [];
    try {
        var result = await supabaseClient.from('assinaturas').select('id').eq('user_id', currentUser.id).eq('status', 'ativa').limit(1).maybeSingle();
        if (result.error || !result.data) return [];
        var { data } = await supabaseClient.from('dispositivos').select('*').eq('assinatura_id', result.data.id).eq('ativo', true).order('ultimo_acesso', { ascending: false });
        return data || [];
    } catch(e) { return []; }
}

async function desativarDispositivo(deviceId) {
    if (!currentUser) return false;
    try {
        await supabaseClient.from('dispositivos').update({ ativo: false }).eq('id', deviceId);
        toast('✅ Dispositivo removido!', 'success');
        
        // Sincronizar contador de dispositivos no banco após desativação
        try {
            var assinatura = await getAssinaturaAtiva();
            if (assinatura) {
                var { count: cntAtivos } = await supabaseClient.from('dispositivos').select('id', { count: 'exact', head: true }).eq('assinatura_id', assinatura.id).eq('ativo', true);
                var qtdAtivos = cntAtivos || 0;
                if (assinatura.dispositivos_usados !== qtdAtivos) {
                    await supabaseClient.from('assinaturas').update({ dispositivos_usados: qtdAtivos }).eq('id', assinatura.id);
                }
                localStorage.setItem('kayla_pro_devices', qtdAtivos + '/' + assinatura.dispositivos_max);
            }
        } catch(e2) { console.warn('Erro ao sincronizar contador:', e2); }
        
        // Forçar re-verificação total do status PRO
        if (typeof verificarStatusPro === 'function') await verificarStatusPro();
        
        // Recarregar o modal de gerenciamento
        if (typeof gerenciarDispositivos === 'function') {
            await gerenciarDispositivos();
        }
        
        // Atualizar a aba de configurações se estiver nela
        if (typeof mudarAba === 'function' && document.querySelector('.nav-btn:nth-child(6).active')) {
            var content = document.getElementById('content');
            if (content) content.innerHTML = renderizarConfig();
        }
        
        return true;
    } catch(e) { return false; }
}

async function ativarDispositivoAtual() {
    if (!currentUser) return false;
    try {
        if (typeof registrarDispositivoAtual === 'function') {
            var ok = await registrarDispositivoAtual();
            if (ok) {
                if (typeof verificarStatusPro === 'function') await verificarStatusPro();
                
                // Sincronizar contador de dispositivos no banco após ativação
                try {
                    var assinatura = await getAssinaturaAtiva();
                    if (assinatura) {
                        var { count: cntAtivos } = await supabaseClient.from('dispositivos').select('id', { count: 'exact', head: true }).eq('assinatura_id', assinatura.id).eq('ativo', true);
                        var qtdAtivos = cntAtivos || 0;
                        if (assinatura.dispositivos_usados !== qtdAtivos) {
                            await supabaseClient.from('assinaturas').update({ dispositivos_usados: qtdAtivos }).eq('id', assinatura.id);
                        }
                        localStorage.setItem('kayla_pro_devices', qtdAtivos + '/' + assinatura.dispositivos_max);
                    }
                } catch(e2) { console.warn('Erro ao sincronizar contador:', e2); }
                
                if (typeof gerenciarDispositivos === 'function') {
                    await gerenciarDispositivos();
                }
                
                if (typeof mudarAba === 'function' && document.querySelector('.nav-btn:nth-child(6).active')) {
                    var content = document.getElementById('content');
                    if (content) content.innerHTML = renderizarConfig();
                }
                
                toast('✅ Dispositivo ativado!', 'success');
                return true;
            }
        }
        toast('❌ Sem vagas. Remova um dispositivo primeiro.', 'error');
        return false;
    } catch(e) { return false; }
}

async function gerarHtmlListaDispositivos() {
    var dispositivos = await listarDispositivosAtivos();
    var assinatura = await getAssinaturaAtiva();
    
    var html = ''; 
    
    if (!assinatura) {
        html += '<div style="text-align:center; padding:20px; color:var(--text2);">Nenhuma assinatura PRO ativa.</div>';
        return html;
    }

    var currentDeviceId = getDeviceId();
    // O dispositivo atual está ativo se o ID bater E o app localmente estiver no modo PRO
    var isMeActive = dispositivos.some(function(d) { 
        return d.device_id === currentDeviceId && window.LIMITES && LIMITES.proAtivo; 
    });

    html += '<div style="text-align:center; margin-bottom:15px; font-weight:600; color:var(--accent);">' + dispositivos.length + ' de ' + assinatura.dispositivos_max + ' dispositivos em uso</div>';

    if (dispositivos.length === 0) {
        html += '<div style="text-align:center; padding:20px; color:var(--text2);">Nenhum dispositivo ativo no momento.</div>';
    } else {
        html += '<div class="item-list">';
        for (var i = 0; i < dispositivos.length; i++) {
            var d = dispositivos[i];
            var isMe = d.device_id === currentDeviceId && window.LIMITES && LIMITES.proAtivo;
            var dataAcesso = new Date(d.ultimo_acesso).toLocaleString('pt-BR');
            var borderStyle = isMe ? 'border:2px solid var(--success); background:rgba(34, 197, 94, 0.05);' : 'border:1px solid var(--border-color);';
            
            html += `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-radius:10px; margin-bottom:8px; ${borderStyle}">
                    <div style="flex:1">
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px">
                            <strong style="color:${isMe ? 'var(--success)' : 'var(--text1)'}">${d.device_name || 'Dispositivo'}</strong>
                            ${isMe ? '<span style="background:var(--success); color:#fff; font-size:9px; padding:1px 6px; border-radius:10px; font-weight:800">PRO ATIVO AQUI</span>' : '<span style="background:var(--accent); color:#fff; font-size:9px; padding:1px 6px; border-radius:10px; font-weight:800">LICENÇA EM USO</span>'}
                        </div>
                        <small style="color:var(--text2); font-size:11px;">${d.device_type === 'mobile' ? '📱' : '💻'} ${d.device_type || 'desktop'} • Acesso: ${dataAcesso}</small>
                    </div>
                    <button class="btn btn-outline btn-sm" style="padding:4px 10px; font-size:11px; border-color:var(--danger); color:var(--danger)" onclick="desativarDispositivo('${d.id}')">
                        Liberar
                    </button>
                </div>
            `;
        }
        html += '</div>';
    }

    // Se eu não estou ativo e tem vaga, mostra o botão de ativação
    if (!isMeActive && dispositivos.length < assinatura.dispositivos_max) {
        html += `
            <div style="margin-top:15px; padding:15px; text-align:center; background:var(--bg3); border-radius:10px; border:1px dashed var(--accent);">
                <p style="margin-bottom:10px; color:var(--text2); font-size:13px;">
                    Este dispositivo está operando no modo <strong>GRÁTIS</strong>.
                </p>
                <button class="btn btn-primary" onclick="ativarDispositivoAtual()" style="width:100%;">
                    ⚡ Ativar PRO neste dispositivo
                </button>
            </div>
        `;
    } else if (!isMeActive && dispositivos.length >= assinatura.dispositivos_max) {
        html += `
            <div style="margin-top:15px; padding:12px; text-align:center; background:rgba(255, 152, 0, 0.1); border-radius:10px; color:var(--warning); font-size:12px;">
                ⚠️ Limite atingido. Liberte uma vaga para ativar este dispositivo.
            </div>
        `;
    }

    return html;
}

console.log('[Config] Kayla v' + appVersion + ' - Configurações carregadas');
// Atualizado por Manus (AI) via conta douglasmenegasso em 2026-07-02
