// ============ CLIENTES ============

function renderizarClientes() {
    // ✅ CORREÇÃO: Usar LIMITES.maxClientes com valor padrão
    var limiteClientes = LIMITES.proAtivo ? '∞' : (LIMITES.maxClientes || 3);
    
    var html = '<div class="card"><div class="card-title">👥 Clientes (' + clientes.length + '/' + limiteClientes + ')</div>';
    
    // Aviso de limite
    if (!LIMITES.proAtivo && clientes.length >= (LIMITES.maxClientes || 3)) {
        html += '<div class="limit-warning">⚠️ Limite atingido! Faça upgrade para PRO.</div>';
    }
    
    // ✅ CORREÇÃO: Botão chama função que verifica e abre modal de planos
    html += '<button class="btn btn-primary" onclick="adicionarClienteComLimite()">+ Novo Cliente</button></div>';
    
    if (clientes.length === 0) {
        html += '<div class="card"><div class="empty-state">Nenhum cliente</div></div>';
    } else {
        html += '<div class="item-list">';
        clientes.forEach(function(c) {
            html += '<div class="item-card"><div class="item-info"><div class="item-name">' + c.nome + '</div><div class="item-detail">' + (c.telefone || 'Sem tel') + '</div></div>';
            html += '<div style="display:flex;gap:8px">';
            html += '<button class="btn btn-sm btn-primary" onclick="iniciarPedidoCliente(\'' + c.id + '\')">🛒 Vender</button>';
            html += '<button class="btn btn-sm btn-outline" onclick="editarCliente(\'' + c.id + '\')">✏️</button>';
            html += '<button class="btn btn-sm btn-red" onclick="excluirCliente(\'' + c.id + '\')">🗑️</button>';
            html += '</div></div>';
        });
        html += '</div>';
    }
    return html;
}

// ✅ NOVA FUNÇÃO: Verifica limite e abre modal de planos se necessário
function adicionarClienteComLimite() {
    var maxClientes = LIMITES.maxClientes || 3;
    
    if (!LIMITES.proAtivo && clientes.length >= maxClientes) {
        // ✅ Mostra toast e abre modal de assinatura
        toast('🔒 Limite do plano FREE atingido! (' + maxClientes + ' clientes)', 'error');
        setTimeout(function() {
            mostrarPlanos();
        }, 1000);
        return;
    }
    
    // Se não atingiu o limite, abre modal normal
    abrirModalCliente();
}

function iniciarPedidoCliente(clienteId) {
    clienteAtual = clientes.find(function(c) { return c.id === clienteId; });
    toast('Cliente: ' + clienteAtual.nome, 'success');
    mudarAba('scan');
}

function abrirModalCliente(clienteId) {
    if (!verificarLimite('clientes')) return;
    var cliente = clienteId ? clientes.find(function(c) { return c.id === clienteId; }) : null;
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">' + (cliente ? '✏️ Editar Cliente' : '👥 Cadastrar Cliente') + '</div>';
    html += '<div class="form-group"><label class="form-label">Nome *</label><input class="form-input" id="cliente-nome" value="' + (cliente ? cliente.nome : '') + '" onkeypress="if(event.key===\'Enter\')salvarCliente(\'' + (cliente ? cliente.id : '') + '\')"></div>';
    html += '<div class="form-group"><label class="form-label">Telefone</label><input class="form-input" id="cliente-telefone" value="' + (cliente ? cliente.telefone || '' : '') + '"></div>';
    html += '<div class="form-group"><label class="form-label">Endereço</label><input class="form-input" id="cliente-endereco" value="' + (cliente ? cliente.endereco || '' : '') + '"></div>';
    html += '<button class="btn btn-primary" onclick="salvarCliente(\'' + (cliente ? cliente.id : '') + '\')">💾 Salvar</button>';
    html += '<button class="btn btn-outline" onclick="fecharModal()">Cancelar</button>';
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
    setTimeout(function() { document.getElementById('cliente-nome').focus(); }, 100);
}

function editarCliente(clienteId) {
    abrirModalCliente(clienteId);
}

async function excluirCliente(clienteId) {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
    
    if (isOnline && supabaseClient) {
        var result = await supabaseClient.from('clientes').delete().eq('id', clienteId);
        if (result.error) { toast('Erro: ' + result.error.message, 'error'); return; }
        await carregarDados();
    } else {
        clientes = clientes.filter(function(c) { return c.id !== clienteId; });
        salvarDadosLocais();
    }
    
    toast('✅ Cliente excluído!', 'success');
    mudarAba('clients');
}

async function salvarCliente(clienteId) {
    var nome = document.getElementById('cliente-nome').value.trim();
    if (!nome) { toast('Nome obrigatório', 'error'); return; }
    
    var clienteData = { 
        nome: nome, 
        telefone: document.getElementById('cliente-telefone').value.trim(), 
        endereco: document.getElementById('cliente-endereco').value.trim(),
        user_id: currentUser ? currentUser.id : 'local'
    };
    
    if (clienteId) {
        if (isOnline && supabaseClient) {
            var result = await supabaseClient.from('clientes').update(clienteData).eq('id', clienteId);
            if (result.error) { toast('Erro: ' + result.error.message, 'error'); return; }
            await carregarDados();
        } else {
            var idx = clientes.findIndex(function(c) { return c.id === clienteId; });
            if (idx >= 0) {
                clientes[idx] = Object.assign({}, clientes[idx], clienteData);
                salvarDadosLocais();
            }
        }
        toast('✅ Cliente atualizado!', 'success');
    } else {
        if (!verificarLimite('clientes')) return;
        clienteData.created_at = new Date().toISOString();
        if (isOnline && supabaseClient) {
            var result = await supabaseClient.from('clientes').insert(clienteData).select();
            if (result.error) { toast('Erro: ' + result.error.message, 'error'); return; }
            await carregarDados();
        } else {
            clienteData.id = 'local_' + Date.now();
            clientes.push(clienteData);
            salvarDadosLocais();
        }
        toast('✅ Cliente cadastrado!', 'success');
    }
    
    fecharModal();
    mudarAba('clients');
}

console.log('✅ Clients.js carregado');
