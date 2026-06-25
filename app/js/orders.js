// ============ PEDIDOS E HISTÓRICO ============

var html5QrCodeDevolucao = null;

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
                // 🔥 Botão Editar (apenas para pedidos abertos)
                html += '<button class="btn btn-sm btn-outline" onclick="editarPedido(\'' + p.id + '\')">✏️ Editar</button>';
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

// 🔥 NOVA FUNÇÃO: Editar Pedido
function editarPedido(pedidoId) {
    var pedido = pedidos.find(function(p) { return p.id === pedidoId; });
    if (!pedido) {
        toast('Pedido não encontrado', 'error');
        return;
    }
    
    // Buscar itens do pedido
    var itens = [];
    if (isOnline && supabaseClient) {
        supabaseClient
            .from('pedido_itens')
            .select('*')
            .eq('pedido_id', pedidoId)
            .then(function(result) {
                if (result.data && result.data.length > 0) {
                    itens = result.data;
                    carregarPedidoParaEdicao(pedido, itens);
                } else {
                    // Fallback para itens_json
                    if (pedido.itens_json) {
                        try {
                            itens = JSON.parse(pedido.itens_json);
                        } catch(e) {}
                    }
                    carregarPedidoParaEdicao(pedido, itens);
                }
            });
    } else {
        // Offline
        if (pedido.itens_json) {
            try {
                itens = JSON.parse(pedido.itens_json);
            } catch(e) {}
        }
        carregarPedidoParaEdicao(pedido, itens);
    }
}

function carregarPedidoParaEdicao(pedido, itens) {
    // 1. Encontrar o cliente
    var cliente = clientes.find(function(c) { return c.id === pedido.cliente_id; });
    if (!cliente) {
        toast('Cliente não encontrado', 'error');
        return;
    }
    
    // 2. Configurar as variáveis globais da venda
    clienteAtual = cliente;
    pedidoItens = itens.map(function(item) {
        return {
            produto_id: item.produto_id || item.id,
            nome: item.nome,
            codigo: item.codigo,
            preco: parseFloat(item.preco) || 0,
            qtd: parseInt(item.qtd) || 1
        };
    });
    pedidoEmEdicao = pedido.id; // 🔥 Marca o ID do pedido que será atualizado
    
    // 3. Ir para a aba de venda e renderizar
    toast('Editando pedido de ' + cliente.nome, 'success');
    mudarAba('scan');
}

async function finalizarPedidoStatus(pedidoId) {
    confirmar('Encerrar Consignação', 'Encerrar consignação deste pedido?\n\nIsso registrará os itens que o cliente ficou.', function(confirmed) {
        if (!confirmed) return;
        
        (async function() {
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
            rolarParaTopo();
        })();
    });
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
    
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
    html += '<div style="margin-bottom:12px"><strong>📷 Escanear Código de Barras</strong></div>';
    html += '<div style="display:flex;gap:8px">';
    html += '<input type="text" class="form-input" id="scanner-codigo-devolucao" placeholder="Digite ou escaneie o código" style="flex:1" inputmode="none" autocomplete="off" onkeypress="if(event.key===\'Enter\')removerItemPorCodigo(\'' + pedidoId + '\')">';
    html += '<button class="btn btn-sm btn-primary" onclick="abrirScannerDevolucao(\'' + pedidoId + '\')" style="margin:0;white-space:nowrap;font-size:18px">📷</button>';
    html += '<button class="btn btn-sm btn-primary" onclick="removerItemPorCodigo(\'' + pedidoId + '\')" style="margin:0;white-space:nowrap">Remover</button>';
    html += '</div>';
    html += '<div id="scanner-reader-devolucao" style="width:100%;margin-top:12px;display:none"></div>';
    html += '</div>';
    
    html += '<div id="container-itens-devolucao">';
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
    html += '<p style="color:var(--text2);text-align:center;padding:20px">Carregando itens...</p>';
    html += '</div>';
    html += '</div>';
    
    html += '<button class="btn btn-outline" onclick="fecharModal()">Fechar</button>';
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
    
    setTimeout(function() {
        carregarItensParaDevolucao(pedidoId);
    }, 100);
}

function abrirScannerDevolucao(pedidoId) {
    var readerDiv = document.getElementById('scanner-reader-devolucao');
    if (!readerDiv) return;

    if (html5QrCodeDevolucao) {
        html5QrCodeDevolucao.stop();
        html5QrCodeDevolucao = null;
    }

    readerDiv.style.display = 'block';

    html5QrCodeDevolucao = new Html5Qrcode("scanner-reader-devolucao");
    html5QrCodeDevolucao.start(
        { facingMode: "environment" }, 
        { fps: 5, qrbox: { width: 250, height: 250 } }, 
        function(decodedText) {
            var input = document.getElementById('scanner-codigo-devolucao');
            if (input) {
                input.value = decodedText;
                removerItemPorCodigo(pedidoId);
            }
        }
    ).catch(function(err) {
        console.warn('Erro ao iniciar scanner de devolução:', err);
        toast('Erro ao acessar a câmera.', 'error');
    });
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
        
        var deleteResult = await supabaseClient
            .from('pedido_itens')
            .delete()
            .eq('id', item.id);
        
        if (deleteResult.error) {
            toast('Erro: ' + deleteResult.error.message, 'error');
            return;
        }
        
        var pedido = pedidos.find(function(p) { return p.id === pedidoId; });
        if (!pedido) {
            toast('Pedido não encontrado', 'error');
            return;
        }
        
        var historicoDevolucoes = [];
        if (pedido.historico_devolucoes) {
            try {
                historicoDevolucoes = JSON.parse(pedido.historico_devolucoes);
            } catch(e) {}
        }
        
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
    confirmar('Devolver Item', 'Deseja devolver este item?', function(confirmed) {
        if (!confirmed) return;
        
        (async function() {
            if (!isOnline || !supabaseClient || !itemId) {
                toast('Apenas online', 'error');
                return;
            }
            
            try {
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
                
                var deleteResult = await supabaseClient
                    .from('pedido_itens')
                    .delete()
                    .eq('id', itemId);
                
                if (deleteResult.error) {
                    toast('Erro: ' + deleteResult.error.message, 'error');
                    return;
                }
                
                var pedido = pedidos.find(function(p) { return p.id === pedidoId; });
                if (!pedido) {
                    toast('Pedido não encontrado', 'error');
                    return;
                }
                
                var historicoDevolucoes = [];
                if (pedido.historico_devolucoes) {
                    try {
                        historicoDevolucoes = JSON.parse(pedido.historico_devolucoes);
                    } catch(e) {
                        console.error('Erro ao parsear histórico:', e);
                    }
                }
                
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
                
                var novosItensCount = Math.max(0, (parseInt(pedido.itens) || 0) - (parseInt(item.qtd) || 1));
                var novoTotal = Math.max(0, parseFloat(pedido.total) - parseFloat(item.total));
                
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
        })();
    });
}

async function alterarQuantidadeItem(pedidoId, itemId, delta) {
    if (!isOnline || !supabaseClient || !itemId) {
        toast('Apenas online', 'error');
        return;
    }
    
    try {
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
        
        if (novaQtd <= 0) {
            confirmar('Remover Item', 'Remover este item completamente?', function(confirmed) {
                if (!confirmed) return;
                removerItemIndividual(pedidoId, 0, itemId);
            });
            return;
        }
        
        if (novaQtd < qtdAtual) {
            var qtdDevolvida = qtdAtual - novaQtd;
            
            var pedido = pedidos.find(function(p) { return p.id === pedidoId; });
            if (!pedido) {
                toast('Pedido não encontrado', 'error');
                return;
            }
            
            var historicoDevolucoes = [];
            if (pedido.historico_devolucoes) {
                try {
                    historicoDevolucoes = JSON.parse(pedido.historico_devolucoes);
                } catch(e) {}
            }
            
            historicoDevolucoes.push({
                data: new Date().toISOString(),
                itens: [{
                    produto_id: item.produto_id,
                    nome: item.nome,
                    codigo: item.codigo,
                    preco: parseFloat(item.preco) || 0,
                    qtd: qtdDevolvida,
                    total: qtdDevolvida * (parseFloat(item.preco) || 0)
                }],
                motivo: 'Redução de quantidade (de ' + qtdAtual + ' para ' + novaQtd + ')',
                tipo: 'devolucao_parcial'
            });
            
            console.log('📋 Devolução parcial registrada:', qtdDevolvida + 'x ' + item.nome);
            
            var precoUnitario = parseFloat(item.preco) || 0;
            var novoTotalItem = novaQtd * precoUnitario;
            
            var totalAntigo = parseFloat(item.total) || 0;
            var diferencaTotal = novoTotalItem - totalAntigo;
            var novoTotalPedido = parseFloat(pedido.total) + diferencaTotal;
            
            await supabaseClient
                .from('pedido_itens')
                .update({ 
                    qtd: novaQtd,
                    total: novoTotalItem
                })
                .eq('id', itemId);
            
            await supabaseClient
                .from('pedidos')
                .update({ 
                    total: novoTotalPedido,
                    historico_devolucoes: JSON.stringify(historicoDevolucoes)
                })
                .eq('id', pedidoId);
            
            await carregarDados();
            
            var itemContainer = document.querySelector('[data-item-id="' + itemId + '"]');
            if (itemContainer) {
                var qtdDisplay = itemContainer.querySelector('[data-item-qtd]');
                if (qtdDisplay) {
                    qtdDisplay.textContent = novaQtd;
                }
                
                var totalDisplay = itemContainer.querySelector('[data-item-total]');
                if (totalDisplay) {
                    totalDisplay.textContent = 'R$ ' + novoTotalItem.toFixed(2).replace('.',',');
                }
            }
            
            toast('✅ Qtd reduzida: ' + qtdDevolvida + 'x devolvido(s)', 'success');
            return;
        }
        
        var precoUnitario = parseFloat(item.preco) || 0;
        var novoTotal = novaQtd * precoUnitario;
        
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
        
        var itemContainer = document.querySelector('[data-item-id="' + itemId + '"]');
        if (itemContainer) {
            var qtdDisplay = itemContainer.querySelector('[data-item-qtd]');
            if (qtdDisplay) {
                qtdDisplay.textContent = novaQtd;
            }
            
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
    
    html += '<div id="container-itens-ver-pedido"></div>';
    
    html += '<button class="btn btn-primary" onclick="gerarPDFPedidoPorId(\'' + pedidoId + '\')">📄 Gerar PDF</button>';
    html += '<button class="btn btn-outline" onclick="fecharModal()">Fechar</button>';
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
    
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
    
    var historicoDevolucoes = [];
    var pedido = pedidos.find(function(p) { return p.id === pedidoId; });
    if (pedido && pedido.historico_devolucoes) {
        try {
            historicoDevolucoes = JSON.parse(pedido.historico_devolucoes);
        } catch(e) {}
    }
    
    var itensDevolvidosMap = {};
    historicoDevolucoes.forEach(function(dev) {
        if (dev.itens) {
            dev.itens.forEach(function(itemDev) {
                var chave = (itemDev.codigo || '') + '_' + (itemDev.nome || '').toLowerCase().trim();
                if (!itensDevolvidosMap[chave]) itensDevolvidosMap[chave] = 0;
                itensDevolvidosMap[chave] += (itemDev.qtd || 0);
            });
        }
    });
    
    var totalItensRestantes = 0;
    itens.forEach(function(item) {
        var qtdOriginal = parseInt(item.qtd) || 0;
        var chave = (item.codigo || '') + '_' + (item.nome || '').toLowerCase().trim();
        var qtdDevolvida = itensDevolvidosMap[chave] || 0;
        var qtdRestante = qtdOriginal - qtdDevolvida;
        if (qtdRestante > 0) {
            totalItensRestantes += qtdRestante;
        }
    });
    
    if (itens.length > 0) {
        var html = '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
        html += '<div style="margin-bottom:12px"><strong>📦 Itens do Pedido (' + totalItensRestantes + ')</strong></div>';
        html += '<div class="item-list">';
        itens.forEach(function(item) {
            var qtdOriginal = parseInt(item.qtd) || 0;
            var chave = (item.codigo || '') + '_' + (item.nome || '').toLowerCase().trim();
            var qtdDevolvida = itensDevolvidosMap[chave] || 0;
            var qtdAtual = qtdOriginal - qtdDevolvida;
            
            if (qtdAtual > 0) {
                html += '<div class="item-card"><div class="item-info"><div class="item-name">' + (item.nome || 'Sem nome') + '</div><div class="item-detail">' + qtdAtual + 'x R$ ' + parseFloat(item.preco || 0).toFixed(2).replace('.',',');
                if (qtdDevolvida > 0) {
                    html += ' <span style="color:var(--warning);font-size:11px">(Devolvido: ' + qtdDevolvida + 'x)</span>';
                }
                html += '</div></div><div style="font-weight:700;color:var(--accent)">R$ ' + parseFloat(item.total || 0).toFixed(2).replace('.',',') + '</div></div>';
            }
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
    
    var totalItensDevolvidos = 0;
    pedidos.forEach(function(p) {
        if (p.historico_devolucoes) {
            try {
                var historico = JSON.parse(p.historico_devolucoes);
                if (historico) {
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
    
    var pedidosPorCliente = {};
    pedidos.forEach(function(p) {
        if (!pedidosPorCliente[p.cliente_nome]) {
            pedidosPorCliente[p.cliente_nome] = [];
        }
        pedidosPorCliente[p.cliente_nome].push(p);
    });
    
    html += '<div class="card"><div class="card-title">👥 Clientes</div>';
    if (Object.keys(pedidosPorCliente).length === 0) {
        html += '<div class="empty-state">Nenhum cliente</div>';
    } else {
        html += '<div class="item-list">';
        
        var clientesOrdenados = Object.keys(pedidosPorCliente).sort();
        
        clientesOrdenados.forEach(function(nomeCliente) {
            var pedidosDoCliente = pedidosPorCliente[nomeCliente];
            var totalItensCliente = 0;
            var totalValorCliente = 0;
            var totalDevolvidoCliente = 0;
            
            pedidosDoCliente.forEach(function(p) {
                totalItensCliente += parseInt(p.itens) || 0;
                totalValorCliente += parseFloat(p.total) || 0;
                
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
            
            html += '<div class="item-card" onclick="verPedidosCliente(\'' + nomeCliente.replace(/'/g, "\\'") + '\')" style="cursor:pointer">';
            html += '<div class="item-info">';
            html += '<div class="item-name" style="font-size:16px;font-weight:700;color:var(--accent)">' + nomeCliente + '</div>';
            html += '<div class="item-detail">' + pedidosDoCliente.length + ' pedido(s) • ' + totalItensCliente + ' itens • ' + totalDevolvidoCliente + ' devolvidos</div>';
            html += '</div>';
            html += '<div style="font-weight:700;color:var(--accent);font-size:16px">R$ ' + totalValorCliente.toFixed(2).replace('.',',') + '</div>';
            html += '</div>';
        });
        
        html += '</div>';
    }
    html += '</div>';
    
    return html;
}

function verPedidosCliente(nomeCliente) {
    var pedidosDoCliente = pedidos.filter(function(p) { return p.cliente_nome === nomeCliente; });
    
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">📋 Pedidos de ' + nomeCliente + '</div>';
    html += '<div class="modal-sub">' + pedidosDoCliente.length + ' pedido(s)</div>';
    
    html += '<div class="item-list">';
    pedidosDoCliente.forEach(function(p) {
        var data = new Date(p.created_at).toLocaleDateString('pt-BR');
        var corStatus = p.status === 'aberto' ? 'var(--warning)' : (p.status === 'finalizado' ? 'var(--success)' : 'var(--error)');
        var textoStatus = p.status === 'aberto' ? 'ENVIADO' : (p.status === 'finalizado' ? 'FINALIZADO' : 'DEVOLVIDO');
        
        html += '<div class="item-card" onclick="verDetalhesPedidoHistorico(\'' + p.id + '\')" style="cursor:pointer">';
        html += '<div class="item-info">';
        html += '<div class="item-name">Pedido #' + p.id.toString().substr(0,8) + ' • ' + data + '</div>';
        html += '<div class="item-detail">' + p.itens + ' itens • R$ ' + parseFloat(p.total).toFixed(2).replace('.',',') + '</div>';
        html += '</div>';
        html += '<span style="color:' + corStatus + ';font-weight:600;font-size:12px">' + textoStatus + '</span>';
        html += '</div>';
    });
    html += '</div>';
    
    html += '<button class="btn btn-outline" onclick="fecharModal()">Fechar</button>';
    
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
}

async function verDetalhesPedidoHistorico(pedidoId) {
    var pedido = pedidos.find(function(p) { return p.id === pedidoId; });
    if (!pedido) return;
    
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">📋 Detalhes do Pedido</div>';
    html += '<div class="modal-sub" style="font-size:16px;font-weight:700;color:var(--accent);margin-bottom:4px">' + pedido.cliente_nome + '</div>';
    html += '<div class="modal-sub">Pedido #' + pedidoId.toString().substr(0,8) + '</div>';
    
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">';
    html += '<div><div style="font-size:12px;color:var(--text2)">Data</div><div style="font-weight:600">' + new Date(pedido.created_at).toLocaleDateString('pt-BR') + '</div></div>';
    html += '<div><div style="font-size:12px;color:var(--text2)">Status</div><div style="font-weight:600;color:' + (pedido.status === 'finalizado' ? 'var(--success)' : 'var(--error)') + '">' + pedido.status.toUpperCase() + '</div></div>';
    html += '<div><div style="font-size:12px;color:var(--text2)">Total</div><div style="font-weight:700;color:var(--accent);font-size:18px">R$ ' + parseFloat(pedido.total).toFixed(2).replace('.',',') + '</div></div>';
    html += '<div><div style="font-size:12px;color:var(--text2)">Itens</div><div style="font-weight:600">' + pedido.itens + ' unidades</div></div>';
    html += '</div></div>';
    
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
    
    var totalDevolvido = 0;
    var itensDevolvidosMap = {};
    
    historicoDevolucoes.forEach(function(dev) {
        if (dev.itens) {
            dev.itens.forEach(function(itemDev) {
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
    
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
    html += '<div style="margin-bottom:12px"><strong>📦 Itens Vendidos (' + itensVendidos.length + ')</strong></div>';
    
    if (itensVendidos.length === 0) {
        html += '<p style="color:var(--text2);text-align:center;padding:20px">Nenhum item encontrado</p>';
    } else {
        html += '<div class="item-list">';
        itensVendidos.forEach(function(item) {
            var qtdVendida = parseInt(item.qtd) || 0;
            
            var qtdDevolvida = 0;
            qtdDevolvida += (itensDevolvidosMap['cod_' + (item.codigo || '')] || 0);
            qtdDevolvida += (itensDevolvidosMap['nome_' + (item.nome || '').toLowerCase().trim()] || 0);
            qtdDevolvida += (itensDevolvidosMap['id_' + (item.produto_id || '')] || 0);
            
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

console.log('✅ Orders.js carregado (Com suporte a edição de pedidos)');
