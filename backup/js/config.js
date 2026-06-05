// ============ CONFIGURAÇÕES GLOBAIS ============

// Supabase
var SUPABASE_URL = 'https://xwwklngrkvdwgiinycvt.supabase.co';
var SUPABASE_KEY = 'sb_publishable_2Viwv3t4SvejW4SEfvpxGA_5K5thi7S';
var supabaseClient = null;

// Edge Functions
var SUPABASE_EDGE_URL = SUPABASE_URL + '/functions/v1';

// Versão do App
var appVersion = '5.0.0';

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
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} catch(e) {
    console.error('Erro ao inicializar Supabase:', e);
}

console.log('✅ Config.js carregado - v' + appVersion);
