// ============ PRODUTOS ============

var html5QrCodeProduto = null;

function renderizarProdutos() {
    var limiteProdutos = LIMITES.proAtivo ? '∞' : (LIMITES.maxProdutos || LIMITES.freeProdutos || 5);
    
    var html = '<div class="card"><div class="card-title">🏷️ Produtos (' + produtos.length + '/' + limiteProdutos + ')</div>';
    
    if (!LIMITES.proAtivo && produtos.length >= (LIMITES.maxProdutos || LIMITES.freeProdutos || 5)) {
        html += '<div class="limit-warning">⚠️ Limite atingido!</div>';
    }
    
    // ✅ CORREÇÃO: Chama função que verifica E mostra modal de planos
    html += '<button class="btn btn-primary" onclick="adicionarProdutoComVerificacao()">+ Novo Produto</button></div>';
    
    if (produtos.length === 0) {
        html += '<div class="card"><div class="empty-state">Nenhum produto</div></div>';
    } else {
        html += '<div class="item-list">';
        produtos.forEach(function(p) {
            html += '<div class="item-card"><div class="item-info"><div class="item-name">' + p.nome + '</div><div class="item-detail">' + p.codigo + ' - R$ ' + p.preco.toFixed(2).replace('.',',') + '</div></div>';
            html += '<div style="display:flex;gap:8px">';
            html += '<button class="btn btn-sm btn-outline" onclick="editarProduto(\'' + p.id + '\')">✏️</button>';
            html += '<button class="btn btn-sm btn-red" onclick="excluirProduto(\'' + p.id + '\')">🗑️</button>';
            html += '</div></div>';
        });
        html += '</div>';
    }
    return html;
}

// ✅ NOVA FUNÇÃO: Verifica limite e mostra modal de planos
function adicionarProdutoComVerificacao() {
    // 🚫 Bloqueio por dispositivo
    if (LIMITES.bloqueadoPorDispositivo) {
        toast('🔒 Ação bloqueada. Limite de dispositivos atingido. Libere um dispositivo nas Configurações.', 'error');
        return;
    }

    var maxProdutos = LIMITES.maxProdutos || LIMITES.freeProdutos || 5;
    
    if (!LIMITES.proAtivo && produtos.length >= maxProdutos) {
        toast('🔒 Limite do plano FREE atingido! (' + maxProdutos + ' produtos)', 'error');
        setTimeout(function() {
            mostrarPlanos();
        }, 1000);
        return;
    }
    
    abrirModalProduto();
}

function abrirModalProduto() {
    if (typeof html5QrCodeProduto !== 'undefined' && html5QrCodeProduto) { try { html5QrCodeProduto.stop(); } catch(e){} html5QrCodeProduto = null; }
    if (!verificarLimite('produtos')) return;
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">🏷️ Cadastrar Produto</div>';
    html += '<div class="form-group"><label class="form-label">Nome *</label><input class="form-input" id="produto-nome-manual" onkeypress="if(event.key===\'Enter\')salvarProduto()"></div>';
    html += '<div class="form-group"><label class="form-label">Código *</label>';
    html += '<div style="display:flex;gap:8px;align-items:stretch">';
    html += '<input class="form-input" id="produto-codigo-manual" style="flex:1 1 auto;min-width:0;margin:0" placeholder="Escaneie ou digite" onkeypress="if(event.key===\'Enter\')salvarProduto()">';
    html += '<button type="button" style="flex:0 0 56px;width:56px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-size:20px;cursor:pointer" onclick="escanearCodigoProduto()">📷</button>';
    html += '</div>';
    html += '<div id="reader-produto" style="display:none;margin-top:8px"></div>';
    html += '</div>';
    html += '<div class="form-group"><label class="form-label">Preço (R$) *</label><input class="form-input" id="produto-preco-manual" type="number" step="0.01" onkeypress="if(event.key===\'Enter\')salvarProduto()"></div>';
    html += '<button class="btn btn-primary" onclick="salvarProduto()">💾 Salvar</button>';
    html += '<button class="btn btn-outline" onclick="fecharModal()">Cancelar</button>';
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
    setTimeout(function() { document.getElementById('produto-nome-manual').focus(); }, 100);
}

function escanearCodigoProduto() {
    try { if (typeof html5QrCode !== 'undefined' && html5QrCode) { html5QrCode.stop(); html5QrCode = null; } } catch(e){}
    var readerDiv = document.getElementById('reader-produto');
    if (!readerDiv) return;
    if (html5QrCodeProduto) {
        html5QrCodeProduto.stop().then(function(){ html5QrCodeProduto = null; readerDiv.style.display = 'none'; }).catch(function(){ html5QrCodeProduto = null; readerDiv.style.display = 'none'; });
        return;
    }
    readerDiv.style.display = 'block';
    html5QrCodeProduto = new Html5Qrcode("reader-produto");
    html5QrCodeProduto.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        function(decodedText) {
            var campo = document.getElementById('produto-codigo-manual');
            if (campo) { campo.value = decodedText; }
            toast('✅ Código lido: ' + decodedText, 'success');
            if (html5QrCodeProduto) {
                html5QrCodeProduto.stop().then(function(){ html5QrCodeProduto = null; readerDiv.style.display = 'none'; }).catch(function(){ html5QrCodeProduto = null; readerDiv.style.display = 'none'; });
            }
            var preco = document.getElementById('produto-preco-manual');
            if (preco) preco.focus();
        }
    ).catch(function(err) {
        console.warn('Erro ao iniciar scanner do produto:', err);
        readerDiv.style.display = 'none';
        toast('📷 Câmera indisponível. Digite o código manualmente.', 'warning');
    });
}
window.escanearCodigoProduto = escanearCodigoProduto;

async function salvarProduto() {
    // 🚫 Bloqueio por dispositivo
    if (LIMITES.bloqueadoPorDispositivo) {
        toast('🔒 Ação bloqueada. Limite de dispositivos atingido. Libere um dispositivo nas Configurações.', 'error');
        return;
    }

    var nome = document.getElementById('produto-nome-manual').value.trim();
    var codigo = document.getElementById('produto-codigo-manual').value.trim();
    var preco = parseFloat(document.getElementById('produto-preco-manual').value);
    if (!nome || !codigo || !preco) { toast('Preencha tudo', 'error'); return; }
    
    var userId = currentUser ? currentUser.id : 'local';
    
    // Verificar duplicata APENAS do usuário atual
    if (isOnline && supabaseClient) {
        try {
            var check = await supabaseClient
                .from('produtos')
                .select('id')
                .eq('codigo', codigo)
                .eq('user_id', userId);
            
            if (check.data && check.data.length > 0) {
                toast('⚠️ Você já tem um produto com este código!', 'error');
                return;
            }
        } catch(e) {
            console.error('Erro ao verificar:', e);
        }
    } else {
        // Offline: verificar local
        if (produtos.find(function(p) { return p.codigo === codigo; })) {
            toast('Já existe!', 'error');
            return;
        }
    }
    
    var produtoData = { 
        nome: nome, 
        codigo: codigo, 
        preco: preco, 
        user_id: userId,
        created_at: new Date().toISOString() 
    };
    
    if (isOnline && supabaseClient) {
        var result = await supabaseClient.from('produtos').insert(produtoData).select();
        if (result.error) { 
            toast('Erro: ' + result.error.message, 'error'); 
            return; 
        }
        await carregarDados();
    } else {
        produtoData.id = 'local_' + Date.now();
        produtos.push(produtoData);
        salvarDadosLocais();
    }
    
    toast('✅ Produto salvo!', 'success');
    fecharModal();
    mudarAba('products');
}

function editarProduto(id) {
    // 🚫 Bloqueio por dispositivo
    if (LIMITES.bloqueadoPorDispositivo) {
        toast('🔒 Ação bloqueada. Limite de dispositivos atingido. Libere um dispositivo nas Configurações.', 'error');
        return;
    }

    var produto = produtos.find(function(p) { return p.id === id; });
    if (!produto) return;
    
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">✏️ Editar Produto</div>';
    html += '<div class="form-group"><label class="form-label">Nome</label><input class="form-input" id="produto-nome-edit" value="' + produto.nome + '" onkeypress="if(event.key===\'Enter\')salvarProdutoEdit(\'' + id + '\')"></div>';
    html += '<div class="form-group"><label class="form-label">Código</label><input class="form-input" id="produto-codigo-edit" value="' + produto.codigo + '" readonly></div>';
    html += '<div class="form-group"><label class="form-label">Preço (R$)</label><input class="form-input" id="produto-preco-edit" value="' + produto.preco + '" type="number" step="0.01" onkeypress="if(event.key===\'Enter\')salvarProdutoEdit(\'' + id + '\')"></div>';
    html += '<button class="btn btn-primary" onclick="salvarProdutoEdit(\'' + id + '\')">💾 Salvar</button>';
    html += '<button class="btn btn-outline" onclick="fecharModal()">Cancelar</button>';
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
    setTimeout(function() { document.getElementById('produto-nome-edit').focus(); }, 100);
}

async function salvarProdutoEdit(id) {
    // 🚫 Bloqueio por dispositivo
    if (LIMITES.bloqueadoPorDispositivo) {
        toast('🔒 Ação bloqueada. Limite de dispositivos atingido. Libere um dispositivo nas Configurações.', 'error');
        return;
    }

    var nome = document.getElementById('produto-nome-edit').value.trim();
    var preco = parseFloat(document.getElementById('produto-preco-edit').value);
    if (!nome || !preco) { toast('Preencha tudo', 'error'); return; }
    
    var produtoData = { nome: nome, preco: preco };
    
    if (isOnline && supabaseClient) {
        var result = await supabaseClient.from('produtos').update(produtoData).eq('id', id);
        if (result.error) { toast('Erro: ' + result.error.message, 'error'); return; }
        await carregarDados();
    } else {
        var idx = produtos.findIndex(function(p) { return p.id === id; });
        if (idx >= 0) {
            produtos[idx] = Object.assign({}, produtos[idx], produtoData);
            salvarDadosLocais();
        }
    }
    
    toast('✅ Produto atualizado!', 'success');
    fecharModal();
    mudarAba('products');
}

async function excluirProduto(produtoId) {
    // 🚫 Bloqueio por dispositivo
    if (LIMITES.bloqueadoPorDispositivo) {
        toast('🔒 Ação bloqueada. Limite de dispositivos atingido. Libere um dispositivo nas Configurações.', 'error');
        return;
    }

    if (!confirm('Tem certeza que deseja excluir este produto permanentemente?')) return;
    
    if (isOnline && supabaseClient) {
        // Exclusão FÍSICA do banco
        var result = await supabaseClient
            .from('produtos')
            .delete()
            .eq('id', produtoId);
        
        if (result.error) { 
            toast('Erro: ' + result.error.message, 'error'); 
            return; 
        }
        
        // Aguardar e recarregar dados
        await new Promise(resolve => setTimeout(resolve, 500));
        await carregarDados();
    } else {
        // Offline: remover do array
        produtos = produtos.filter(function(p) { return p.id !== produtoId; });
        salvarDadosLocais();
    }
    
    toast('✅ Produto excluído!', 'success');
    mudarAba('products');
}

console.log('✅ Products.js carregado (Modo Somente Leitura Ativo)');
