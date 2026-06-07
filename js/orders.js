// ============ PEDIDOS E HISTÓRICO ============

function renderizarPedidos() {
    var html = '<div class="card"><div class="card-title">📋 Pedidos (' + pedidos.length + ')</div></div>';
    if (pedidos.length === 0) {
        html += '<div class="card"><div class="empty-state">Nenhum pedido</div></div>';
    } else {
        html += '<div class="item-list">';
        pedidos.forEach(function(p) {
            var data = new Date(p.created_at).toLocaleDateString('pt-BR');
            var corStatus = p.status === 'aberto' ? 'var(--warning)' : (p.status === 'finalizado' ? 'var(--success)' : 'var(--error)');
            var textoStatus = p.status === 'aberto' ? 'ENVIADO' : (p.status === 'finalizado' ? 'FINALIZADO' : 'DEVOLVIDO');            
            html += '<div class="item-card"><div class="item-info"><div class="item-name" style="font-size:16px;font-weight:700;color:var(--accent)">' + p.cliente_nome + '</div><div class="item-detail">Pedido #' + p.id.toString().substr(0,8) + ' • ' + data + '<br>' + p.itens + ' itens • R$ ' + parseFloat(p.total).toFixed(2).replace('.',',') + '</div></div><span style="color:' + corStatus + ';font-weight:600;font-size:12px">' + textoStatus + '</span></div>';
            html += '<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">';
            html += '<button class="btn btn-sm btn-primary" onclick="verPedido(\'' + p.id + '\')">Ver</button>';
            if (p.status === 'aberto') {
                html += '<button class="btn btn-sm btn-green" onclick="finalizarPedidoStatus(\'' + p.id + '\')">✅ Encerrar</button>';
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
    if (!confirm('Encerrar consignação deste pedido?\n\nIsso registrará os itens que o cliente ficou.')) return;
    
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
    
    toast('✅ Consignação encerrada!', 'success');
    mudarAba('orders');
}

async function devolverPedido(pedidoId) {
    var pedido = pedidos.find(function(p) { return p.id === pedidoId; });
    if (!pedido) {
        toast('Pedido não encontrado', 'error');
        return;
    }
    
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">↩️ Devolução</div>';
    html += '<div class="modal-sub" style="font-size:16px;font-weight:700;color:var(--accent);margin-bottom:4px">' + pedido.cliente_nome + '</div>';
    html += '<div class="modal-sub">Pedido #' + pedidoId.toString().substr(0,8) + '</div>';
    
    // Scanner
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
    html += '<div style="margin-bottom:12px"><strong>📷 Escanear Código de Barras</strong></div>';
    html += '<div style="display:flex;gap:8px">';
    html += '<input type="text" class="form-input" id="scanner-codigo-devolucao" placeholder="Digite ou escaneie o código" style="flex:1" onkeypress="if(event.key===\'Enter\')removerItemPorCodigo(\'' + pedidoId + '\')">';
    html += '<button class="btn btn-sm btn-primary" onclick="removerItemPorCodigo(\'' + pedidoId + '\')" style="margin:0;white-space:nowrap">Remover</button>';
    html += '</div>';
    html += '</div>';
    
    // Container para itens (será preenchido via JavaScript)
    html += '<div id="container-itens-devolucao">';
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
    html += '<p style="color:var(--text2);text-align:center;padding:20px">Carregando itens...</p>';
    html += '</div>';
    html += '</div>';
    
    html += '<button class="btn btn-outline" onclick="fecharModal()">Fechar</button>';
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
    
    // Carregar itens após mostrar modal
    setTimeout(function() {
        carregarItensParaDevolucao(pedidoId);
    }, 100);
}

async function carregarItensParaDevolucao(pedidoId) {
    var container = document.getElementById('container-itens-devolucao');
    if (!container) return;
    
    var itens = [];
    
    if (isOnline && supabaseClient) {
        try {
            var result = await supabaseClient
                .from('pedido_itens')
                .select('*')
                .eq('pedido_id', pedidoId)
                .order('created_at', { ascending: true });
            
            if (result.data && result.data.length > 0) {
                itens = result.data;
            }
        } catch(e) {
            console.error('Erro ao buscar itens:', e);
        }
    }
    
    if (itens.length === 0) {
        var pedido = pedidos.find(function(p) { return p.id === pedidoId; });
        if (pedido && pedido.itens_json) {
            try {
                itens = JSON.parse(pedido.itens_json);
            } catch(e) {}
        }
    }
    
    var html = '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
    html += '<div style="margin-bottom:12px"><strong>📦 Itens do Pedido (' + itens.length + ')</strong></div>';
    
    if (itens.length === 0) {
        html += '<p style="color:var(--warning);text-align:center;padding:20px">⚠️ Nenhum item encontrado</p>';
    } else {
        html += '<div class="item-list">';
        itens.forEach(function(item, idx) {
            var itemTotal = parseFloat(item.total || (item.preco * item.qtd) || 0).toFixed(2).replace('.',',');
            
            html += '<div data-item-id="' + (item.id || '') + '" style="background:#1a1a24;padding:12px;margin-bottom:8px;border-radius:8px">';
            html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
            html += '<div style="flex:1">';
            html += '<div style="font-weight:600;font-size:14px">' + (item.nome || 'Sem nome') + '</div>';
            html += '<div style="font-size:12px;color:#a0a0b0">Código: ' + (item.codigo || 'N/A') + '</div>';
            html += '</div>';
            html += '<div style="font-weight:700;color:#9b82fc;font-size:14px" data-item-total>R$ ' + itemTotal + '</div>';
            html += '</div>';
            
            html += '<div style="display:flex;align-items:center;justify-content:space-between">';
            html += '<div style="font-size:12px;color:#a0a0b0">R$ ' + parseFloat(item.preco || 0).toFixed(2).replace('.',',') + ' un</div>';
            html += '<div style="display:flex;align-items:center;gap:8px">';
            html += '<button onclick="alterarQuantidadeItem(\'' + pedidoId + '\', \'' + (item.id || '') + '\', -1)" style="width:36px;height:36px;background:#7c5cfc;color:#fff;border:none;border-radius:6px;font-size:20px;cursor:pointer;font-weight:700">−</button>';
            html += '<div data-item-qtd style="min-width:40px;text-align:center;font-weight:700;font-size:16px;color:#fff;background:#252530;padding:6px;border-radius:6px">' + (item.qtd || 0) + '</div>';
            html += '<button onclick="alterarQuantidadeItem(\'' + pedidoId + '\', \'' + (item.id || '') + '\', 1)" style="width:36px;height:36px;background:#7c5cfc;color:#fff;border:none;border-radius:6px;font-size:20px;cursor:pointer;font-weight:700">+</button>';
            html += '<button onclick="removerItemIndividual(\'' + pedidoId + '\', ' + idx + ', \'' + (item.id || '') + '\')" style="width:36px;height:36px;background:#ff1744;color:#fff;border:none;border-radius:6px;font-size:18px;cursor:pointer;margin-left:8px">🗑️</button>';
            html += '</div></div>';
            
            html += '</div>';
        });
        html += '</div>';
    }
    html += '</div>';
    
    container.innerHTML = html;
}

async function removerItemPorCodigo(pedidoId) {
    var codigo = document.getElementById('scanner-codigo-devolucao').value.trim();
    if (!codigo) {
        toast('Digite o código de barras', 'warning');
        return;
    }
    
    if (!isOnline || !supabaseClient) {
        toast('Apenas online', 'error');
        return;
    }
    
    try {
        // Buscar item pelo código
        var result = await supabaseClient
            .from('pedido_itens')
            .select('*')
            .eq('pedido_id', pedidoId)
            .eq('codigo', codigo)
            .limit(1);
        
        if (!result.data || result.data.length === 0) {
            toast('Item não encontrado', 'error');
            return;
        }
        
        var item = result.data[0];
        
        // Remover item
        var deleteResult = await supabaseClient
            .from('pedido_itens')
            .delete()
            .eq('id', item.id);
        
        if (deleteResult.error) {
            toast('Erro: ' + deleteResult.error.message, 'error');
            return;
        }
        
        // Buscar pedido atual
        var pedido = pedidos.find(function(p) { return p.id === pedidoId; });
        if (!pedido) {
            toast('Pedido não encontrado', 'error');
            return;
        }
        
        // Carregar histórico existente
        var historicoDevolucoes = [];
        if (pedido.historico_devolucoes) {
            try {
                historicoDevolucoes = JSON.parse(pedido.historico_devolucoes);
            } catch(e) {}
        }
        
        // ADICIONAR ITEM AO HISTÓRICO DE DEVOLUÇÕES
        historicoDevolucoes.push({
            data: new Date().toISOString(),
            itens: [{
                produto_id: item.produto_id,
                nome: item.nome,
                codigo: item.codigo,
                preco: parseFloat(item.preco) || 0,
                qtd: parseInt(item.qtd) || 1,
                total: parseFloat(item.total) || 0
            }],
            motivo: 'Devolução via scanner',
            tipo: 'devolucao'
        });
        
        // Atualizar pedido
        var pedido = pedidos.find(function(p) { return p.id === pedidoId; });
        if (pedido) {
            var novosItens = Math.max(0, pedido.itens - item.qtd);
            var novoTotal = Math.max(0, parseFloat(pedido.total) - parseFloat(item.total));
            
            await supabaseClient
                .from('pedidos')
                .update({ 
                    itens: novosItens,
                    total: novoTotal,
                    historico_devolucoes: JSON.stringify(historicoDevolucoes),
                    status: novosItens === 0 ? 'devolvido' : 'aberto'
                })
                .eq('id', pedidoId);
            
            await carregarDados();
        }
        
        toast('✅ Item devolvido: ' + item.nome, 'success');
        carregarItensParaDevolucao(pedidoId);
        
    } catch(e) {
        toast('Erro: ' + e.message, 'error');
        console.error(e);
    }
}

async function removerItemIndividual(pedidoId, idx, itemId) {
    if (!confirm('Deseja devolver este item?')) return;
    
    if (!isOnline || !supabaseClient || !itemId) {
        toast('Apenas online', 'error');
        return;
    }
    
    try {
        // Buscar item antes de remover
        var itemResult = await supabaseClient
            .from('pedido_itens')
            .select('*')
            .eq('id', itemId)
            .single();
        
        if (!itemResult.data) {
            toast('Item não encontrado', 'error');
            return;
        }
        
        var item = itemResult.data;
        
        // Remover item do banco
        var deleteResult = await supabaseClient
            .from('pedido_itens')
            .delete()
            .eq('id', itemId);
        
        if (deleteResult.error) {
            toast('Erro: ' + deleteResult.error.message, 'error');
            return;
        }
        
        // Buscar pedido atual
        var pedido = pedidos.find(function(p) { return p.id === pedidoId; });
        if (!pedido) {
            toast('Pedido não encontrado', 'error');
            return;
        }
        
        // Carregar histórico existente
        var historicoDevolucoes = [];
        if (pedido.historico_devolucoes) {
            try {
                historicoDevolucoes = JSON.parse(pedido.historico_devolucoes);
            } catch(e) {
                console.error('Erro ao parsear histórico:', e);
            }
        }
        
        // ADICIONAR ITEM AO HISTÓRICO DE DEVOLUÇÕES
        historicoDevolucoes.push({
            data: new Date().toISOString(),
            itens: [{
                produto_id: item.produto_id,
                nome: item.nome,
                codigo: item.codigo,
                preco: parseFloat(item.preco) || 0,
                qtd: parseInt(item.qtd) || 1,
                total: parseFloat(item.total) || 0
            }],
            motivo: 'Devolução manual',
            tipo: 'devolucao'
        });
        
        console.log('📋 Histórico atualizado:', historicoDevolucoes);
        
        // Calcular novos totais
        var novosItensCount = Math.max(0, (parseInt(pedido.itens) || 0) - (parseInt(item.qtd) || 1));
        var novoTotal = Math.max(0, parseFloat(pedido.total) - parseFloat(item.total));
        
        // Atualizar pedido COM histórico
        var updateData = {
            itens: novosItensCount,
            total: novoTotal,
            historico_devolucoes: JSON.stringify(historicoDevolucoes),
            status: novosItensCount === 0 ? 'devolvido' : 'aberto'
        };
        
        console.log('📝 Atualizando pedido:', updateData);
        
        await supabaseClient
            .from('pedidos')
            .update(updateData)
            .eq('id', pedidoId);
        
        await carregarDados();
        
        toast('✅ Item devolvido e registrado!', 'success');
        carregarItensParaDevolucao(pedidoId);
        
    } catch(e) {
        toast('Erro: ' + e.message, 'error');
        console.error('❌ Erro ao remover item:', e);
    }
}

async function alterarQuantidadeItem(pedidoId, itemId, delta) {
    if (!isOnline || !supabaseClient || !itemId) {
        toast('Apenas online', 'error');
        return;
    }
    
    try {
        // Buscar item atual
        var itemResult = await supabaseClient
            .from('pedido_itens')
            .select('*')
            .eq('id', itemId)
            .single();
        
        if (!itemResult.data) {
            toast('Item não encontrado', 'error');
            return;
        }
        
        var item = itemResult.data;
        var qtdAtual = parseInt(item.qtd) || 0;
        var novaQtd = qtdAtual + delta;
        
        // Se quantidade chegar a 0 ou menos, remover item
        if (novaQtd <= 0) {
            if (!confirm('Remover este item completamente?')) return;
            await removerItemIndividual(pedidoId, 0, itemId);
            return;
        }
        
        // Calcular novo total
        var precoUnitario = parseFloat(item.preco) || 0;
        var novoTotal = novaQtd * precoUnitario;
        
        // Atualizar item no banco
        var updateResult = await supabaseClient
            .from('pedido_itens')
            .update({ 
                qtd: novaQtd,
                total: novoTotal
            })
            .eq('id', itemId);
        
        if (updateResult.error) {
            toast('Erro: ' + updateResult.error.message, 'error');
            return;
        }
        
        // Atualizar total do pedido
        var pedido = pedidos.find(function(p) { return p.id === pedidoId; });
        if (pedido) {
            var totalAntigo = parseFloat(item.total) || 0;
            var diferencaTotal = novoTotal - totalAntigo;
            var novoTotalPedido = parseFloat(pedido.total) + diferencaTotal;
            
            await supabaseClient
                .from('pedidos')
                .update({ 
                    total: novoTotalPedido
                })
                .eq('id', pedidoId);
            
            await carregarDados();
        }
        
        // ATUALIZAR VISUALMENTE (sem recarregar tudo)
        var itemContainer = document.querySelector('[data-item-id="' + itemId + '"]');
        if (itemContainer) {
            // Atualizar quantidade
            var qtdDisplay = itemContainer.querySelector('[data-item-qtd]');
            if (qtdDisplay) {
                qtdDisplay.textContent = novaQtd;
            }
            
            // Atualizar valor total
            var totalDisplay = itemContainer.querySelector('[data-item-total]');
            if (totalDisplay) {
                totalDisplay.textContent = 'R$ ' + novoTotal.toFixed(2).replace('.',',');
            }
        }
        
        toast('✅ Qtd: ' + novaQtd + ' • R$ ' + novoTotal.toFixed(2).replace('.',','), 'success');
        
    } catch(e) {
        toast('Erro: ' + e.message, 'error');
        console.error(e);
    }
}

async function confirmarDevolucao(pedidoId) {
    toast('Use os botões 🗑️ para remover itens', 'warning');
}

function verPedido(pedidoId) {
    var pedido = pedidos.find(function(p) { return p.id === pedidoId; });
    if (!pedido) return;
    
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">📋 Pedido #' + pedidoId.toString().substr(0,8) + '</div>';
    html += '<div class="modal-sub" style="font-size:16px;font-weight:700;color:var(--accent);margin-bottom:4px">' + pedido.cliente_nome + '</div>';
    html += '<div class="modal-sub">Pedido #' + pedidoId.toString().substr(0,8) + ' - ' + new Date(pedido.created_at).toLocaleDateString('pt-BR') + '</div>';
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Status:</span><strong style="color:' + (pedido.status === 'aberto' ? 'var(--warning)' : 'var(--success)') + '">' + pedido.status.toUpperCase() + '</strong></div>';
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Itens:</span><strong>' + pedido.itens + '</strong></div>';
    html += '<div style="display:flex;justify-content:space-between"><span>Total:</span><strong style="color:var(--accent);font-size:18px">R$ ' + parseFloat(pedido.total).toFixed(2).replace('.',',') + '</strong></div>';
    html += '</div>';
    
    // Container para itens
    html += '<div id="container-itens-ver-pedido"></div>';
    
    html += '<button class="btn btn-primary" onclick="gerarPDFPedidoPorId(\'' + pedidoId + '\')">📄 Gerar PDF</button>';
    html += '<button class="btn btn-outline" onclick="fecharModal()">Fechar</button>';
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
    
    // Carregar itens
    setTimeout(function() {
        carregarItensParaVerPedido(pedidoId);
    }, 100);
}

async function carregarItensParaVerPedido(pedidoId) {
    var container = document.getElementById('container-itens-ver-pedido');
    if (!container) return;
    
    var itens = [];
    
    if (isOnline && supabaseClient) {
        try {
            var result = await supabaseClient
                .from('pedido_itens')
                .select('*')
                .eq('pedido_id', pedidoId)
                .order('created_at', { ascending: true });
            
            if (result.data && result.data.length > 0) {
                itens = result.data;
            }
        } catch(e) {
            console.error('Erro ao buscar itens:', e);
        }
    }
    
    if (itens.length === 0) {
        var pedido = pedidos.find(function(p) { return p.id === pedidoId; });
        if (pedido && pedido.itens_json) {
            try {
                itens = JSON.parse(pedido.itens_json);
            } catch(e) {}
        }
    }
    
    if (itens.length > 0) {
        var html = '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
        html += '<div style="margin-bottom:12px"><strong>📦 Itens do Pedido</strong></div>';
        html += '<div class="item-list">';
        itens.forEach(function(item) {
            html += '<div class="item-card"><div class="item-info"><div class="item-name">' + (item.nome || 'Sem nome') + '</div><div class="item-detail">' + (item.qtd || 0) + 'x R$ ' + parseFloat(item.preco || 0).toFixed(2).replace('.',',') + '</div></div><div style="font-weight:700;color:var(--accent)">R$ ' + parseFloat(item.total || 0).toFixed(2).replace('.',',') + '</div></div>';
        });
        html += '</div></div>';
        container.innerHTML = html;
    }
}

function gerarPDFPedidoPorId(pedidoId) {
    var pedido = pedidos.find(function(p) { return p.id === pedidoId; });
    if (pedido) gerarPDFPedido(pedido);
}

// ============ HISTÓRICO ============

function renderizarHistorico() {
    var finalizados = pedidos.filter(function(p) { return p.status === 'finalizado'; });
    var devolvidos = pedidos.filter(function(p) { return p.status === 'devolvido'; });
    
    // Contar pedidos COM histórico de devoluções
    var pedidosComDevolucao = 0;
    var totalItensDevolvidos = 0;
    
    pedidos.forEach(function(p) {
        if (p.historico_devolucoes) {
            try {
                var historico = JSON.parse(p.historico_devolucoes);
                if (historico && historico.length > 0) {
                    pedidosComDevolucao++;
                    historico.forEach(function(dev) {
                        if (dev.itens) {
                            dev.itens.forEach(function(item) {
                                totalItensDevolvidos += (item.qtd || 0);
                            });
                        }
                    });
                }
            } catch(e) {}
        }
    });
    
    var html = '<div class="card"><div class="card-title">📊 Resumo</div>';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">';
    html += '<div class="card" style="background:var(--bg3);padding:16px;text-align:center"><div style="font-size:24px;font-weight:700;color:var(--success)">' + finalizados.length + '</div><div style="font-size:12px;color:var(--text2)">Vendas</div></div>';
    html += '<div class="card" style="background:var(--bg3);padding:16px;text-align:center"><div style="font-size:24px;font-weight:700;color:var(--warning)">' + totalItensDevolvidos + '</div><div style="font-size:12px;color:var(--text2)">Itens Devolvidos</div></div>';
    html += '<div class="card" style="background:var(--bg3);padding:16px;text-align:center"><div style="font-size:24px;font-weight:700;color:var(--accent)">' + pedidos.length + '</div><div style="font-size:12px;color:var(--text2)">Total Pedidos</div></div>';
    html += '</div></div>';
    
    var totalGeral = 0;
    finalizados.forEach(function(p) { totalGeral += parseFloat(p.total); });
    
    html += '<div class="card" style="background:var(--bg3);padding:16px"><div style="display:flex;justify-content:space-between"><span>Faturamento:</span><strong style="color:var(--accent);font-size:18px">R$ ' + totalGeral.toFixed(2).replace('.',',') + '</strong></div></div>';
    
    // Agrupar pedidos por cliente
    var pedidosPorCliente = {};
    pedidos.forEach(function(p) {
        if (!pedidosPorCliente[p.cliente_nome]) {
            pedidosPorCliente[p.cliente_nome] = [];
        }
        pedidosPorCliente[p.cliente_nome].push(p);
    });
    
    html += '<div class="card"><div class="card-title">📋 Todos os Pedidos por Cliente</div>';
    if (Object.keys(pedidosPorCliente).length === 0) {
        html += '<div class="empty-state">Nenhum pedido</div>';
    } else {
        html += '<div class="item-list">';
        
        // Ordenar clientes alfabeticamente
        var clientesOrdenados = Object.keys(pedidosPorCliente).sort();
        
        clientesOrdenados.forEach(function(nomeCliente) {
            var pedidosDoCliente = pedidosPorCliente[nomeCliente];
            var totalItensCliente = 0;
            var totalValorCliente = 0;
            var totalDevolvidoCliente = 0;
            
            // Calcular totais do cliente
            pedidosDoCliente.forEach(function(p) {
                totalItensCliente += parseInt(p.itens) || 0;
                totalValorCliente += parseFloat(p.total) || 0;
                
                // Somar itens devolvidos deste cliente
                if (p.historico_devolucoes) {
                    try {
                        var historico = JSON.parse(p.historico_devolucoes);
                        if (historico) {
                            historico.forEach(function(dev) {
                                if (dev.itens) {
                                    dev.itens.forEach(function(item) {
                                        totalDevolvidoCliente += (item.qtd || 0);
                                    });
                                }
                            });
                        }
                    } catch(e) {}
                }
            });
            
            // Card do cliente com resumo
            html += '<div style="background:var(--bg3);padding:16px;margin-bottom:16px;border-radius:12px">';
            html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">';
            html += '<div style="font-size:18px;font-weight:700;color:var(--accent)">' + nomeCliente + '</div>';
            html += '<div style="font-size:12px;color:var(--text2)">' + pedidosDoCliente.length + ' pedido(s)</div>';
            html += '</div>';
            
            html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px">';
            html += '<div style="background:var(--bg);padding:8px;border-radius:6px;text-align:center">';
            html += '<div style="font-size:11px;color:var(--text2)">Total Itens</div>';
            html += '<div style="font-weight:700;color:var(--success)">' + totalItensCliente + 'x</div>';
            html += '</div>';
            html += '<div style="background:var(--bg);padding:8px;border-radius:6px;text-align:center">';
            html += '<div style="font-size:11px;color:var(--text2)">Devolvidos</div>';
            html += '<div style="font-weight:700;color:var(--warning)">' + totalDevolvidoCliente + 'x</div>';
            html += '</div>';
            html += '<div style="background:var(--bg);padding:8px;border-radius:6px;text-align:center">';
            html += '<div style="font-size:11px;color:var(--text2)">Valor Total</div>';
            html += '<div style="font-weight:700;color:var(--accent)">R$ ' + totalValorCliente.toFixed(2).replace('.',',') + '</div>';
            html += '</div>';
            html += '</div>';
            
            // Lista de pedidos do cliente
            html += '<div style="border-top:1px solid var(--border);padding-top:12px">';
            pedidosDoCliente.forEach(function(p) {
                var data = new Date(p.created_at).toLocaleDateString('pt-BR');
                var corStatus = p.status === 'aberto' ? 'var(--warning)' : (p.status === 'finalizado' ? 'var(--success)' : 'var(--error)');
                var textoStatus = p.status === 'aberto' ? 'ENVIADO' : (p.status === 'finalizado' ? 'FINALIZADO' : 'DEVOLVIDO');
                
                html += '<div class="item-card" onclick="verDetalhesPedidoHistorico(\'' + p.id + '\')" style="cursor:pointer;margin-bottom:8px">';
                html += '<div class="item-info">';
                html += '<div class="item-name" style="font-size:14px">Pedido #' + p.id.toString().substr(0,8) + ' • ' + data + '</div>';
                html += '<div class="item-detail">' + p.itens + ' itens • R$ ' + parseFloat(p.total).toFixed(2).replace('.',',') + '</div>';
                html += '</div>';
                html += '<span style="color:' + corStatus + ';font-weight:600;font-size:12px">' + textoStatus + '</span>';
                html += '</div>';
            });
            html += '</div>';
            
            html += '</div>';
        });
        
        html += '</div>';
    }
    html += '</div>';
    
    return html;
}

async function verDetalhesPedidoHistorico(pedidoId) {
    var pedido = pedidos.find(function(p) { return p.id === pedidoId; });
    if (!pedido) return;
    
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">📋 Detalhes do Pedido</div>';
    html += '<div class="modal-sub" style="font-size:16px;font-weight:700;color:var(--accent);margin-bottom:4px">' + pedido.cliente_nome + '</div>';
    html += '<div class="modal-sub">Pedido #' + pedidoId.toString().substr(0,8) + '</div>';
    
    // Informações básicas
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">';
    html += '<div><div style="font-size:12px;color:var(--text2)">Data</div><div style="font-weight:600">' + new Date(pedido.created_at).toLocaleDateString('pt-BR') + '</div></div>';
    html += '<div><div style="font-size:12px;color:var(--text2)">Status</div><div style="font-weight:600;color:' + (pedido.status === 'finalizado' ? 'var(--success)' : 'var(--error)') + '">' + pedido.status.toUpperCase() + '</div></div>';
    html += '<div><div style="font-size:12px;color:var(--text2)">Total</div><div style="font-weight:700;color:var(--accent);font-size:18px">R$ ' + parseFloat(pedido.total).toFixed(2).replace('.',',') + '</div></div>';
    html += '<div><div style="font-size:12px;color:var(--text2)">Itens</div><div style="font-weight:600">' + pedido.itens + ' unidades</div></div>';
    html += '</div></div>';
    
    // Carregar itens vendidos
    var itensVendidos = [];
    var historicoDevolucoes = [];
    
    if (isOnline && supabaseClient) {
        try {
            var result = await supabaseClient
                .from('pedido_itens')
                .select('*')
                .eq('pedido_id', pedidoId)
                .order('created_at', { ascending: true });
            
            if (result.data) {
                itensVendidos = result.data;
            }
            
            if (pedido.historico_devolucoes) {
                historicoDevolucoes = JSON.parse(pedido.historico_devolucoes);
            }
        } catch(e) {
            console.error('Erro ao buscar detalhes:', e);
        }
    }
    
    // Calcular totais de devolução - USANDO CÓDIGO E NOME
    var totalDevolvido = 0;
    var itensDevolvidosMap = {};
    
    historicoDevolucoes.forEach(function(dev) {
        if (dev.itens) {
            dev.itens.forEach(function(itemDev) {
                // Criar chave com código E nome para garantir correspondência
                var codigoKey = 'cod_' + (itemDev.codigo || '');
                var nomeKey = 'nome_' + (itemDev.nome || '').toLowerCase().trim();
                var produtoIdKey = 'id_' + (itemDev.produto_id || '');
                
                if (!itensDevolvidosMap[codigoKey]) itensDevolvidosMap[codigoKey] = 0;
                if (!itensDevolvidosMap[nomeKey]) itensDevolvidosMap[nomeKey] = 0;
                if (!itensDevolvidosMap[produtoIdKey]) itensDevolvidosMap[produtoIdKey] = 0;
                
                itensDevolvidosMap[codigoKey] += (itemDev.qtd || 0);
                itensDevolvidosMap[nomeKey] += (itemDev.qtd || 0);
                itensDevolvidosMap[produtoIdKey] += (itemDev.qtd || 0);
                
                totalDevolvido += parseFloat(itemDev.total || 0);
            });
        }
    });
    
    console.log('🔍 Itens devolvidos map:', itensDevolvidosMap);
    
    // Mostrar itens vendidos
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
    html += '<div style="margin-bottom:12px"><strong>📦 Itens Vendidos (' + itensVendidos.length + ')</strong></div>';
    
    if (itensVendidos.length === 0) {
        html += '<p style="color:var(--text2);text-align:center;padding:20px">Nenhum item encontrado</p>';
    } else {
        html += '<div class="item-list">';
        itensVendidos.forEach(function(item) {
            var qtdVendida = parseInt(item.qtd) || 0;
            
            // Buscar quantidade devolvida usando múltiplas chaves
            var qtdDevolvida = 0;
            qtdDevolvida += (itensDevolvidosMap['cod_' + (item.codigo || '')] || 0);
            qtdDevolvida += (itensDevolvidosMap['nome_' + (item.nome || '').toLowerCase().trim()] || 0);
            qtdDevolvida += (itensDevolvidosMap['id_' + (item.produto_id || '')] || 0);
            
            // Evitar contar duplicado se as chaves forem iguais
            if (qtdDevolvida > qtdVendida) qtdDevolvida = qtdVendida;
            
            var qtdRestante = qtdVendida - qtdDevolvida;
            var itemTotal = parseFloat(item.total) || (parseFloat(item.preco) * qtdVendida) || 0;
            
            console.log('📊 Item:', item.nome, '| Vendido:', qtdVendida, '| Devolvido:', qtdDevolvida, '| Restante:', qtdRestante);
            
            html += '<div style="background:#1a1a24;padding:12px;margin-bottom:8px;border-radius:8px">';
            html += '<div style="font-weight:600;font-size:14px;margin-bottom:4px">' + (item.nome || 'Sem nome') + '</div>';
            html += '<div style="font-size:12px;color:#a0a0b0;margin-bottom:8px">Código: ' + (item.codigo || 'N/A') + '</div>';
            
            html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:8px">';
            html += '<div style="background:#252530;padding:8px;border-radius:6px;text-align:center">';
            html += '<div style="font-size:11px;color:var(--text2)">Vendido</div>';
            html += '<div style="font-weight:700;color:var(--success);font-size:16px">' + qtdVendida + 'x</div>';
            html += '</div>';
            
            html += '<div style="background:#252530;padding:8px;border-radius:6px;text-align:center">';
            html += '<div style="font-size:11px;color:var(--text2)">Devolvido</div>';
            html += '<div style="font-weight:700;color:' + (qtdDevolvida > 0 ? 'var(--warning)' : 'var(--text2)') + ';font-size:16px">' + qtdDevolvida + 'x</div>';
            html += '</div>';
            
            html += '<div style="background:#252530;padding:8px;border-radius:6px;text-align:center">';
            html += '<div style="font-size:11px;color:var(--text2)">Restante</div>';
            html += '<div style="font-weight:700;color:var(--accent);font-size:16px">' + qtdRestante + 'x</div>';
            html += '</div>';
            html += '</div>';
            
            html += '<div style="display:flex;justify-content:space-between;margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">';
            html += '<div style="font-size:12px;color:var(--text2)">R$ ' + parseFloat(item.preco || 0).toFixed(2).replace('.',',') + ' un</div>';
            html += '<div style="font-weight:700;color:var(--accent)">R$ ' + itemTotal.toFixed(2).replace('.',',') + '</div>';
            html += '</div>';
            
            html += '</div>';
        });
        html += '</div>';
    }
    html += '</div>';
    
    // Mostrar histórico de devoluções
    if (historicoDevolucoes.length > 0) {
        html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
        html += '<div style="margin-bottom:12px"><strong>↩️ Histórico de Devoluções (' + historicoDevolucoes.length + ' itens)</strong></div>';
        historicoDevolucoes.forEach(function(dev, idx) {
            var data = new Date(dev.data).toLocaleString('pt-BR');
            html += '<div style="background:#1a1a24;padding:12px;margin-bottom:8px;border-radius:8px">';
            html += '<div style="font-size:11px;color:var(--text2);margin-bottom:8px">' + data + (dev.motivo ? ' • ' + dev.motivo : '') + '</div>';
            if (dev.itens) {
                dev.itens.forEach(function(item) {
                    html += '<div style="font-size:13px;margin:4px 0;color:var(--warning)">• ' + item.nome + ' (Qtd: ' + item.qtd + ' • R$ ' + parseFloat(item.total || 0).toFixed(2).replace('.',',') + ')</div>';
                });
            }
            html += '</div>';
        });
        html += '</div>';
    }
    
    // Resumo final
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Total Vendido:</span><strong style="color:var(--success)">R$ ' + parseFloat(pedido.total).toFixed(2).replace('.',',') + '</strong></div>';
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Total Devolvido:</span><strong style="color:var(--warning)">R$ ' + totalDevolvido.toFixed(2).replace('.',',') + '</strong></div>';
    html += '<div style="display:flex;justify-content:space-between;padding-top:12px;border-top:2px solid var(--border)"><span>Líquido:</span><strong style="color:var(--accent);font-size:18px">R$ ' + (parseFloat(pedido.total) - totalDevolvido).toFixed(2).replace('.',',') + '</strong></div>';
    html += '</div>';
    
    html += '<button class="btn btn-primary" onclick="gerarPDFPedidoPorId(\'' + pedidoId + '\')">📄 Gerar PDF</button>';
    html += '<button class="btn btn-outline" onclick="fecharModal()">Fechar</button>';
    
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
}

console.log('✅ Orders.js carregado');
