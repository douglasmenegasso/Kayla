// ============ VENDAS ============

var clienteAtual = null;
var pedidoItens = [];
var html5QrCode = null;
var pedidoEmEdicao = null; // 🔥 Variável para guardar o ID do pedido que está sendo editado

function renderizarVenda() {
    var html = '';
    
    html += '<div class="card"><div class="card-title">👥 Cliente</div>';
    if (clienteAtual) {
        html += '<div class="client-selected"><span>✓ ' + clienteAtual.nome + '</span>';
        html += '<button class="btn-sm btn-outline" style="margin:0;color:#fff;border-color:#fff" onclick="trocarCliente()">Trocar</button></div>';
    } else {
        html += '<div class="form-group">';
        if (clientes.length === 0) {
            html += '<p style="color:var(--warning);font-size:13px;margin-bottom:8px">⚠️ Nenhum cliente</p>';
            html += '<button class="btn btn-primary" onclick="abrirModalCliente()">+ Cadastrar</button>';
        } else {
            html += '<select class="form-select" id="select-cliente" onchange="selecionarClienteVenda(this.value)">';
            html += '<option value="">-- Selecione --</option>';
            clientes.forEach(function(c) {
                html += '<option value="' + c.id + '">' + c.nome + '</option>';
            });
            html += '</select>';
        }
        html += '</div></div>';
    }
    
    html += '<div class="card"><div class="card-title">⚡ Adicionar Produto</div>';
    if (!clienteAtual) {
        html += '<p style="color:var(--warning);text-align:center;padding:20px">⚠️ Selecione cliente primeiro</p>';
    } else {
        html += '<button class="btn btn-primary" onclick="abrirModalAdicionarProduto()">+ Adicionar Produto</button>';
        html += '<div class="form-group" style="margin-top:12px">';
        html += '<label class="form-label">Ou digite/escaneie código</label>';
        html += '<input class="form-input" id="codigo-manual" placeholder="Código de barras" onkeypress="if(event.key===\'Enter\')buscarProdutoManual()">';
        html += '</div>';
        html += '<div id="reader"></div>';
    }
    html += '</div>';
    
    html += '<div class="card"><div class="card-title">📦 Pedido Atual';
    if (clienteAtual) html += ' - ' + clienteAtual.nome;
    html += '</div>';
    
    if (pedidoItens.length === 0) {
        html += '<div class="empty-state">Nenhum item</div>';
    } else {
        pedidoItens.forEach(function(item, idx) {
            html += '<div class="order-item">';
            html += '<div class="order-item-header">';
            html += '<div class="order-item-name">' + item.nome + '</div>';
            html += '<div class="order-item-price">R$ ' + (item.preco * item.qtd).toFixed(2).replace('.',',') + '</div>';
            html += '</div>';
            html += '<div class="order-item-controls">';
            html += '<button class="qty-btn" onclick="alterarQtd(' + idx + ',-1)">−</button>';
            html += '<div class="qty-value">' + item.qtd + '</div>';
            html += '<button class="qty-btn" onclick="alterarQtd(' + idx + ',1)">+</button>';
            html += '<span style="color:var(--text3);font-size:12px;margin-left:8px">R$ ' + item.preco.toFixed(2).replace('.',',') + ' un</span>';
            html += '<span class="order-item-remove" onclick="removerItem(' + idx + ')">remover</span>';
            html += '</div></div>';
        });
        html += '<div class="order-total"><span>Total:</span><span>R$ ' + calcularTotal().toFixed(2).replace('.',',') + '</span></div>';
        html += '<button class="btn btn-green" onclick="finalizarPedido()" style="margin-top:12px">📦 Enviar Pedido</button>';
        html += '<button class="btn btn-outline" onclick="cancelarPedido()">❌ Cancelar</button>';
    }
    html += '</div>';
    
    return html;
}

function selecionarClienteVenda(id) {
    if (!id) { clienteAtual = null; return; }
    clienteAtual = clientes.find(function(c) { return c.id === id; });
    toast('Cliente: ' + clienteAtual.nome, 'success');
    mudarAba('scan');
}

function trocarCliente() {
    clienteAtual = null;
    pedidoItens = [];
    pedidoEmEdicao = null; // 🔥 Limpa a edição
    mudarAba('scan');
}

function buscarProdutoManual() {
    var codigo = document.getElementById('codigo-manual').value.trim();
    if (!codigo) { toast('Digite código', 'error'); return; }
    if (!clienteAtual) { toast('Selecione cliente', 'error'); return; }
    processarCodigo(codigo);
}

function onScanSuccess(decodedText) {
    if (!clienteAtual) { toast('Selecione cliente', 'warning'); return; }
    processarCodigo(decodedText);
}

async function processarCodigo(codigo) {
    var produto = produtos.find(function(p) { return p.codigo === codigo; });
    if (!produto) {
        toast('Produto não cadastrado!', 'warning');
        setTimeout(function() { abrirModalProdutoSelecao(codigo); }, 1000);
        return;
    }
    
    if (clienteAtual && isOnline && supabaseClient) {
        try {
            var pedidosCliente = await supabaseClient
                .from('pedidos')
                .select('*')
                .eq('cliente_id', clienteAtual.id);
            
            if (pedidosCliente.data && pedidosCliente.data.length > 0) {
                for (var p of pedidosCliente.data) {
                    if (p.historico_devolucoes) {
                        var historico = JSON.parse(p.historico_devolucoes);
                        var itemDevolvido = null;
                        var dataDevolucao = null;
                        var qtdDevolvida = 0;
                        
                        for (var dev of historico) {
                            if (dev.itens) {
                                for (var item of dev.itens) {
                                    if (item.codigo === codigo) {
                                        itemDevolvido = item;
                                        dataDevolucao = dev.data;
                                        qtdDevolvida += (item.qtd || 0);
                                    }
                                }
                            }
                        }
                        
                        if (itemDevolvido) {
                            abrirModalItemDevolvido(produto, itemDevolvido, dataDevolucao, qtdDevolvida);
                            return;
                        }
                    }
                }
            }
        } catch(e) {
            console.error('Erro ao verificar histórico:', e);
        }
    }
    
    var itemExistente = pedidoItens.find(function(i) { return i.produto_id === produto.id; });
    if (itemExistente) {
        abrirModalDuplicado(produto, itemExistente);
    } else {
        adicionarItem(produto, 1);
        toast('✅ ' + produto.nome, 'success');
    }
    
    var campo = document.getElementById('codigo-manual');
    if (campo) { campo.value = ''; campo.focus(); }
}

function abrirModalItemDevolvido(produto, itemDevolvido, dataDevolucao, qtdDevolvida) {
    var dataFormatada = new Date(dataDevolucao).toLocaleDateString('pt-BR');
    
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">⚠️ Item Já Devolvido</div>';
    html += '<div class="modal-sub">' + produto.nome + '</div>';
    
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px;border-left:4px solid var(--warning)">';
    html += '<div style="font-size:13px;color:var(--text2);margin-bottom:12px">Este item já foi devolvido anteriormente:</div>';
    html += '<div style="background:#1a1a24;padding:12px;border-radius:8px;margin-bottom:8px">';
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="color:var(--text2)">Data:</span><strong>' + dataFormatada + '</strong></div>';
    html += '<div style="display:flex;justify-content:space-between"><span style="color:var(--text2)">Qtd devolvida:</span><strong style="color:var(--warning)">' + qtdDevolvida + ' un</strong></div>';
    html += '</div>';
    html += '<p style="font-size:12px;color:var(--text2);margin-top:12px">Deseja enviar novamente para este cliente?</p>';
    html += '</div>';
    
    html += '<button class="btn btn-primary" onclick="confirmarReenvioItem(\'' + produto.id + '\')">✅ Sim, Enviar</button>';
    html += '<button class="btn btn-outline" onclick="fecharModal()">Cancelar</button>';
    
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
}

function confirmarReenvioItem(produtoId) {
    var produto = produtos.find(function(p) { return p.id === produtoId; });
    if (produto) {
        fecharModal();
        var itemExistente = pedidoItens.find(function(i) { return i.produto_id === produto.id; });
        if (itemExistente) {
            abrirModalDuplicado(produto, itemExistente);
        } else {
            adicionarItem(produto, 1);
            toast('✅ ' + produto.nome + ' (reenvio)', 'success');
        }
    }
}

function abrirModalDuplicado(produto, item) {
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">📦 Já na Lista</div>';
    html += '<div class="modal-sub">' + produto.nome + '</div>';
    html += '<div class="card" style="background:var(--bg3);padding:16px;text-align:center;margin-bottom:16px">';
    html += '<p>Produto já está no pedido com <strong style="color:var(--accent)">' + item.qtd + ' un</strong></p></div>';
    html += '<div style="text-align:center;color:var(--text2);font-size:12px;margin-bottom:8px;text-transform:uppercase">Adicionar mais</div>';
    html += '<div style="display:flex;align-items:center;justify-content:center;gap:16px;margin:20px 0">';
    html += '<button class="qty-btn" onclick="ajustarQtdModal(-1)" style="width:44px;height:44px;font-size:24px">−</button>';
    html += '<div style="font-size:28px;font-weight:700;min-width:60px;text-align:center" id="modal-qtd-display">' + item.qtd + '</div>';
    html += '<button class="qty-btn" onclick="ajustarQtdModal(1)" style="width:44px;height:44px;font-size:24px">+</button>';
    html += '</div>';
    html += '<input type="hidden" id="modal-produto-id" value="' + produto.id + '">';
    html += '<input type="hidden" id="modal-qtd-atual" value="' + item.qtd + '">';
    html += '<button class="btn btn-primary" onclick="adicionarMaisUnidadesModal()">➕ Adicionar</button>';
    html += '<button class="btn btn-outline" onclick="fecharModal()">Cancelar</button>';
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
}

function ajustarQtdModal(delta) {
    var display = document.getElementById('modal-qtd-display');
    var hidden = document.getElementById('modal-qtd-atual');
    var qtd = parseInt(hidden.value) + delta;
    if (qtd < 1) qtd = 1;
    hidden.value = qtd;
    display.textContent = qtd;
}

function adicionarMaisUnidadesModal() {
    var produtoId = document.getElementById('modal-produto-id').value;
    var qtdAdd = parseInt(document.getElementById('modal-qtd-atual').value);
    var item = pedidoItens.find(function(i) { return i.produto_id === produtoId; });
    if (item) {
        item.qtd += qtdAdd;
    }
    toast('➕ +' + qtdAdd + ' unidades', 'success');
    fecharModal();
    mudarAba('scan');
}

function adicionarItem(produto, qtd) {
    pedidoItens.push({
        produto_id: produto.id,
        nome: produto.nome,
        codigo: produto.codigo,
        preco: produto.preco,
        qtd: qtd
    });
    mudarAba('scan');
}

function alterarQtd(idx, delta) {
    pedidoItens[idx].qtd += delta;
    if (pedidoItens[idx].qtd <= 0) {
        pedidoItens.splice(idx, 1);
    }
    mudarAba('scan');
}

function removerItem(idx) {
    pedidoItens.splice(idx, 1);
    mudarAba('scan');
}

function calcularTotal() {
    var total = 0;
    pedidoItens.forEach(function(i) { total += i.preco * i.qtd; });
    return total;
}

function cancelarPedido() {
    if (pedidoItens.length > 0 && !confirm('Cancelar pedido?')) return;
    pedidoItens = [];
    clienteAtual = null;
    pedidoEmEdicao = null; // 🔥 Limpa a edição
    mudarAba('scan');
}

async function finalizarPedido() {
    if (pedidoItens.length === 0) { toast('Adicione produtos', 'error'); return; }
    if (!clienteAtual) { toast('Selecione cliente', 'error'); return; }
    
    var btn = event.target;
    var texto = btn.innerText;
    btn.innerText = 'Enviando...';
    btn.disabled = true;
    
    try {
        var total = calcularTotal();
        var totalItens = 0;
        var itensDetalhes = [];
        
        pedidoItens.forEach(function(i) { 
            totalItens += i.qtd;
            itensDetalhes.push({
                produto_id: i.produto_id,
                nome: i.nome,
                codigo: i.codigo,
                preco: i.preco,
                qtd: i.qtd,
                total: i.preco * i.qtd
            });
        });
        
        var pedidoData = {
            cliente_id: clienteAtual.id,
            cliente_nome: clienteAtual.nome,
            status: 'aberto',
            itens: totalItens,
            total: total,
            user_id: currentUser ? currentUser.id : 'local',
            created_at: new Date().toISOString()
        };
        
        if (pedidoEmEdicao) {
            // 🔥 SE FOR EDIÇÃO, ATUALIZA O PEDIDO
            if (isOnline && supabaseClient) {
                // Atualiza o pedido
                await supabaseClient.from('pedidos').update(pedidoData).eq('id', pedidoEmEdicao);
                
                // Remove itens antigos e insere os novos
                await supabaseClient.from('pedido_itens').delete().eq('pedido_id', pedidoEmEdicao);
                
                var itensParaSalvar = itensDetalhes.map(function(item) {
                    return {
                        pedido_id: pedidoEmEdicao,
                        produto_id: item.produto_id,
                        nome: item.nome,
                        codigo: item.codigo,
                        preco: item.preco,
                        qtd: item.qtd,
                        total: item.total
                    };
                });
                await supabaseClient.from('pedido_itens').insert(itensParaSalvar);
                
                await carregarDados();
            } else {
                // Offline: atualiza localmente
                var idx = pedidos.findIndex(function(p) { return p.id === pedidoEmEdicao; });
                if (idx >= 0) {
                    pedidos[idx] = Object.assign({}, pedidos[idx], pedidoData);
                    pedidos[idx].itens_json = JSON.stringify(itensDetalhes);
                    salvarDadosLocais();
                }
            }
            toast('✅ Pedido atualizado!', 'success');
            pedidoEmEdicao = null; // 🔥 Limpa a edição
            
        } else {
            // 🔥 SE FOR NOVO, CRIA UM PEDIDO NOVO
            var pedidoCriado = null;
            
            if (isOnline && supabaseClient) {
                var result = await supabaseClient.from('pedidos').insert(pedidoData).select();
                if (result.error) throw result.error;
                
                pedidoCriado = result.data[0];
                console.log('✅ Pedido enviado:', pedidoCriado.id);
                
                var itensParaSalvar = itensDetalhes.map(function(item) {
                    return {
                        pedido_id: pedidoCriado.id,
                        produto_id: item.produto_id,
                        nome: item.nome,
                        codigo: item.codigo,
                        preco: item.preco,
                        qtd: item.qtd,
                        total: item.total
                    };
                });
                
                var resultItens = await supabaseClient.from('pedido_itens').insert(itensParaSalvar);
                if (resultItens.error) {
                    console.warn('⚠️ Erro ao salvar itens:', resultItens.error);
                } else {
                    console.log('✅ ' + itensParaSalvar.length + ' itens salvos em pedido_itens');
                }
                
                await carregarDados();
            } else {
                pedidoData.id = 'local_' + Date.now();
                pedidoData.itens_json = JSON.stringify(itensDetalhes);
                pedidos.unshift(pedidoData);
                salvarDadosLocais();
                pedidoCriado = pedidoData;
            }
            
            setTimeout(function() {
                if (confirm('📦 Pedido enviado para ' + clienteAtual.nome + '!\n\nTotal: R$ ' + total.toFixed(2).replace('.',',') + '\n\nGerar PDF?')) {
                    gerarPDFPedido(pedidoCriado || pedidoData);
                }
            }, 500);
        }
        
        pedidoItens = [];
        clienteAtual = null;
        mudarAba('orders');
        
    } catch (error) {
        toast('Erro: ' + error.message, 'error');
        console.error('❌ Erro ao enviar pedido:', error);
    }
    
    btn.innerText = texto;
    btn.disabled = false;
}

// ============ MODAL ADICIONAR PRODUTO ============

function abrirModalAdicionarProduto() {
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">🔍 Adicionar produto</div>';
    html += '<div class="form-group"><input class="form-input" id="produto-search" placeholder="Buscar por nome ou código..." onkeyup="filtrarProdutosModalVenda(this.value)" autofocus></div>';
    html += '<div id="lista-produtos-venda" style="max-height:400px;overflow-y:auto">';
    
    produtos.forEach(function(p) {
        html += '<div class="item-card" style="margin-bottom:8px" onclick="selecionarProdutoVenda(\'' + p.id + '\')">';
        html += '<div class="item-info"><div class="item-name">' + p.nome + '</div><div class="item-detail">' + p.codigo + ' - R$ ' + p.preco.toFixed(2).replace('.',',') + '</div></div>';
        html += '<span style="color:var(--accent)">+</span></div>';
    });
    
    html += '</div>';
    html += '<button class="btn btn-outline" onclick="fecharModal()" style="margin-top:16px">Cancelar</button>';
    
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
    setTimeout(function() { document.getElementById('produto-search').focus(); }, 100);
}

function filtrarProdutosModalVenda(termo) {
    var container = document.getElementById('lista-produtos-venda');
    var filtrados = produtos.filter(function(p) {
        return p.nome.toLowerCase().includes(termo.toLowerCase()) || 
               (p.codigo && p.codigo.toLowerCase().includes(termo.toLowerCase()));
    });
    
    var html = '';
    if (filtrados.length === 0) {
        html = '<div class="empty-state">Nenhum produto encontrado</div>';
    } else {
        filtrados.forEach(function(p) {
            html += '<div class="item-card" style="margin-bottom:8px" onclick="selecionarProdutoVenda(\'' + p.id + '\')">';
            html += '<div class="item-info"><div class="item-name">' + p.nome + '</div><div class="item-detail">' + p.codigo + ' - R$ ' + p.preco.toFixed(2).replace('.',',') + '</div></div>';
            html += '<span style="color:var(--accent)">+</span></div>';
        });
    }
    container.innerHTML = html;
}

function selecionarProdutoVenda(produtoId) {
    var produto = produtos.find(function(p) { return p.id === produtoId; });
    if (produto) {
        fecharModal();
        processarCodigo(produto.codigo);
    }
}

// ============ SCANNER ============

function iniciarScanner() {
    if (html5QrCode) { html5QrCode.stop(); html5QrCode = null; }
    var reader = document.getElementById('reader');
    if (!reader) return;
    html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start({ facingMode: "environment" }, { fps: 5, qrbox: { width: 300, height: 300 } }, onScanSuccess)
        .catch(function(err) { reader.innerHTML = '<p style="color:var(--text3);text-align:center;padding:20px">Câmera indisponível</p>'; });
}

function retomarScanner() { if (html5QrCode) html5QrCode.resume(); }

// ============ SELEÇÃO PRODUTO ============

function abrirModalProdutoSelecao(codigo) {
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">🏷️ Produto Não Encontrado</div>';
    html += '<div class="modal-sub">Código: ' + codigo + '</div>';
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
    html += '<p style="color:var(--text2);margin-bottom:16px">O que deseja fazer?</p>';
    html += '<button class="btn btn-primary" onclick="fecharModal(); abrirModalProdutoNovo(\'' + codigo + '\')">+ Cadastrar Novo</button>';
    html += '<button class="btn btn-outline" onclick="fecharModal(); abrirModalListaProdutos(\'' + codigo + '\')"> Buscar na Lista</button>';
    html += '<button class="btn btn-outline" onclick="fecharModal()">❌ Cancelar</button></div>';
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
}

function abrirModalListaProdutos(codigoBusca) {
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">📋 Selecionar Produto</div>';
    html += '<div class="modal-sub">Busca: ' + codigoBusca + '</div>';
    html += '<div class="form-group"><input class="form-input" id="busca-produto" placeholder="Buscar..." onkeyup="filtrarProdutosModal(this.value)"></div>';
    html += '<div id="lista-produtos-modal" style="max-height:300px;overflow-y:auto">';
    
    var filtrados = produtos.filter(function(p) {
        return p.nome.toLowerCase().includes(codigoBusca.toLowerCase()) || 
               (p.codigo && p.codigo.includes(codigoBusca));
    });
    
    if (filtrados.length === 0) {
        html += '<p style="color:var(--text3);text-align:center;padding:20px">Nenhum produto</p>';
    } else {
        filtrados.forEach(function(p) {
            html += '<div class="item-card" style="margin-bottom:8px" onclick="selecionarProdutoLista(\'' + p.id + '\')">';
            html += '<div class="item-info"><div class="item-name">' + p.nome + '</div><div class="item-detail">' + p.codigo + ' - R$ ' + p.preco.toFixed(2).replace('.',',') + '</div></div>';
            html += '<span style="color:var(--accent)">Selecionar →</span></div>';
        });
    }
    html += '</div>';
    html += '<button class="btn btn-outline" onclick="fecharModal()">Cancelar</button>';
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
}

function filtrarProdutosModal(termo) {
    var container = document.getElementById('lista-produtos-modal');
    var filtrados = produtos.filter(function(p) {
        return p.nome.toLowerCase().includes(termo.toLowerCase()) || 
               (p.codigo && p.codigo.includes(termo));
    });
    
    var html = '';
    if (filtrados.length === 0) {
        html = '<p style="color:var(--text3);text-align:center;padding:20px">Nenhum produto</p>';
    } else {
        filtrados.forEach(function(p) {
            html += '<div class="item-card" style="margin-bottom:8px" onclick="selecionarProdutoLista(\'' + p.id + '\')">';
            html += '<div class="item-info"><div class="item-name">' + p.nome + '</div><div class="item-detail">' + p.codigo + ' - R$ ' + p.preco.toFixed(2).replace('.',',') + '</div></div>';
            html += '<span style="color:var(--accent)">Selecionar →</span></div>';
        });
    }
    container.innerHTML = html;
}

function selecionarProdutoLista(produtoId) {
    var produto = produtos.find(function(p) { return p.id === produtoId; });
    if (produto) {
        fecharModal();
        adicionarItem(produto, 1);
        toast('✅ ' + produto.nome + ' adicionado', 'success');
    }
}

function abrirModalProdutoNovo(codigo) {
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">🏷️ Cadastrar Produto</div>';
    html += '<div class="form-group"><label class="form-label">Nome</label><input class="form-input" id="produto-nome" onkeypress="if(event.key===\'Enter\')salvarProdutoNovo()"></div>';
    html += '<div class="form-group"><label class="form-label">Código</label><input class="form-input" id="produto-codigo" value="' + codigo + '" readonly></div>';
    html += '<div class="form-group"><label class="form-label">Preço (R$)</label><input class="form-input" id="produto-preco" type="number" step="0.01" onkeypress="if(event.key===\'Enter\')salvarProdutoNovo()"></div>';
    html += '<button class="btn btn-primary" onclick="salvarProdutoNovo()">💾 Salvar</button>';
    html += '<button class="btn btn-outline" onclick="fecharModal()">Cancelar</button>';
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
    setTimeout(function() { document.getElementById('produto-nome').focus(); }, 300);
}

async function salvarProdutoNovo() {
    var nome = document.getElementById('produto-nome').value.trim();
    var codigo = document.getElementById('produto-codigo').value.trim();
    var preco = parseFloat(document.getElementById('produto-preco').value);
    if (!nome || !codigo || !preco) { toast('Preencha tudo', 'error'); return; }
    if (!verificarLimite('produtos')) return;
    if (produtos.find(function(p) { return p.codigo === codigo; })) { toast('Já existe!', 'error'); return; }
    
    var produtoData = { nome: nome, codigo: codigo, preco: preco, user_id: currentUser ? currentUser.id : 'local', created_at: new Date().toISOString() };
    
    if (isOnline && supabaseClient) {
        var result = await supabaseClient.from('produtos').insert(produtoData).select();
        if (result.error) { toast('Erro: ' + result.error.message, 'error'); return; }
        await carregarDados();
    } else {
        produtoData.id = 'local_' + Date.now();
        produtos.push(produtoData);
        salvarDadosLocais();
    }
    
    toast('✅ Produto salvo!', 'success');
    fecharModal();
    processarCodigo(codigo);
}

console.log('✅ Sales.js carregado (Com suporte a edição de pedidos)');
