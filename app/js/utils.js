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

// Modal de confirmação personalizado
function confirmar(titulo, mensagem, callback) {
    var modal = document.getElementById('confirm-modal');
    if (!modal) {
        console.error('Modal de confirmação não encontrado');
        if (callback) callback(false);
        return;
    }
    
    document.getElementById('confirm-title').textContent = titulo;
    document.getElementById('confirm-message').textContent = mensagem;
    
    modal.classList.add('show');
    
    var btnOk = document.getElementById('confirm-btn-ok');
    var btnCancel = document.getElementById('confirm-btn-cancel');
    
    // Remover listeners anteriores
    var newBtnOk = btnOk.cloneNode(true);
    var newBtnCancel = btnCancel.cloneNode(true);
    btnOk.parentNode.replaceChild(newBtnOk, btnOk);
    btnCancel.parentNode.replaceChild(newBtnCancel, btnCancel);
    
    newBtnOk.addEventListener('click', function() {
        modal.classList.remove('show');
        if (callback) callback(true);
    });
    
    newBtnCancel.addEventListener('click', function() {
        modal.classList.remove('show');
        if (callback) callback(false);
    });
    
    // Fechar ao clicar fora
    modal.onclick = function(e) {
        if (e.target === modal) {
            modal.classList.remove('show');
            if (callback) callback(false);
        }
    };
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
    if (typeof isOnline === 'undefined') {
        window.isOnline = navigator.onLine;
    } else {
        isOnline = navigator.onLine;
    }
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

// Rolar para o topo da página
function rolarParaTopo() {
    var content = document.getElementById('content');
    if (content) {
        content.scrollTop = 0;
    }
}

// ============ CONFIGURAÇÃO DA EMPRESA ============

function configurarEmpresa() {
    var isPro = LIMITES.proAtivo || localStorage.getItem('kayla_plano') === 'pro';
    
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
    } else {
        html += '<button class="btn btn-primary" onclick="fecharModal(); mostrarPlanos()">🚀 Ver Planos PRO</button>';
    }
    html += '<button class="btn btn-outline" onclick="fecharModal()">Cancelar</button>';
    
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

console.log('✅ Utils.js carregado');
