// ============ MAIN - INICIALIZAÇÃO E NAVEGAÇÃO ============

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
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">📱 Kayla - Sistema de Vendas</div>';
    html += '<div style="text-align:center;margin-bottom:20px">';
    html += '<div style="font-size:48px;margin-bottom:10px">🛍️</div>';
    html += '<div style="font-size:24px;font-weight:700;color:var(--accent)">Kayla</div>';
    html += '<div style="font-size:14px;color:var(--text2)">Sistema de Venda Consignada</div>';
    html += '<div style="margin-top:10px;padding:8px;background:var(--bg3);border-radius:8px;display:inline-block">';
    html += '<div style="font-size:18px;font-weight:700;color:var(--success)">v' + APP_INFO.versao + '</div>';
    html += '<div style="font-size:11px;color:var(--text2)">Lançamento: ' + APP_INFO.dataLancamento + '</div>';
    html += '</div></div>';
    
    html += '<div style="margin-bottom:12px"><strong style="color:var(--accent)">📋 Histórico de Versões:</strong></div>';
    
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
    
    html += '<div class="form-group"><label class="form-label">Usuário</label><div style="background:var(--bg3);padding:12px;border-radius:8px;margin-bottom:12px">' + (currentUser ? currentUser.email : 'Não logado') + '</div></div>';
    
    html += '<div class="form-group"><label class="form-label">Perfil</label><div style="background:var(--bg3);padding:12px;border-radius:8px;margin-bottom:12px">' + (perfilAtual === 'admin' ? '👑 Admin' : '👤 Usuário') + '</div></div>';
    
    var planoUsuario = localStorage.getItem('kayla_plano') || 'free';
    var isPro = planoUsuario === 'pro' || LIMITES.proAtivo;
    
    html += '<div class="form-group"><label class="form-label">Plano</label><div style="background:var(--bg3);padding:12px;border-radius:8px;margin-bottom:12px"><span class="' + (isPro ? 'badge-pro' : 'badge-free') + '">' + (isPro ? 'PRO' : 'GRÁTIS') + '</span></div></div>';
    
    if (isPro) {
        var devices = localStorage.getItem('kayla_pro_devices') || '0/0';
        var expires = localStorage.getItem('kayla_pro_expires');
        var expDate = expires ? new Date(expires).toLocaleDateString('pt-BR') : 'N/A';
        
        html += '<div class="form-group"><label class="form-label">Dispositivos</label><div style="background:var(--bg3);padding:12px;border-radius:8px;margin-bottom:12px">' + devices + ' ativos</div></div>';
        html += '<div class="form-group"><label class="form-label">Validade</label><div style="background:var(--bg3);padding:12px;border-radius:8px;margin-bottom:12px">' + expDate + '</div></div>';
        html += '<button class="btn btn-primary" onclick="gerenciarDispositivos()">📱 Gerenciar Dispositivos</button>';
    
    // ⬇️ ADICIONE ESTES BOTÕES ⬇️
        html += '<button class="btn btn-primary" onclick="mostrarInfoAssinatura()" style="margin-top:8px">📋 Minha Assinatura</button>';
        html += '<button class="btn btn-outline" onclick="gerenciarDispositivos()" style="margin-top:8px">📱 Gerenciar Dispositivos</button>';
        html += '<button class="btn btn-outline" onclick="fazerUpgradeDispositivos()" style="margin-top:8px">⬆️ Adicionar Dispositivos</button>';
}
        
    } else {
        html += '<button class="btn btn-primary" onclick="mostrarPlanos()">🚀 Assinar Plano Pro</button>';
        html += '<div class="form-group" style="margin-top:12px"><label class="form-label">Já tem uma key?</label>';
        html += '<input class="form-input" id="pro-key" placeholder="PRO-XXXX-XXXX-XXXX">';
        html += '<button class="btn btn-outline" onclick="ativarPro()" style="margin-top:8px">⚡ Ativar Key</button></div>';
    }
    
    // Configurações da Empresa
    html += '<div class="form-group" style="margin-top:16px">';
    html += '<label class="form-label">🏢 Dados da Empresa</label>';
    html += '<div style="background:var(--bg3);padding:12px;border-radius:8px;margin-bottom:12px">';
    if (configEmpresa.nome) {
        html += '<div style="font-weight:600">' + configEmpresa.nome + '</div>';
        if (configEmpresa.cnpj) html += '<div style="font-size:12px;color:var(--text2)">CNPJ: ' + configEmpresa.cnpj + '</div>';
        if (configEmpresa.telefone) html += '<div style="font-size:12px;color:var(--text2)">Tel: ' + configEmpresa.telefone + '</div>';
    } else {
        html += '<div style="color:var(--text2);font-size:13px">Nenhuma configuração</div>';
    }
    html += '</div>';
    html += '<button class="btn ' + (isPro ? 'btn-primary' : 'btn-outline') + '" onclick="configurarEmpresa()">⚙️ Configurar</button>';
    if (!isPro) {
        html += '<div style="font-size:11px;color:var(--warning);margin-top:8px">🔒 Disponível apenas no plano PRO</div>';
    }
    html += '</div>';
    
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
        if (currentUser) {
            toast('🔄 Online! Sincronizando...', 'warning');
            carregarDados();
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
