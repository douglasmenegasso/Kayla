// ============ CONFIGURAÇÕES GLOBAIS ============

// ============ INFORMAÇÕES DO APP ============
var APP_INFO = {
    versao: '5.4.0',
    dataLancamento: '2026-06-17',
    build: '20260617',
    nome: 'Kayla - Venda Consignada'
};

// Histórico de versões
var HISTORICO_VERSOES = [
    { 
        versao: '5.4.0', 
        data: '17/06/2026', 
        mudancas: [
            '💳 Sistema de Pagamentos com Mercado Pago',
            '📧 Envio de emails via SendGrid (ativação, upgrade)',
            '🔑 Sistema de Keys PRO com validação',
            '📱 Registro automático de dispositivos',
            '⬆️ Upgrade de dispositivos (calcula corretamente)',
            '💾 Backup local (exportar/importar) - PRO',
            '💬 Suporte via WhatsApp',
            '🔒 Autenticação de domínio (DKIM, SPF, DMARC)',
            '✅ Correção: upgrade não estende prazo da assinatura'
        ] 
    },
    { 
        versao: '5.3.1', 
        data: '10/06/2026', 
        mudancas: [
            'Relógio e data no header', 
            'Botão ? com histórico de versões', 
            'Versão centralizada'
        ] 
    },
    { 
        versao: '5.3.0', 
        data: '09/06/2026', 
        mudancas: [
            'Correção login offline', 
            'Service Worker otimizado', 
            'Bloqueio PDF para free'
        ] 
    },
    { 
        versao: '5.2.0', 
        data: '08/06/2026', 
        mudancas: [
            'Landing page kayla.app.br', 
            'Domínio configurado', 
            'E-mails Microsoft 365'
        ] 
    },
    { 
        versao: '5.1.0', 
        data: '07/06/2026', 
        mudancas: [
            'Correção caminhos pasta app/', 
            'Offline funcionando', 
            'DNS configurado'
        ] 
    },
    { 
        versao: '5.0.1', 
        data: '06/06/2026', 
        mudancas: [
            'Movido para pasta app/', 
            'GitHub Pages configurado', 
            'PWA funcional'
        ] 
    }
];

// Atualizar variável global
var appVersion = APP_INFO.versao;

// ============ CONFIGURAÇÕES SUPABASE ============
var SUPABASE_URL = 'https://xwwklngrkvdwgiinycvt.supabase.co';
var SUPABASE_KEY = 'sb_publishable_2Viwv3t4SvejW4SEfvpxGA_5K5thi7S';
var supabaseClient = null;

// Edge Functions
var SUPABASE_EDGE_URL = SUPABASE_URL + '/functions/v1';

// ============ CONFIGURAÇÕES DE SUPORTE ============
var WHATSAPP_SUPORTE = '5541996427444'; // Configure seu número aqui (DDI+DDD)

// ============ VARIÁVEIS GLOBAIS DE ESTADO ============
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

// ============ FUNÇÕES DE BACKUP (APENAS PRO) ============

async function exportarBackup() {
    if (!LIMITES.proAtivo) {
        toast('❌ Função disponível apenas para usuários PRO', 'error');
        mostrarPlanos();
        return;
    }
    
    if (!currentUser || !supabaseClient) {
        toast('Faça login primeiro', 'error');
        return;
    }
    
    toast('Gerando backup...', 'warning');
    
    try {
        var backup = {
            usuario: currentUser.email,
            data_exportacao: new Date().toISOString(),
            versao: APP_INFO.versao,
            dados: {}
        };
        
        // Exportar clientes
        var clientesResult = await supabaseClient
            .from('clientes')
            .select('*')
            .eq('user_id', currentUser.id);
        backup.dados.clientes = clientesResult.data || [];
        
        // Exportar produtos
        var produtosResult = await supabaseClient
            .from('produtos')
            .select('*')
            .eq('user_id', currentUser.id);
        backup.dados.produtos = produtosResult.data || [];
        
        // Exportar vendas/pedidos
        var vendasResult = await supabaseClient
            .from('vendas')
            .select('*')
            .eq('user_id', currentUser.id);
        backup.dados.vendas = vendasResult.data || [];
        
        // Exportar configurações da empresa
        var configResult = await supabaseClient
            .from('configuracoes')
            .select('*')
            .eq('user_id', currentUser.id);
        backup.dados.configuracoes = configResult.data || [];
        
        // Criar arquivo JSON
        var blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'kayla_backup_' + currentUser.email.split('@')[0] + '_' + new Date().toISOString().split('T')[0] + '.json';
        a.click();
        URL.revokeObjectURL(url);
        
        toast('✅ Backup exportado com sucesso!', 'success');
        
    } catch(e) {
        console.error('Erro ao exportar backup:', e);
        toast('❌ Erro ao exportar backup: ' + e.message, 'error');
    }
}

async function importarBackup() {
    if (!LIMITES.proAtivo) {
        toast('❌ Função disponível apenas para usuários PRO', 'error');
        mostrarPlanos();
        return;
    }
    
    if (!currentUser || !supabaseClient) {
        toast('Faça login primeiro', 'error');
        return;
    }
    
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async function(e) {
        var file = e.target.files[0];
        if (!file) return;
        
        confirmar('Importar Backup', '⚠️ Isso irá adicionar os dados do backup aos seus dados atuais. Deseja continuar?', async function(confirmed) {
            if (!confirmed) return;
            
            try {
                var reader = new FileReader();
                reader.onload = async function(event) {
                    try {
                        var backup = JSON.parse(event.target.result);
                        
                        if (!backup.dados) {
                            toast('❌ Arquivo de backup inválido', 'error');
                            return;
                        }
                        
                        toast('Importando dados...', 'warning');
                        
                        var contador = {
                            clientes: 0,
                            produtos: 0,
                            vendas: 0,
                            configuracoes: 0
                        };
                        
                        // Importar clientes
                        if (backup.dados.clientes && backup.dados.clientes.length > 0) {
                            for (var cliente of backup.dados.clientes) {
                                var { id, created_at, updated_at, user_id, ...dadosCliente } = cliente;
                                await supabaseClient
                                    .from('clientes')
                                    .insert({ ...dadosCliente, user_id: currentUser.id });
                                contador.clientes++;
                            }
                        }
                        
                        // Importar produtos
                        if (backup.dados.produtos && backup.dados.produtos.length > 0) {
                            for (var produto of backup.dados.produtos) {
                                var { id, created_at, updated_at, user_id, ...dadosProduto } = produto;
                                await supabaseClient
                                    .from('produtos')
                                    .insert({ ...dadosProduto, user_id: currentUser.id });
                                contador.produtos++;
                            }
                        }
                        
                        // Importar vendas
                        if (backup.dados.vendas && backup.dados.vendas.length > 0) {
                            for (var venda of backup.dados.vendas) {
                                var { id, created_at, updated_at, user_id, ...dadosVenda } = venda;
                                await supabaseClient
                                    .from('vendas')
                                    .insert({ ...dadosVenda, user_id: currentUser.id });
                                contador.vendas++;
                            }
                        }
                        
                        // Importar configurações
                        if (backup.dados.configuracoes && backup.dados.configuracoes.length > 0) {
                            for (var config of backup.dados.configuracoes) {
                                var { id, created_at, updated_at, user_id, ...dadosConfig } = config;
                                await supabaseClient
                                    .from('configuracoes')
                                    .insert({ ...dadosConfig, user_id: currentUser.id });
                                contador.configuracoes++;
                            }
                        }
                        
                        toast('✅ Backup importado! ' + contador.clientes + ' clientes, ' + contador.produtos + ' produtos, ' + contador.vendas + ' vendas', 'success');
                        setTimeout(() => location.reload(), 2000);
                        
                    } catch(e) {
                        console.error('Erro ao processar backup:', e);
                        toast('❌ Erro ao importar backup: ' + e.message, 'error');
                    }
                };
                reader.readAsText(file);
                
            } catch(e) {
                console.error('Erro ao ler arquivo:', e);
                toast('❌ Erro ao ler arquivo', 'error');
            }
        });
    };
    
    input.click();
}

// ============ FUNÇÃO DE SUPORTE WHATSAPP ============

function abrirSuporteWhatsApp() {
    if (!currentUser) {
        toast('Faça login primeiro', 'error');
        return;
    }
    
    var plano = LIMITES.proAtivo ? 'PRO ✅' : 'Gratuito';
    var nome = currentUser.user_metadata?.name || currentUser.email.split('@')[0];
    
    var mensagem = `Olá! Meu nome é *${nome}*.\n\n`;
    mensagem += `📧 Email: ${currentUser.email}\n`;
    mensagem += `💎 Plano: ${plano}\n`;
    mensagem += `📱 Versão do App: ${APP_INFO.versao}\n\n`;
    mensagem += `Preciso de ajuda com:`;
    
    var url = `https://wa.me/${WHATSAPP_SUPORTE}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
}

console.log('✅ Config.js carregado - v' + APP_INFO.versao);
