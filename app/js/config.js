// ============ CONFIGURAÇÕES GLOBAIS ============

// Supabase
var SUPABASE_URL = 'https://xwwklngrkvdwgiinycvt.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3d2tsbmdya3Zkd2dpaW55Y3Z0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NDYwODUsImV4cCI6MjA5NjAyMjA4NX0.XhnNESlgV4Q_kkXRYh4QY2e9RBG-u-qgP9sDHyKfEG4';

// Edge Functions
var SUPABASE_EDGE_URL = 'https://xwwklngrkvdwgiinycvt.supabase.co/functions/v1';

// Versão do App
var appVersion = '5.4.0';

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
    // Aguardar Supabase carregar
    window.addEventListener('load', function() {
        setTimeout(function() {
            inicializarSupabase();
        }, 100);
    });
}

// ====================================================================
// 🆕 FUNÇÕES DE GERENCIAMENTO DE DISPOSITIVOS (INTEGRADAS AQUI)
// ====================================================================

// 1. Listar todos os dispositivos ativos do usuário
async function listarDispositivosAtivos() {
    if (!currentUser) return [];
    try {
        // Tenta pegar a assinatura ativa
        var result = await supabaseClient
            .from('assinaturas')
            .select('id')
            .eq('user_id', currentUser.id)
            .eq('status', 'ativa')
            .limit(1)
            .maybeSingle();
            
        if (result.error || !result.data) return [];
        var assinaturaId = result.data.id;
        
        // ✅ ADICIONADO: device_id para detectar o dispositivo atual
        var { data, error } = await supabaseClient
            .from('dispositivos')
            .select('id, device_id, device_name, device_type, ultimo_acesso, user_agent')
            .eq('assinatura_id', assinaturaId)
            .eq('ativo', true)
            .order('ultimo_acesso', { ascending: false });

        if (error) {
            console.error('[Dispositivos] Erro ao listar:', error);
            return [];
        }
        return data || [];
    } catch(e) {
        console.error('[Dispositivos] Erro na listagem:', e);
        return [];
    }
}

// 2. Desativar um dispositivo específico
async function desativarDispositivo(deviceId) {
    if (!currentUser) { toast('Usuário não logado.', 'error'); return false; }
    if (!deviceId) { toast('ID do dispositivo inválido.', 'error'); return false; }

    try {
        var { error } = await supabaseClient
            .from('dispositivos')
            .update({ ativo: false })
            .eq('id', deviceId)
            .eq('user_id', currentUser.id);

        if (error) {
            console.error('[Dispositivo] Erro ao desativar:', error);
            toast('Erro ao desativar o dispositivo.', 'error');
            return false;
        }

        toast('✅ Dispositivo removido com sucesso!', 'success');
        
        // Atualiza o status local imediatamente
        if (typeof verificarStatusPro === 'function') {
            await verificarStatusPro();
        }
        if (typeof atualizarBadgePlano === 'function') {
            atualizarBadgePlano();
        }
        
        // Re-renderiza a UI de dispositivos se existir
        if (typeof renderizarListaDispositivosConfig === 'function') {
            renderizarListaDispositivosConfig();
        }
        
        return true;
    } catch(e) {
        console.error('[Dispositivo] Erro na desativação:', e);
        toast('Erro de conexão ao desativar.', 'error');
        return false;
    }
}

// 3. Forçar a ativação do dispositivo ATUAL (para usar após desativar um antigo)
async function ativarDispositivoAtual() {
    if (!currentUser) { toast('Usuário não logado.', 'error'); return false; }

    try {
        // Verifica se a função registrarDispositivoAtual existe no escopo
        if (typeof registrarDispositivoAtual === 'function') {
            var resultado = await registrarDispositivoAtual();
            
            if (resultado === true) {
                // Reavalia o status
                if (typeof verificarStatusPro === 'function') {
                    await verificarStatusPro();
                }
                if (typeof atualizarBadgePlano === 'function') {
                    atualizarBadgePlano();
                }
                
                // Verifica se desbloqueou e renderiza novamente
                if (window.LIMITES && !window.LIMITES.bloqueadoPorDispositivo) {
                    toast('✅ Dispositivo ativado com sucesso! Plano PRO liberado.', 'success');
                    if (typeof renderizarListaDispositivosConfig === 'function') {
                        renderizarListaDispositivosConfig();
                    }
                    return true;
                } else {
                    toast('⚠️ Dispositivo registrado, mas o limite ainda não foi liberado.', 'warning');
                    return false;
                }
            } else {
                toast('❌ Não foi possível ativar este dispositivo. Verifique o limite.', 'error');
                return false;
            }
        } else {
            console.warn('[AtivarDispositivo] Função registrarDispositivoAtual não encontrada. Verifique se subscription.js foi carregado.');
            toast('Erro interno: função de registro não encontrada.', 'error');
            return false;
        }
    } catch(e) {
        console.error('[Dispositivo] Erro ao ativar atual:', e);
        toast('Erro de conexão ao ativar.', 'error');
        return false;
    }
}

// ====================================================================
// 🆕 FUNÇÃO DE INTERFACE (UI) PARA A ABA CONFIGURAÇÕES
// ====================================================================

// Renderiza o HTML da lista de dispositivos
async function renderizarListaDispositivosConfig() {
    var containerId = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'container-dispositivos';
    var container = document.getElementById(containerId);
    
    if (!container) {
        return gerarHtmlListaDispositivos();
    } else {
        container.innerHTML = await gerarHtmlListaDispositivos();
    }
}

// Função auxiliar que gera o HTML da lista de dispositivos
async function gerarHtmlListaDispositivos() {
    var dispositivos = await listarDispositivosAtivos();
    var assinatura = await getAssinaturaAtiva();
    
    var html = '';

    if (!assinatura) {
        html += '<div style="text-align:center; padding:20px; color:var(--text2);">Nenhuma assinatura PRO ativa encontrada.</div>';
        return html;
    }

    var maxDevices = assinatura.dispositivos_max;
    var currentDeviceId = getDeviceId();
    // Verifica se o dispositivo que está usando o app agora já está ativo na lista
    var isCurrentDeviceActive = dispositivos.some(function(d) {
        return d.device_id === currentDeviceId;
    });

    if (dispositivos.length === 0) {
        html += '<div style="text-align:center; padding:20px; color:var(--text2);">Nenhum dispositivo ativo encontrado.</div>';
    } else {
        html += '<div style="margin-bottom:10px; font-size:13px; color:var(--text2);">Dispositivos ativos: ' + dispositivos.length + '</div>';
        for (var i = 0; i < dispositivos.length; i++) {
            var d = dispositivos[i];
            var dataAcesso = new Date(d.ultimo_acesso).toLocaleString('pt-BR');
            html += `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; background:var(--bg2); border-radius:6px; margin-bottom:8px; border:1px solid var(--border-color);">
                    <div>
                        <strong>${d.device_name || 'Dispositivo Desconhecido'}</strong><br>
                        <small style="color:var(--text2);">${d.device_type || 'Tipo não identificado'} • Último acesso: ${dataAcesso}</small>
                    </div>
                    <button class="btn btn-outline btn-sm" style="padding:4px 12px; font-size:12px;" onclick="desativarDispositivo('${d.id}')">
                        Remover
                    </button>
                </div>
            `;
        }
    }

    // ✅ Lógica CORRIGIDA: Mostra o botão se o dispositivo ATUAL não estiver ativo (independente da flag de bloqueio)
    if (!isCurrentDeviceActive && dispositivos.length < maxDevices) {
        html += `
            <div style="margin-top:20px; padding:20px; text-align:center; background:var(--bg3); border-radius:8px; border:1px dashed var(--success);">
                <p style="margin-bottom:12px; color:var(--text2); font-size:14px;">
                    <strong>Este dispositivo ainda não está ativo.</strong><br>
                    Registre-o agora para usar o plano PRO neste navegador.
                </p>
                <button class="btn btn-primary" onclick="ativarDispositivoAtual()" style="width:100%;">
                    📱 Ativar este dispositivo
                </button>
            </div>
        `;
    } else if (!isCurrentDeviceActive && dispositivos.length >= maxDevices) {
        // Aviso específico caso o usuário tenha removido o único dispositivo, mas não tem vaga
        html += `
            <div style="margin-top:20px; padding:20px; text-align:center; background:var(--bg3); border-radius:8px; border:1px dashed var(--warning);">
                <p style="margin-bottom:12px; color:var(--text2); font-size:14px;">
                    Você removeu um dispositivo antigo. <br>
                    <strong>Deseja ativar este computador/celular agora?</strong>
                </p>
                <button class="btn btn-primary" onclick="ativarDispositivoAtual()" style="width:100%;">
                    📱 Ativar este dispositivo
                </button>
            </div>
        `;
    }

    return html;
}


console.log('[Config] Kayla v' + appVersion + ' - Configurações carregadas e funções de dispositivo integradas');
