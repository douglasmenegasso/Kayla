// ============ VENDAS ============

var clienteAtual = null;
var pedidoItens = [];
var html5QrCode = null;
var pedidoEmEdicao = null; 

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

function iniciarPedidoCliente(clienteId) {
    var cliente = clientes.find(function(c) { return c.id === clienteId; });
    if (!cliente) { toast('Cliente não encontrado', 'error'); return; }
    clienteAtual = cliente;
    pedidoItens = [];
    pedidoEmEdicao = null;
    toast('🛒 Vendendo para: ' + cliente.nome, 'success');
    mudarAba('scan');
}

window.iniciarPedidoCliente = iniciarPedidoCliente;

function trocarCliente() {
    clienteAtual = null;
    pedidoItens = [];
    pedidoEmEdicao = null; 
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

// ... (As funções abrirModalItemDevolvido, confirmarReenvioItem, abrirModalDuplicado, ajustarQtdModal, adicionarMaisUnidadesModal, adicionarItem, alterarQtd, removerItem, calcularTotal, cancelarPedido permanecem IGUAIS)
// ...

// ✅ CORREÇÃO 1: Exportar a função iniciarScanner para o escopo global
function iniciarScanner() {
    if (html5QrCode) { html5QrCode.stop(); html5QrCode = null; }
    var reader = document.getElementById('reader');
    if (!reader) return;
    html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start({ facingMode: "environment" }, { fps: 5, qrbox: { width: 300, height: 300 } }, onScanSuccess)
        .catch(function(err) { reader.innerHTML = '<p style="color:var(--text3);text-align:center;padding:20px">Câmera indisponível</p>'; });
}
window.iniciarScanner = iniciarScanner; // <--- ESSA LINHA É A CORREÇÃO

function retomarScanner() { if (html5QrCode) html5QrCode.resume(); }

// ... (O resto das funções de modal como abrirModalProdutoSelecao, etc permanecem IGUAIS)

console.log('✅ Sales.js carregado (Modo Somente Leitura Ativo e Scanner Global)');
