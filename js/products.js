// ============ PRODUTOS ============

function renderizarProdutos() {
    var html = '<div class="card"><div class="card-title">🏷️ Produtos (' + produtos.length + (LIMITES.proAtivo ? '' : '/' + LIMITES.freeProdutos) + ')</div>';
    if (!LIMITES.proAtivo && produtos.length >= LIMITES.freeProdutos) {
        html += '<div class="limit-warning">⚠️ Limite atingido!</div>';
    }
    html += '<button class="btn btn-primary" onclick="verificarLimite(\'produtos\') && abrirModalProduto()">+ Novo Produto</button></div>';
    
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

function abrirModalProduto() {
    if (!verificarLimite('produtos')) return;
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">🏷️ Cadastrar Produto</div>';
    html += '<div class="form-group"><label class="form-label">Nome *</label><input class="form-input" id="produto-nome-manual" onkeypress="if(event.key===\'Enter\')salvarProduto()"></div>';
    html += '<div class="form-group"><label class="form-label">Código *</label><input class="form-input" id="produto-codigo-manual" onkeypress="if(event.key===\'Enter\')salvarProduto()"></div>';
    html += '<div class="form-group"><label class="form-label">Preço (R$) *</label><input class="form-input" id="produto-preco-manual" type="number" step="0.01" onkeypress="if(event.key===\'Enter\')salvarProduto()"></div>';
    html += '<button class="btn btn-primary" onclick="salvarProduto()">💾 Salvar</button>';
    html += '<button class="btn btn-outline" onclick="fecharModal()">Cancelar</button>';
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
    setTimeout(function() { document.getElementById('produto-nome-manual').focus(); }, 100);
}

async function salvarProduto() {
    var nome = document.getElementById('produto-nome-manual').value.trim();
    var codigo = document.getElementById('produto-codigo-manual').value.trim();
    var preco = parseFloat(document.getElementById('produto-preco-manual').value);
    if (!nome || !codigo || !preco) { toast('Preencha tudo', 'error'); return; }
    
    // Verificar duplicata NO BANCO quando online
    if (isOnline && supabaseClient) {
        try {
            var check = await supabaseClient
                .from('produtos')
                .select('id')
                .eq('codigo', codigo)
                .single();
            
            if (check.data) {
                toast('Já existe um produto com este código!', 'error');
                return;
            }
        } catch(e) {
            // Se der erro 404 (not found), significa que não existe - pode continuar
            if (e.code !== 'PGRST116') {
                console.error('Erro ao verificar duplicata:', e);
            }
        }
    } else {
        // Offline: verificar no array local
        if (produtos.find(function(p) { return p.codigo === codigo; })) {
            toast('Já existe!', 'error');
            return;
        }
    }
    
    var produtoData = { 
        nome: nome, 
        codigo: codigo, 
        preco: preco, 
        user_id: currentUser ? currentUser.id : 'local', 
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
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    
    if (isOnline && supabaseClient) {
        var result = await supabaseClient.from('produtos').delete().eq('id', produtoId);
        if (result.error) { toast('Erro: ' + result.error.message, 'error'); return; }
        await carregarDados();
    } else {
        produtos = produtos.filter(function(p) { return p.id !== produtoId; });
        salvarDadosLocais();
    }
    
    toast('✅ Produto excluído!', 'success');
    mudarAba('products');
}

console.log('✅ Products.js carregado');
