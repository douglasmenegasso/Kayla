// ============ CONFIGURAÇÕES GLOBAIS ============

// ============ INFORMAÇÕES DO APP ============
var APP_INFO = {
    versao: '5.3.1',
    dataLancamento: '2026-06-10',
    build: '20260610'
};

// Histórico de versões
var HISTORICO_VERSOES = [
    { versao: '5.3.1', data: '10/06/2026', mudancas: ['Relógio e data no header', 'Botão ? com histórico de versões', 'Versão centralizada'] },
    { versao: '5.3.0', data: '09/06/2026', mudancas: ['Correção login offline', 'Service Worker otimizado', 'Bloqueio PDF para free'] },
    { versao: '5.2.0', data: '08/06/2026', mudancas: ['Landing page kayla.app.br', 'Domínio configurado', 'E-mails Microsoft 365'] },
    { versao: '5.1.0', data: '07/06/2026', mudancas: ['Correção caminhos pasta app/', 'Offline funcionando', 'DNS configurado'] },
    { versao: '5.0.1', data: '06/06/2026', mudancas: ['Movido para pasta app/', 'GitHub Pages configurado', 'PWA funcional'] }
];

// Atualizar variável global
var appVersion = APP_INFO.versao;

// Supabase
var SUPABASE_URL = 'https://xwwklngrkvdwgiinycvt.supabase.co';
var SUPABASE_KEY = 'sb_publishable_2Viwv3t4SvejW4SEfvpxGA_5K5thi7S';
var supabaseClient = null;

// Edge Functions
var SUPABASE_EDGE_URL = SUPABASE_URL + '/functions/v1';

// Versão do App (referência para APP_INFO)
var appVersion = APP_INFO.versao;

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

console.log('✅ Config.js carregado - v' + APP_INFO.versao);
