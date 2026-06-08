// ============ CONFIGURAÇÕES GLOBAIS ============

// Supabase
var SUPABASE_URL = 'https://xwwklngrkvdwgiinycvt.supabase.co';
var SUPABASE_KEY = 'sb_publishable_2Viwv3t4SvejW4SEfvpxGA_5K5thi7S';
var supabaseClient = null;

// Edge Functions
var SUPABASE_EDGE_URL = SUPABASE_URL + '/functions/v1';

// Versão do App
var appVersion = '5.0.1';

// Variáveis Globais de Estado
var currentUser = null;
var perfilAtual = null;
var html5QrCode = null;
var clientes = [];
var produtos = [];
var pedidos = [];
var pedidoItens = [];
var clienteAtual = null;
var configEmpresa = {};

// Limites Freemium
var LIMITES = { 
    freeClientes: 3, 
    freeProdutos: 20, 
    proAtivo: false 
};

// Status de Conexão
var isOnline = navigator.onLine;
var lastSync = localStorage.getItem('kayla_last_sync') || null;
var lastBackPress = 0;

// Sistema de Keys e Dispositivos
var deviceUniqueId = localStorage.getItem('kayla_device_id') || null;
var currentProKey = localStorage.getItem('kayla_pro_key') || null;

// Inicializar Supabase Client
try {
    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
} catch(e) {
    console.error('Erro ao inicializar Supabase:', e);
}

function configurarEmpresa() {
    var isPro = LIMITES.proAtivo;
    
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">🏢 Dados da Empresa</div>';
    html += '<div class="modal-sub">Personalize o PDF dos pedidos</div>';
    
    if (!isPro) {
        html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px;border-left:4px solid var(--warning)">';
        html += '<div style="display:flex;align-items:center;gap:12px">';
        html += '<div style="font-size:24px">🔒</div>';
        html += '<div>';
        html += '<div style="font-weight:700;color:var(--warning)">Recurso PRO</div>';
        html += '<div style="font-size:12px;color:var(--text2)">Esta função está disponível apenas no plano PRO</div>';
        html += '</div></div></div>';
    }
    
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
    
    // Logo
    html += '<div style="margin-bottom:16px">';
    html += '<label class="form-label">📷 Logotipo da Empresa</label>';
    if (configEmpresa.logo) {
        html += '<div style="margin-bottom:8px"><img src="' + configEmpresa.logo + '" style="max-width:200px;max-height:100px;border-radius:8px;border:2px solid var(--bg2)"></div>';
    }
    html += '<div style="font-size:11px;color:var(--text2);margin-bottom:8px">Formato: PNG • Tamanho máx: 500KB • Dimensão: 400x200px</div>';
    html += '<input type="file" id="config-logo" accept="image/png" ' + (isPro ? '' : 'disabled') + ' onchange="uploadLogo()">';
    if (!isPro) {
        html += '<div style="font-size:11px;color:var(--warning);margin-top:4px">⚠️ Disponível apenas no plano PRO</div>';
    }
    html += '</div>';
    
    // Nome
    html += '<div class="form-group">';
    html += '<label class="form-label">📛 Nome da Empresa</label>';
    html += '<input class="form-input" id="config-nome" value="' + (configEmpresa.nome || '') + '" ' + (isPro ? '' : 'disabled') + ' placeholder="Nome da sua empresa">';
    if (!isPro) html += '<div style="font-size:11px;color:var(--warning);margin-top:4px">⚠️ Disponível apenas no plano PRO</div>';
    html += '</div>';
    
    // CNPJ
    html += '<div class="form-group">';
    html += '<label class="form-label">🆔 CNPJ/CPF</label>';
    html += '<input class="form-input" id="config-cnpj" value="' + (configEmpresa.cnpj || '') + '" ' + (isPro ? '' : 'disabled') + ' placeholder="00.000.000/0000-00">';
    if (!isPro) html += '<div style="font-size:11px;color:var(--warning);margin-top:4px">⚠️ Disponível apenas no plano PRO</div>';
    html += '</div>';
    
    // Endereço
    html += '<div class="form-group">';
    html += '<label class="form-label">📍 Endereço Completo</label>';
    html += '<input class="form-input" id="config-endereco" value="' + (configEmpresa.endereco || '') + '" ' + (isPro ? '' : 'disabled') + ' placeholder="Rua, número, bairro, cidade - UF">';
    if (!isPro) html += '<div style="font-size:11px;color:var(--warning);margin-top:4px">⚠️ Disponível apenas no plano PRO</div>';
    html += '</div>';
    
    // Telefone
    html += '<div class="form-group">';
    html += '<label class="form-label">📞 Telefone/WhatsApp</label>';
    html += '<input class="form-input" id="config-telefone" value="' + (configEmpresa.telefone || '') + '" ' + (isPro ? '' : 'disabled') + ' placeholder="(00) 00000-0000">';
    if (!isPro) html += '<div style="font-size:11px;color:var(--warning);margin-top:4px">⚠️ Disponível apenas no plano PRO</div>';
    html += '</div>';
    
    html += '</div>';
    
    if (isPro) {
        html += '<button class="btn btn-primary" onclick="salvarConfiguracoesEmpresa()">💾 Salvar Configurações</button>';
    }
    html += '<button class="btn btn-outline" onclick="fecharModal()">Fechar</button>';
    
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
}

function uploadLogo() {
    var input = document.getElementById('config-logo');
    var file = input.files[0];
    
    if (!file) return;
    
    // Verificar tipo
    if (file.type !== 'image/png') {
        toast('Apenas arquivos PNG são aceitos', 'error');
        input.value = '';
        return;
    }
    
    // Verificar tamanho (500KB)
    if (file.size > 500 * 1024) {
        toast('Imagem muito grande. Máximo 500KB', 'error');
        input.value = '';
        return;
    }
    
    var reader = new FileReader();
    reader.onload = function(e) {
        configEmpresa.logo = e.target.result;
        localStorage.setItem('kayla_logo_local', e.target.result);
        toast('✅ Logotipo carregado!', 'success');
        configurarEmpresa(); // Recarregar modal para mostrar preview
    };
    reader.readAsDataURL(file);
}

function salvarConfiguracoesEmpresa() {
    configEmpresa.nome = document.getElementById('config-nome').value.trim();
    configEmpresa.cnpj = document.getElementById('config-cnpj').value.trim();
    configEmpresa.endereco = document.getElementById('config-endereco').value.trim();
    configEmpresa.telefone = document.getElementById('config-telefone').value.trim();
    
    salvarConfigEmpresa();
    toast('✅ Configurações salvas!', 'success');
    fecharModal();
}

console.log('✅ Config.js carregado - v' + appVersion);
