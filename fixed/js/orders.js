// ============ PEDIDOS E HISTÓRICO ============

function renderizarPedidos() {
    var html = '<div class="card"><div class="card-title"> Pedidos (' + pedidos.length + ')</div></div>';
    if (pedidos.length === 0) {
        html += '<div class="card"><div class="empty-state">Nenhum pedido</div></div>';
    } else {
        html += '<div class="item-list">';
        pedidos.forEach(function(p) {
            var data = new Date(p.created_at).toLocaleDateString('pt-BR');
            var corStatus = p.status === 'aberto' ? 'var(--warning)' : (p.status === 'finalizado' ? 'var(--success)' : 'var(--error)');
            html += '<div class="item-card"><div class="item-info"><div class="item-name">Pedido #' + p.id.toString().substr(0,8) + '</div><div class="item-detail">' + p.cliente_nome + ' • ' + data + '<br>' + p.itens + ' itens • R$ ' + parseFloat(p.total).toFixed(2).replace('.',',') + '</div></div><span style="color:' + corStatus + ';font-weight:600;font-size:12px">' + p.status.toUpperCase() + '</span></div>';
            
            html += '<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">';
            html += '<button class="btn btn-sm btn-primary" onclick="verPedido(\'' + p.id + '\')">Ver</button>';
            if (p.status === 'aberto') {
                html += '<button class="btn btn-sm btn-green" onclick="finalizarPedidoStatus(\'' + p.id + '\')">✅ Finalizar</button>';
                html += '<button class="btn btn-sm btn-warning" onclick="devolverPedido(\'' + p.id + '\')">↩️ Devolução</button>';
            }
            html += '<button class="btn btn-sm btn-outline" onclick="gerarPDFPedidoPorId(\'' + p.id + '\')">📄 PDF</button>';
            html += '</div>';
        });
        html += '</div>';
    }
    return html;
}

async function finalizarPedidoStatus(pedidoId) {
    if (!confirm('Finalizar este pedido?')) return;
    
    if (isOnline && supabaseClient) {
        var result = await supabaseClient.from('pedidos').update({ status: 'finalizado' }).eq('id', pedidoId);
        if (result.error) { toast('Erro: ' + result.error.message, 'error'); return; }
        await carregarDados();
    } else {
        var pedido = pedidos.find(function(p) { return p.id === pedidoId; });
        if (pedido) {
            pedido.status = 'finalizado';
            salvarDadosLocais();
        }
    }
    
    toast('✅ Pedido finalizado!', 'success');
    mudarAba('orders');
}

async function devolverPedido(pedidoId) {
    var pedido = pedidos.find(function(p) { return p.id === pedidoId; });
    if (!pedido) return;
    
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">↩️ Devolução</div>';
    html += '<div class="modal-sub">Pedido #' + pedidoId.toString().substr(0,8) + ' - ' + pedido.cliente_nome + '</div>';
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
    html += '<p style="color:var(--text2);margin-bottom:12px">Itens do pedido:</p>';
    
    try {
        var itens = JSON.parse(pedido.itens_json || '[]');
        itens.forEach(function(item, idx) {
            html += '<div class="item-card" style="margin-bottom:8px">';
            html += '<div class="item-info"><div class="item-name">' + item.nome + '</div><div class="item-detail">Qtd: ' + item.qtd + ' • R$ ' + item.total.toFixed(2).replace('.',',') + '</div></div>';
            html += '<label style="display:flex;align-items:center;gap:8px;cursor:pointer">';
            html += '<input type="checkbox" class="dev-item-checkbox" data-idx="' + idx + '" value="' + item.qtd + '">';
            html += '<span style="font-size:12px">Devolver</span></label></div>';
        });
    } catch(e) {
        html += '<p style="color:var(--error)">Erro ao carregar itens</p>';
    }
    html += '</div>';
    html += '<button class="btn btn-warning" onclick="confirmarDevolucao(\'' + pedidoId + '\')">✅ Confirmar Devolução</button>';
    html += '<button class="btn btn-outline" onclick="fecharModal()">Cancelar</button>';
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
}

async function confirmarDevolucao(pedidoId) {
    var pedido = pedidos.find(function(p) { return p.id === pedidoId; });
    if (!pedido) return;
    
    var checkboxes = document.querySelectorAll('.dev-item-checkbox:checked');
    if (checkboxes.length === 0) {
        toast('Selecione pelo menos 1 item', 'error');
        return;
    }
    
    var itens = JSON.parse(pedido.itens_json || '[]');
    var itensDevolvidos = [];
    
    checkboxes.forEach(function(cb) {
        var idx = parseInt(cb.getAttribute('data-idx'));
        itensDevolvidos.push(itens[idx]);
    });
    
    var devolucaoData = {
        status: 'devolvido',
        devolucao_detalhes: JSON.stringify(itensDevolvidos),
        devolucao_data: new Date().toISOString()
    };
    
    if (isOnline && supabaseClient) {
        var result = await supabaseClient.from('pedidos').update(devolucaoData).eq('id', pedidoId);
        if (result.error) { toast('Erro: ' + result.error.message, 'error'); return; }
        await carregarDados();
    } else {
        Object.assign(pedido, devolucaoData);
        salvarDadosLocais();
    }
    
    toast('✅ Devolução registrada!', 'success');
    fecharModal();
    mudarAba('orders');
}

function verPedido(pedidoId) {
    var pedido = pedidos.find(function(p) { return p.id === pedidoId; });
    if (!pedido) return;
    
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">📋 Pedido #' + pedidoId.toString().substr(0,8) + '</div>';
    html += '<div class="modal-sub">' + pedido.cliente_nome + ' - ' + new Date(pedido.created_at).toLocaleDateString('pt-BR') + '</div>';
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Status:</span><strong style="color:' + (pedido.status === 'aberto' ? 'var(--warning)' : 'var(--success)') + '">' + pedido.status.toUpperCase() + '</strong></div>';
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Itens:</span><strong>' + pedido.itens + '</strong></div>';
    html += '<div style="display:flex;justify-content:space-between"><span>Total:</span><strong style="color:var(--accent);font-size:18px">R$ ' + parseFloat(pedido.total).toFixed(2).replace('.',',') + '</strong></div>';
    html += '</div>';
    
    try {
        var itens = JSON.parse(pedido.itens_json || '[]');
        html += '<div class="item-list" style="margin-bottom:16px">';
        itens.forEach(function(item) {
            html += '<div class="item-card"><div class="item-info"><div class="item-name">' + item.nome + '</div><div class="item-detail">' + item.qtd + 'x R$ ' + item.preco.toFixed(2).replace('.',',') + '</div></div><div style="font-weight:700;color:var(--accent)">R$ ' + item.total.toFixed(2).replace('.',',') + '</div></div>';
        });
        html += '</div>';
    } catch(e) {}
    
    html += '<button class="btn btn-primary" onclick="gerarPDFPedidoPorId(\'' + pedidoId + '\')">📄 Gerar PDF</button>';
    html += '<button class="btn btn-outline" onclick="fecharModal()">Fechar</button>';
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
}

function gerarPDFPedidoPorId(pedidoId) {
    var pedido = pedidos.find(function(p) { return p.id === pedidoId; });
    if (pedido) gerarPDFPedido(pedido);
}

// ============ HISTÓRICO ============

function renderizarHistorico() {
    var finalizados = pedidos.filter(function(p) { return p.status === 'finalizado'; });
    var devolvidos = pedidos.filter(function(p) { return p.status === 'devolvido'; });
    
    var html = '<div class="card"><div class="card-title"> Resumo</div>';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">';
    html += '<div class="card" style="background:var(--bg3);padding:16px;text-align:center"><div style="font-size:24px;font-weight:700;color:var(--success)">' + finalizados.length + '</div><div style="font-size:12px;color:var(--text2)">Vendas</div></div>';
    html += '<div class="card" style="background:var(--bg3);padding:16px;text-align:center"><div style="font-size:24px;font-weight:700;color:var(--warning)">' + devolvidos.length + '</div><div style="font-size:12px;color:var(--text2)">Devoluções</div></div>';
    html += '<div class="card" style="background:var(--bg3);padding:16px;text-align:center"><div style="font-size:24px;font-weight:700;color:var(--accent)">' + pedidos.length + '</div><div style="font-size:12px;color:var(--text2)">Total</div></div>';
    html += '</div></div>';
    
    var totalGeral = 0;
    finalizados.forEach(function(p) { totalGeral += parseFloat(p.total); });
    
    html += '<div class="card" style="background:var(--bg3);padding:16px"><div style="display:flex;justify-content:space-between"><span>Faturamento:</span><strong style="color:var(--accent);font-size:18px">R$ ' + totalGeral.toFixed(2).replace('.',',') + '</strong></div></div>';
    
    html += '<div class="card"><div class="card-title">📋 Todos os Pedidos</div>';
    if (pedidos.length === 0) {
        html += '<div class="empty-state">Nenhum pedido</div>';
    } else {
        html += '<div class="item-list">';
        pedidos.forEach(function(p) {
            var data = new Date(p.created_at).toLocaleDateString('pt-BR');
            var corStatus = p.status === 'aberto' ? 'var(--warning)' : (p.status === 'finalizado' ? 'var(--success)' : 'var(--error)');
            html += '<div class="item-card"><div class="item-info"><div class="item-name">#' + p.id.toString().substr(0,8) + '</div><div class="item-detail">' + p.cliente_nome + ' • ' + data + '<br>' + p.itens + ' itens • R$ ' + parseFloat(p.total).toFixed(2).replace('.',',') + '</div></div><span style="color:' + corStatus + ';font-weight:600;font-size:12px">' + p.status.toUpperCase() + '</span></div>';
        });
        html += '</div>';
    }
    html += '</div>';
    
    return html;
}

console.log('✅ Orders.js carregado');
