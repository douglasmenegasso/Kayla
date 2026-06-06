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
    
    // Scanner de código de barras
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
    html += '<div style="margin-bottom:12px"><strong>📷 Escanear Código de Barras</strong></div>';
    html += '<div style="display:flex;gap:8px">';
    html += '<input type="text" class="form-input" id="scanner-codigo-devolucao" placeholder="Digite ou escaneie o código" style="flex:1" onkeypress="if(event.key===\'Enter\')removerItemPorCodigo(\'' + pedidoId + '\')">';
    html += '<button class="btn btn-sm btn-primary" onclick="removerItemPorCodigo(\'' + pedidoId + '\')" style="margin:0;white-space:nowrap">Remover</button>';
    html += '</div>';
    html += '<small style="color:var(--text2);display:block;margin-top:8px">💡 Use o scanner ou digite o código manualmente</small>';
    html += '</div>';
    
    // Lista de itens
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
    html += '<div style="margin-bottom:12px"><strong>📦 Itens do Pedido</strong></div>';
    
    try {
        var itens = JSON.parse(pedido.itens_json || '[]');
        var historicoDevolucoes = JSON.parse(pedido.historico_devolucoes || '[]');
        
        if (itens.length === 0) {
            html += '<p style="color:var(--text2);text-align:center;padding:20px">Nenhum item no pedido</p>';
        } else {
            html += '<div class="item-list">';
            itens.forEach(function(item, idx) {
                // Verificar se item já foi devolvido
                var jaDevolvido = historicoDevolucoes.some(function(dev) {
                    return dev.itens.some(function(devItem) {
                        return devItem.codigo === item.codigo;
                    });
                });
                
                var statusStyle = jaDevolvido ? 'opacity:0.5;text-decoration:line-through' : '';
                var statusBadge = jaDevolvido ? '<span style="color:var(--error);font-size:11px;margin-left:8px">DEVOLVIDO</span>' : '';
                
                html += '<div class="item-card" style="margin-bottom:8px;' + statusStyle + '">';
                html += '<div class="item-info">';
                html += '<div class="item-name">' + item.nome + statusBadge + '</div>';
                html += '<div class="item-detail">Código: ' + item.codigo + '<br>Qtd: ' + item.qtd + ' • R$ ' + item.total.toFixed(2).replace('.',',') + '</div>';
                html += '</div>';
                
                if (!jaDevolvido) {
                    html += '<button class="btn btn-sm btn-red" onclick="removerItemIndividual(\'' + pedidoId + '\', ' + idx + ')" style="margin:0">🗑️</button>';
                }
                html += '</div>';
            });
            html += '</div>';
        }
    } catch(e) {
        html += '<p style="color:var(--error)">Erro ao carregar itens</p>';
    }
    html += '</div>';
    
    // Histórico de devoluções
    try {
        var historicoDevolucoes = JSON.parse(pedido.historico_devolucoes || '[]');
        if (historicoDevolucoes.length > 0) {
            html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
            html += '<div style="margin-bottom:12px"><strong>📋 Histórico de Devoluções</strong></div>';
            historicoDevolucoes.forEach(function(dev, idx) {
                var data = new Date(dev.data).toLocaleString('pt-BR');
                html += '<div style="padding:12px;background:var(--bg2);border-radius:8px;margin-bottom:8px">';
                html += '<div style="font-size:12px;color:var(--text2);margin-bottom:4px">' + data + '</div>';
                html += '<div style="font-size:13px">';
                dev.itens.forEach(function(item) {
                    html += '<div>• ' + item.nome + ' (Qtd: ' + item.qtd + ')</div>';
                });
                html += '</div></div>';
            });
            html += '</div>';
        }
    } catch(e) {}
    
    html += '<button class="btn btn-outline" onclick="fecharModal()">Fechar</button>';
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
    
    // Focar no campo de scanner
    setTimeout(function() { 
        var scanner = document.getElementById('scanner-codigo-devolucao');
        if (scanner) scanner.focus(); 
    }, 100);
}

async function removerItemPorCodigo(pedidoId) {
    var codigo = document.getElementById('scanner-codigo-devolucao').value.trim();
    if (!codigo) {
        toast('Digite o código de barras', 'warning');
        return;
    }
    
    var pedido = pedidos.find(function(p) { return p.id === pedidoId; });
    if (!pedido) return;
    
    try {
        var itens = JSON.parse(pedido.itens_json || '[]');
        var historicoDevolucoes = JSON.parse(pedido.historico_devolucoes || '[]');
        
        // Encontrar item pelo código
        var idx = itens.findIndex(function(item) { 
            return item.codigo === codigo; 
        });
        
        if (idx === -1) {
            toast('Item não encontrado no pedido', 'error');
            return;
        }
        
        // Verificar se já foi devolvido
        var jaDevolvido = historicoDevolucoes.some(function(dev) {
            return dev.itens.some(function(devItem) {
                return devItem.codigo === codigo;
            });
        });
        
        if (jaDevolvido) {
            toast('Este item já foi devolvido anteriormente', 'warning');
            return;
        }
        
        // Remover item
        var itemRemovido = itens.splice(idx, 1)[0];
        
        // Registrar no histórico
        historicoDevolucoes.push({
            data: new Date().toISOString(),
            itens: [itemRemovido],
            motivo: 'Devolução individual'
        });
        
        // Atualizar pedido
        var updateData = {
            itens_json: JSON.stringify(itens),
            itens: itens.length,
            total: itens.reduce(function(sum, item) { return sum + item.total; }, 0),
            historico_devolucoes: JSON.stringify(historicoDevolucoes)
        };
        
        // Se não houver mais itens, marcar como devolvido
        if (itens.length === 0) {
            updateData.status = 'devolvido';
        }
        
        if (isOnline && supabaseClient) {
            var result = await supabaseClient.from('pedidos').update(updateData).eq('id', pedidoId);
            if (result.error) { toast('Erro: ' + result.error.message, 'error'); return; }
            await carregarDados();
        } else {
            Object.assign(pedido, updateData);
            salvarDadosLocais();
        }
        
        toast('✅ Item removido: ' + itemRemovido.nome, 'success');
        devolverPedido(pedidoId); // Recarregar modal
        
    } catch(e) {
        toast('Erro ao processar: ' + e.message, 'error');
    }
}

async function removerItemIndividual(pedidoId, idx) {
    if (!confirm('Deseja remover este item da devolução?')) return;
    
    var pedido = pedidos.find(function(p) { return p.id === pedidoId; });
    if (!pedido) return;
    
    try {
        var itens = JSON.parse(pedido.itens_json || '[]');
        var historicoDevolucoes = JSON.parse(pedido.historico_devolucoes || '[]');
        
        if (idx < 0 || idx >= itens.length) {
            toast('Item inválido', 'error');
            return;
        }
        
        // Remover item
        var itemRemovido = itens.splice(idx, 1)[0];
        
        // Registrar no histórico
        historicoDevolucoes.push({
            data: new Date().toISOString(),
            itens: [itemRemovido],
            motivo: 'Devolução manual'
        });
        
        // Atualizar pedido
        var updateData = {
            itens_json: JSON.stringify(itens),
            itens: itens.length,
            total: itens.reduce(function(sum, item) { return sum + item.total; }, 0),
            historico_devolucoes: JSON.stringify(historicoDevolucoes)
        };
        
        // Se não houver mais itens, marcar como devolvido
        if (itens.length === 0) {
            updateData.status = 'devolvido';
        }
        
        if (isOnline && supabaseClient) {
            var result = await supabaseClient.from('pedidos').update(updateData).eq('id', pedidoId);
            if (result.error) { toast('Erro: ' + result.error.message, 'error'); return; }
            await carregarDados();
        } else {
            Object.assign(pedido, updateData);
            salvarDadosLocais();
        }
        
        toast('✅ Item removido: ' + itemRemovido.nome, 'success');
        devolverPedido(pedidoId); // Recarregar modal
        
    } catch(e) {
        toast('Erro ao processar: ' + e.message, 'error');
    }
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
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Status:</span><strong style="color:' + (pedido.status === 'aberto' ? 'var(--warning)' : (pedido.status === 'finalizado' ? 'var(--success)' : 'var(--error)')) + '">' + pedido.status.toUpperCase() + '</strong></div>';
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Itens:</span><strong>' + pedido.itens + '</strong></div>';
    html += '<div style="display:flex;justify-content:space-between"><span>Total:</span><strong style="color:var(--accent);font-size:18px">R$ ' + parseFloat(pedido.total).toFixed(2).replace('.',',') + '</strong></div>';
    html += '</div>';
    
    try {
        var itens = JSON.parse(pedido.itens_json || '[]');
        if (itens.length > 0) {
            html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
            html += '<div style="margin-bottom:12px"><strong>📦 Itens do Pedido</strong></div>';
            html += '<div class="item-list">';
            itens.forEach(function(item) {
                html += '<div class="item-card"><div class="item-info"><div class="item-name">' + item.nome + '</div><div class="item-detail">' + item.qtd + 'x R$ ' + item.preco.toFixed(2).replace('.',',') + '</div></div><div style="font-weight:700;color:var(--accent)">R$ ' + item.total.toFixed(2).replace('.',',') + '</div></div>';
            });
            html += '</div></div>';
        }
    } catch(e) {}
    
    // Histórico de devoluções
    try {
        var historicoDevolucoes = JSON.parse(pedido.historico_devolucoes || '[]');
        if (historicoDevolucoes.length > 0) {
            html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
            html += '<div style="margin-bottom:12px"><strong>↩️ Histórico de Devoluções</strong></div>';
            historicoDevolucoes.forEach(function(dev) {
                var data = new Date(dev.data).toLocaleString('pt-BR');
                html += '<div style="padding:12px;background:var(--bg2);border-radius:8px;margin-bottom:8px">';
                html += '<div style="font-size:12px;color:var(--text2);margin-bottom:4px">' + data + ' • ' + dev.motivo + '</div>';
                html += '<div style="font-size:13px">';
                dev.itens.forEach(function(item) {
                    html += '<div>• ' + item.nome + ' (Qtd: ' + item.qtd + ' - R$ ' + item.total.toFixed(2).replace('.',',') + ')</div>';
                });
                html += '</div></div>';
            });
            html += '</div>';
        }
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
