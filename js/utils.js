// ============ FUNÇÕES AUXILIARES ============

function toast(msg, tipo) {
    var container = document.getElementById('toast-container');
    if (!container) return;
    var el = document.createElement('div');
    el.className = 'toast ' + tipo;
    el.textContent = msg;
    document.getElementById('toast-container').appendChild(el);
    setTimeout(function() { el.style.opacity = '0'; setTimeout(function() { el.remove(); }, 300); }, 3000);
}

function fecharModal(e) {
    if (!e || e.target.id === 'modal-overlay') {
        document.getElementById('modal-overlay').classList.remove('show');
        document.getElementById('modal-body').innerHTML = '';
    }
}

function verificarLimite(tipo) {
    if (LIMITES.proAtivo) return true;
    if (tipo === 'clientes' && clientes.length >= LIMITES.freeClientes) {
        toast('Limite de ' + LIMITES.freeClientes + ' clientes atingido!', 'error');
        return false;
    }
    if (tipo === 'produtos' && produtos.length >= LIMITES.freeProdutos) {
        toast('Limite de ' + LIMITES.freeProdutos + ' produtos atingido!', 'error');
        return false;
    }
    return true;
}

function verificarStatusPro() {
    var chave = localStorage.getItem('kayla_pro_key');
    if (chave && chave.startsWith('PRO-')) {
        LIMITES.proAtivo = true;
        localStorage.setItem('kayla_pro', 'true');
    }
}

function atualizarBadgePlano() {
    var badge = document.getElementById('plan-badge');
    if (!badge) return;
    if (LIMITES.proAtivo) {
        badge.textContent = 'PRO';
        badge.className = 'badge-pro';
    } else {
        badge.textContent = 'GRÁTIS';
        badge.className = 'badge-free';
    }
}

function atualizarBadgeConexao() {
    var badge = document.getElementById('connection-badge');
    if (!badge) return;
    if (isOnline) {
        badge.textContent = 'ONLINE';
        badge.className = 'badge-online';
    } else {
        badge.textContent = 'OFFLINE';
        badge.className = 'badge-offline';
    }
}

function verificarConexao() {
    isOnline = navigator.onLine;
    atualizarBadgeConexao();
}

function carregarConfigEmpresa() {
    var config = localStorage.getItem('kayla_config_empresa');
    if (config) {
        try { configEmpresa = JSON.parse(config); } catch(e) {}
    }
}

function salvarConfigEmpresa() {
    var configParaSalvar = Object.assign({}, configEmpresa);
    delete configParaSalvar.logo;
    localStorage.setItem('kayla_config_empresa', JSON.stringify(configParaSalvar));
    if (configEmpresa.logo) {
        localStorage.setItem('kayla_logo_local', configEmpresa.logo);
    }
}

function carregarDadosLocais() {
    var dados = localStorage.getItem('kayla_dados_locais');
    if (dados) {
        try {
            var parsed = JSON.parse(dados);
            if (parsed.clientes) clientes = parsed.clientes;
            if (parsed.produtos) produtos = parsed.produtos;
            if (parsed.pedidos) pedidos = parsed.pedidos;
        } catch(e) {}
    }
}

function salvarDadosLocais() {
    var dados = {
        clientes: clientes,
        produtos: produtos,
        pedidos: pedidos,
        lastUpdate: new Date().toISOString()
    };
    localStorage.setItem('kayla_dados_locais', JSON.stringify(dados));
}

function mostrarTelaSelecao() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
}

function mostrarApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    atualizarBadgePlano();
    atualizarBadgeConexao();
    mudarAba('scan');
}

function onBackButton() {
    var modalOverlay = document.getElementById('modal-overlay');
    if (modalOverlay && modalOverlay.classList.contains('show')) {
        fecharModal();
        return;
    }
    
    var currentTime = Date.now();
    if (currentTime - lastBackPress < 2000) {
        if (navigator.app && navigator.app.exitApp) {
            navigator.app.exitApp();
        } else {
            window.close();
        }
    } else {
        lastBackPress = currentTime;
        var exitToast = document.getElementById('exit-toast');
        exitToast.style.display = 'block';
        setTimeout(function() {
            exitToast.style.display = 'none';
            lastBackPress = 0;
        }, 2000);
    }
}

console.log('✅ Utils.js carregado');
