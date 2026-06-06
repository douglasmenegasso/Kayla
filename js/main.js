// ============ MAIN - INICIALIZAÇÃO E NAVEGAÇÃO ============

// Navegação entre abas
function mudarAba(aba) {
    // Atualizar botões da nav
    document.querySelectorAll('.nav-btn').forEach(function(b) { b.classList.remove('active'); });
    var idx = ['scan','clients','products','orders','history','settings'].indexOf(aba) + 1;
    var btn = document.querySelector('.nav-btn:nth-child(' + idx + ')');
    if (btn) btn.classList.add('active');
    
    // Atualizar conteúdo
    var content = document.getElementById('content');
    var sub = document.getElementById('header-sub');
    
    if (!content || !sub) return;
    
    switch(aba) {
        case 'scan':
            sub.textContent = 'Nova Venda';
            content.innerHTML = renderizarVenda();
            setTimeout(iniciarScanner, 500);
            break;
        case 'clients':
            sub.textContent = 'Clientes';
            content.innerHTML = renderizarClientes();
            break;
        case 'products':
            sub.textContent = 'Produtos';
            content.innerHTML = renderizarProdutos();
            break;
        case 'orders':
            sub.textContent = 'Pedidos';
            content.innerHTML = renderizarPedidos();
            break;
        case 'history':
            sub.textContent = 'Histórico';
            content.innerHTML = renderizarHistorico();
            break;
        case 'settings':
            sub.textContent = 'Configurações';
            content.innerHTML = renderizarConfig();
            break;
    }
}

// Renderizar tela de Configurações
function renderizarConfig() {
    var html = '<div class="card"><div class="card-title">⚙️ Configurações</div>';
    
    html += '<div class="form-group"><label class="form-label">Usuário</label><div style="background:var(--bg3);padding:12px;border-radius:8px;margin-bottom:12px">' + (currentUser ? currentUser.email : 'Não logado') + '</div></div>';
    
    html += '<div class="form-group"><label class="form-label">Perfil</label><div style="background:var(--bg3);padding:12px;border-radius:8px;margin-bottom:12px">' + (perfilAtual === 'admin' ? '👑 Admin' : '👤 Usuário') + '</div></div>';
    
    html += '<div class="form-group"><label class="form-label">Plano</label><div style="background:var(--bg3);padding:12px;border-radius:8px;margin-bottom:12px"><span class="' + (LIMITES.proAtivo ? 'badge-pro' : 'badge-free') + '">' + (LIMITES.proAtivo ? 'PRO' : 'GRÁTIS') + '</span></div></div>';
    
    if (LIMITES.proAtivo) {
        var devices = localStorage.getItem('kayla_pro_devices') || '0/0';
        var expires = localStorage.getItem('kayla_pro_expires');
        var expDate = expires ? new Date(expires).toLocaleDateString('pt-BR') : 'N/A';
        
        html += '<div class="form-group"><label class="form-label">Dispositivos</label><div style="background:var(--bg3);padding:12px;border-radius:8px;margin-bottom:12px">' + devices + ' ativos</div></div>';
        html += '<div class="form-group"><label class="form-label">Validade</label><div style="background:var(--bg3);padding:12px;border-radius:8px;margin-bottom:12px">' + expDate + '</div></div>';
        html += '<button class="btn btn-primary" onclick="gerenciarDispositivos()">📱 Gerenciar Dispositivos</button>';
    } else {
        html += '<button class="btn btn-primary" onclick="mostrarPlanos()">🚀 Assinar Plano Pro</button>';
        html += '<div class="form-group" style="margin-top:12px"><label class="form-label">Já tem uma key?</label>';
        html += '<input class="form-input" id="pro-key" placeholder="PRO-XXXX-XXXX-XXXX">';
        html += '<button class="btn btn-outline" onclick="ativarPro()" style="margin-top:8px">⚡ Ativar Key</button></div>';
    }
    
    html += '<div class="form-group" style="margin-top:16px"><label class="form-label">Versão</label><div style="background:var(--bg3);padding:12px;border-radius:8px">v' + appVersion + '</div></div>';
    
    html += '<button class="btn btn-red" onclick="fazerLogout()" style="margin-top:12px">🚪 Sair</button></div>';
    
    return html;
}

// ============ INICIALIZAÇÃO ============
window.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Kayla v' + appVersion + ' inicializando...');
    
    // Registrar Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(function(registration) {
                console.log('[SW] Service Worker registrado:', registration.scope);
            })
            .catch(function(error) {
                console.warn('[SW] Falha ao registrar Service Worker:', error);
            });
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
        if (currentUser) sincronizarDados();
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
