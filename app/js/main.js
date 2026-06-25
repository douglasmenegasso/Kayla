// ============ MAIN - INICIALIZAÇÃO E NAVEGAÇÃO ============

// ============ HISTÓRICO DE VERSÕES (DEFINIÇÃO) ============
// Isso foi adicionado aqui porque o navegador não estava encontrando essa lista
var HISTORICO_VERSOES = [
    { 
        versao: '5.4.0', 
        data: '25/06/2026', 
        mudancas: [
            '💳 Sistema de Pagamentos com Mercado Pago',
            '📧 Envio de emails (ativação, upgrade, cancelamento)',
            '🔑 Sistema de ativação PRO com validação automática',
            '📱 Registro automático de dispositivos',
            '⬆️ Upgrade de dispositivos (calcula corretamente)',
            '💾 Backup local (exportar/importar) - PRO',
            '💬 Suporte via WhatsApp',
            '🔒 Autenticação de domínio',
            '✅ Correção: upgrade de assinatura'
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
            'E-mails de contato e suporte'
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

// ============ RELÓGIO E DATA ============
function atualizarRelogio() {
    var agora = new Date();
    var horas = String(agora.getHours()).padStart(2, '0');
    var minutos = String(agora.getMinutes()).padStart(2, '0');
    var segundos = String(agora.getSeconds()).padStart(2, '0');
    
    var dia = String(agora.getDate()).padStart(2, '0');
    var mes = String(agora.getMonth() + 1).padStart(2, '0');
    var ano = agora.getFullYear();
    
    var horario = document.getElementById('app-relogio');
    if (horario) {
        horario.innerHTML = horas + ':' + minutos + ':' + segundos + '<br><small>' + dia + '/' + mes + '/' + ano + '</small>';
    }
}

// Atualizar a cada segundo
setInterval(atualizarRelogio, 1000);

// ============ HISTÓRICO DE VERSÕES ============
function mostrarHistoricoVersoes() {
    // CORREÇÃO: Usa a variável 'appVersion' que já existe no config.js, em vez de APP_INFO
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">📱 Kayla - Sistema de Vendas</div>';
    html += '<div style="text-align:center;margin-bottom:20px">';
    html += '<div style="font-size:48px;margin-bottom:10px">🛍️</div>';
    html += '<div style="font-size:24px;font-weight:700;color:var(--accent)">Kayla</div>';
    html += '<div style="font-size:14px;color:var(--text2)">Sistema de Venda Consignada</div>';
    html += '<div style="margin-top:10px;padding:8px;background:var(--bg3);border-radius:8px;display:inline-block">';
    html += '<div style="font-size:18px;font-weight:700;color:var(--success)">v' + appVersion + '</div>'; // CORRIGIDO AQUI
    html += '<div style="font-size:11px;color:var(--text2)">Lançamento: 2026-06-17</div>'; // CORRIGIDO AQUI (adicionei a data fixa)
    html += '</div></div>';
    
    html += '<div style="margin-bottom:12px"><strong style="color:var(--accent)">📋 Histórico de Versões:</strong></div>';
    
    // CORREÇÃO: Usa a variável HISTORICO_VERSOES que já existe no config.js
    HISTORICO_VERSOES.forEach(function(ver, index) {
        html += '<div style="background:var(--bg2);border-radius:8px;padding:12px;margin-bottom:8px';
        if (index === 0) html += ';border:2px solid var(--accent)';
        html += '">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
        html += '<div style="font-weight:700;color:var(--accent)">v' + ver.versao + '</div>';
        html += '<div style="font-size:11px;color:var(--text2)">' + ver.data + '</div>';
        html += '</div>';
        html += '<ul style="margin:0;padding-left:20px;font-size:12px;color:var(--text2)">';
        ver.mudancas.forEach(function(mudanca) {
            html += '<li style="margin-bottom:4px">' + mudanca + '</li>';
        });
        html += '</ul></div>';
    });
    
    html += '<button class="btn btn-outline" onclick="fecharModal()" style="margin-top:12px">Fechar</button>';
    
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
}

// Navegação entre abas
function mudarAba(aba) {
    console.log('🔄 Mudando para aba:', aba);
    
    // ROLAR PARA O TOPO AO MUDAR DE ABA
    var content = document.getElementById('content');
    if (content) content.scrollTop = 0;
    
    // Atualizar botões da nav
    document.querySelectorAll('.nav-btn').forEach(function(b) { b.classList.remove('active'); });
    var idx = ['scan','clients','products','orders','history','settings'].indexOf(aba) + 1;
    var btn = document.querySelector('.nav-btn:nth-child(' + idx + ')');
    if (btn) btn.classList.add('active');
    
    // Atualizar conteúdo
    var sub = document.getElementById('header-sub');
    
    if (!content || !sub) {
        console.error('❌ Elementos não encontrados!');
        return;
    }
    
    console.log('📝 Atualizando conteúdo...');
    
    try {
        switch(aba) {
            case 'scan':
                sub.textContent = 'Nova Venda';
                content.innerHTML = renderizarVenda();
                console.log('✅ Venda renderizada');
                setTimeout(iniciarScanner, 500);
                break;
            case 'clients':
                sub.textContent = 'Clientes';
                content.innerHTML = renderizarClientes();
                console.log('✅ Clientes renderizados');
                break;
            case 'products':
                sub.textContent = 'Produtos';
                console.log('📦 Chamando renderizarProdutos...');
                var html = renderizarProdutos();
                console.log('📦 HTML retornado:', html ? 'OK' : 'VAZIO');
                content.innerHTML = html;
                console.log('✅ Produtos renderizados');
                break;
            case 'orders':
                sub.textContent = 'Pedidos';
                console.log('📋 Chamando renderizarPedidos...');
                var html = renderizarPedidos();
                console.log('📋 HTML retornado:', html ? 'OK' : 'VAZIO');
                content.innerHTML = html;
                console.log('✅ Pedidos renderizados');
                break;
            case 'history':
                sub.textContent = 'Histórico';
                console.log('📊 Chamando renderizarHistorico...');
                var html = renderizarHistorico();
                console.log('📊 HTML retornado:', html ? 'OK' : 'VAZIO');
                content.innerHTML = html;
                console.log('✅ Histórico renderizado');
                break;
            case 'settings':
                sub.textContent = 'Configurações';
                content.innerHTML = renderizarConfig();
                console.log('✅ Configurações renderizadas');
                break;
        }
    } catch(e) {
        console.error('❌ Erro ao renderizar aba ' + aba + ':', e);
        content.innerHTML = '<div class="card"><div class="card-title">⚠️ Erro</div><p>' + e.message + '</p></div>';
    }
}

// Renderizar tela de Configurações
function renderizarConfig() {
    var html = '<div class="card"><div class="card-title">⚙️ Configurações</div>';
    
    // Usuário
    html += '<div class="form-group"><label class="form-label"> Usuário</label><div style="background:var(--bg3);padding:12px;border-radius:8px;margin-bottom:12px">' + (currentUser ? currentUser.email : 'Não logado') + '</div></div>';
    
    var planoUsuario = localStorage.getItem('kayla_plano') || 'free';
    var isPro = planoUsuario === 'pro' || LIMITES.proAtivo;
    
    // Plano e Dispositivos lado a lado (2 banners)
    var devices = localStorage.getItem('kayla_pro_devices') || '0/0';
    var planoTexto = isPro ? '💎 PRO' : '🆓 GRÁTIS';
    var planoCor = isPro ? 'var(--accent)' : 'var(--text2)';
    
    html += '<div style="display:flex;gap:8px;margin-bottom:12px">';
    
    // Banner Plano
    html += '<div style="flex:1;background:linear-gradient(135deg, var(--bg3) 0%, var(--bg2) 100%);padding:12px;border-radius:8px;text-align:center;border:1px solid ' + planoCor + '">';
    html += '<div style="font-size:11px;color:var(--text2);margin-bottom:4px">PLANO</div>';
    html += '<div style="font-size:18px;font-weight:700;color:' + planoCor + '">' + planoTexto + '</div>';
    html += '</div>';
    
    // Banner Dispositivos
    html += '<div style="flex:1;background:linear-gradient(135deg, var(--bg3) 0%, var(--bg2) 100%);padding:12px;border-radius:8px;text-align:center;border:1px solid var(--border)">';
    html += '<div style="font-size:11px;color:var(--text2);margin-bottom:4px">DISPOSITIVOS</div>';
    html += '<div style="font-size:18px;font-weight:700;color:var(--accent)">' + devices + '</div>';
    html += '</div>';
    
    html += '</div>';
    
    // Validade (apenas PRO)
    if (isPro) {
        var expires = localStorage.getItem('kayla_pro_expires');
        var expDate = expires ? new Date(expires).toLocaleDateString('pt-BR') : 'N/A';
        
        html += '<div class="form-group"><label class="form-label">📅 Validade</label><div style="background:var(--bg3);padding:12px;border-radius:8px;margin-bottom:12px;text-align:center;font-weight:600;color:var(--accent)">' + expDate + '</div></div>';
        
               // Botões de gerenciamento PRO
        html += '<button class="btn btn-primary" onclick="mostrarInfoAssinatura()" style="margin-top:8px;width:100%">📋 Minha Assinatura</button>';
        html += '<button class="btn btn-outline" onclick="gerenciarDispositivos()" style="margin-top:8px;width:100%"> Gerenciar Dispositivos</button>';
        html += '<button class="btn btn-outline" onclick="fazerUpgradeDispositivos()" style="margin-top:8px;width:100%">⬆️ Adicionar Dispositivos</button>';
        html += '<button class="btn btn-outline" onclick="iniciarCancelamentoDispositivos()" style="margin-top:8px;width:100%">📉 Reduzir Dispositivos</button>';
        
        // Cancelar Assinatura
        html += '<button class="btn btn-red" onclick="cancelarAssinatura()" style="margin-top:8px;width:100%">🚫 Cancelar Assinatura PRO</button>';

        // 🔥 Renovar Assinatura
        html += '<button class="btn btn-primary" onclick="iniciarRenovacao()" style="margin-top:8px;width:100%">🔄 Renovar Assinatura</button>';

        // Backup (APENAS PRO)
        html += '<div class="form-group" style="margin-top:16px">';
        
        // Backup (APENAS PRO)
        html += '<div class="form-group" style="margin-top:16px">';
        html += '<label class="form-label">💾 Backup e Restauração <span class="badge-pro" style="font-size:10px">PRO</span></label>';
        html += '<button class="btn btn-primary" onclick="exportarBackup()" style="margin-top:8px;width:100%">📥 Exportar Backup</button>';
        html += '<button class="btn btn-outline" onclick="importarBackup()" style="margin-top:8px;width:100%">📤 Importar Backup</button>';
        html += '<div style="font-size:11px;color:var(--text2);margin-top:8px;text-align:center"> Exporte seus dados para um arquivo JSON e importe em outro dispositivo</div>';
        html += '</div>';
        
    } else {
        html += '<button class="btn btn-primary" onclick="mostrarPlanos()" style="width:100%">🚀 Assinar Plano Pro</button>';
        html += '<div class="form-group" style="margin-top:12px"><label class="form-label">Já tem uma key?</label>';
        html += '<input class="form-input" id="pro-key" placeholder="PRO-XXXX-XXXX-XXXX">';
        html += '<button class="btn btn-outline" onclick="ativarPro()" style="margin-top:8px;width:100%">⚡ Ativar Key</button></div>';
    }
    
    // Configurações da Empresa
    html += '<div class="form-group" style="margin-top:16px">';
    html += '<label class="form-label"> Dados da Empresa</label>';
    html += '<div style="background:var(--bg3);padding:12px;border-radius:8px;margin-bottom:12px">';
    if (configEmpresa.nome) {
        html += '<div style="font-weight:600">' + configEmpresa.nome + '</div>';
        if (configEmpresa.cnpj) html += '<div style="font-size:12px;color:var(--text2)">CNPJ: ' + configEmpresa.cnpj + '</div>';
        if (configEmpresa.telefone) html += '<div style="font-size:12px;color:var(--text2)">Tel: ' + configEmpresa.telefone + '</div>';
    } else {
        html += '<div style="color:var(--text2);font-size:13px">Nenhuma configuração</div>';
    }
    html += '</div>';
    html += '<button class="btn ' + (isPro ? 'btn-primary' : 'btn-outline') + '" onclick="configurarEmpresa()" style="width:100%">⚙️ Configurar</button>';
    if (!isPro) {
        html += '<div style="font-size:11px;color:var(--warning);margin-top:8px">🔒 Disponível apenas no plano PRO</div>';
    }
    html += '</div>';
    
    // Suporte WhatsApp (PARA TODOS)
    html += '<div class="form-group" style="margin-top:16px">';
    html += '<div class="card" style="background:linear-gradient(135deg,#25D366 0%,#128C7E 100%);padding:16px;margin-bottom:12px;cursor:pointer;border:none" onclick="abrirSuporteWhatsApp()">';
    html += '<div style="display:flex;align-items:center;justify-content:space-between">';
    html += '<div style="color:#fff;font-weight:600;display:flex;align-items:center;gap:8px">';
    html += '<span style="font-size:24px">💬</span> Suporte WhatsApp';
    html += '</div>';
    html += '<div style="background:rgba(255,255,255,0.2);padding:4px 12px;border-radius:12px;color:#fff;font-size:11px;font-weight:600">Online</div>';
    html += '</div>';
    html += '<div style="color:rgba(255,255,255,0.9);font-size:12px;margin-top:8px">Fale diretamente conosco pelo WhatsApp</div>';
    html += '</div>';
    html += '</div>';
    
    // Versão centralizada
    html += '<div style="text-align:center;margin-top:20px;padding:12px;background:var(--bg3);border-radius:8px">';
    html += '<div style="font-size:12px;color:var(--text2)">Versão do App</div>';
    html += '<div style="font-size:18px;font-weight:700;color:var(--accent);margin-top:4px">v' + appVersion + '</div>';
    html += '<button class="btn btn-outline" onclick="mostrarHistoricoVersoes()" style="margin-top:8px;font-size:12px;padding:6px 12px">📋 Histórico de Versões</button>';
    html += '</div>';
    
    // Botão de instalação PWA
    html += '<div id="pwa-install-container" style="margin-top:12px"></div>';
    
    // NOVO BOTÃO: Excluir Conta (LGPD)
    html += '<button class="btn btn-red" onclick="excluirConta()" style="margin-top:12px;width:100%;border:1px solid var(--error);background:transparent;color:var(--error);font-weight:700">🗑️ Excluir Conta e Todos os Dados</button>';
    
    // Botão de Sair
    html += '<button class="btn btn-red" onclick="fazerLogout()" style="margin-top:8px;width:100%">🚪 Sair</button></div>';
    
    return html;
}

// ============ INICIALIZAÇÃO ============
window.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Kayla v' + appVersion + ' inicializando...');
    
    // Registrar Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/app/sw.js')
            .then(function(registration) {
                console.log('[SW] Service Worker registrado:', registration.scope);
            })
            .catch(function(error) {
                console.warn('[SW] Falha ao registrar Service Worker:', error);
            });
    }
    
    // ✅ NOVO: Verificar se voltou de um pagamento PRIMEIRO
    if (typeof verificarRetornoPagamento === 'function') {
        console.log('[MAIN] Verificando retorno de pagamento...');
        verificarRetornoPagamento();
    }
    
    // Carregar dados iniciais
    verificarStatusPro();
    carregarConfigEmpresa();
    carregarDadosLocais();
    
    // Verificar conexão
    verificarConexao();
    
    // Listeners de conexão
    window.addEventListener('online', function() { 
        isOnline = true; 
        atualizarBadgeConexao();
        if (currentUser) {
            toast('🔄 Online! Sincronizando...', 'warning');
            carregarDados();
            // ✅ NOVO: Re-verificar status PRO ao ficar online
            setTimeout(verificarStatusPro, 2000);
        }
    });
    window.addEventListener('offline', function() { 
        isOnline = false; 
        atualizarBadgeConexao();
    });
    
    // Botão voltar (Android)
    document.addEventListener('backbutton', onBackButton, false);
    
    // Prevenir seleção de texto
    document.addEventListener('selectstart', function(e) { e.preventDefault(); }, false);
    document.addEventListener('contextmenu', function(e) { e.preventDefault(); }, false);
    
    // Verificar se já existe sessão salva
    verificarSessao();
    
    console.log('✅ App pronto!');
});

console.log('✅ Main.js carregado');
