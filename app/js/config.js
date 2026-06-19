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
    suporte: 'https://wa.me/5500000000000'
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

console.log('[Config] Kayla v' + appVersion + ' - Configurações carregadas');
