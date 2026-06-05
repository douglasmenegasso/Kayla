// ============ PEDIDOS E DEVOLUÇÕES ============

function renderizarPedidos() {
  var html = '';
  var pedidosAbertos = (pedidos || []).filter(function(p) { return p.status !== 'finalizado' && p.status !== 'devolvido'; });
  
  if (pedidosAbertos.length === 0) {
    html = '<div class="empty-state"><svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg><p>Nenhum pedido aberto</p></div>';
  } else {
    html = '<div class="card-title">📋 PEDIDOS (' + pedidosAbertos.length + ')</div>';
    pedidosAbertos.forEach(function(pedido) {
      var cliente = (clientes || []).find(function(c) { return c.id === pedido.cliente_id; });
      var nomeCliente = cliente ? cliente.nome : 'N/A';
      var totalItens = (pedido.itens || []).reduce(function(sum, item) { return sum + (item.qtd || 0); }, 0);
      var valorTotal = (pedido.itens || []).reduce(function(sum, item) { return sum + ((item.preco || 0) * (item.qtd || 0)); }, 0);
      
      html += '<div class="order-card">';
      html += '<div class="order-header">';
      html += '<div><div class="order-id">Pedido #' + pedido.id.substr(0, 8) + '</div>';
      html += '<div class="order-info">' + nomeCliente + ' • ' + formatarData(pedido.created_at) + '</div>';
      html += '<div class="order-info">' + totalItens + ' itens • ' + formatarMoeda(valorTotal) + '</div></div>';
      html += '<span class="status-badge status-aberto">ABERTO</span>';
      html += '</div>';
      html += '<div class="order-actions">';
      html += '<button class="btn btn-outline btn-sm" onclick="verPedido(\'' + pedido.id + '\')">Ver</button>';
      html += '<button class="btn btn-success btn-sm" onclick="finalizarPedido(\'' + pedido.id + '\')">✅ Finalizar</button>';
      html += '<button class="btn btn-warning btn-sm" onclick="abrirDevolucao(\'' + pedido.id + '\')"> Devolução</button>';
      html += '<button class="btn btn-outline btn-sm" onclick="gerarPDFPedido(\'' + pedido.id + '\')">📄 PDF</button>';
      html += '</div></div>';
    });
  }
  
  return html;
}

function verPedido(pedidoId) {
  var pedido = (pedidos || []).find(function(p) { return p.id === pedidoId; });
  if (!pedido) { toast('Pedido não encontrado', 'error'); return; }
  
  var cliente = (clientes || []).find(function(c) { return c.id === pedido.cliente_id; });
  var nomeCliente = cliente ? cliente.nome : 'N/A';
  
  var html = '<div class="modal-handle"></div>';
  html += '<div class="modal-title">📋 Pedido #' + pedido.id.substr(0, 8) + '</div>';
  html += '<div class="modal-sub">' + nomeCliente + ' • ' + formatarData(pedido.created_at) + '</div>';
  
  html += '<div class="card" style="margin-bottom:16px">';
  html += '<div class="card-title"> Itens do Pedido</div>';
  
  if (pedido.itens && pedido.itens.length > 0) {
    html += '<ul class="item-list">';
    pedido.itens.forEach(function(item) {
      var produto = (produtos || []).find(function(p) { return p.id === item.produto_id; });
      var nomeProduto = produto ? produto.nome : 'Produto removido';
      html += '<li class="item-row">';
      html += '<div class="item-info"><div class="item-name">' + nomeProduto + '</div>';
      html += '<div class="item-detail">' + item.qtd + 'x ' + formatarMoeda(item.preco) + ' = ' + formatarMoeda(item.preco * item.qtd) + '</div></div>';
      html += '</li>';
    });
    html += '</ul>';
    
    var total = pedido.itens.reduce(function(sum, item) { return sum + (item.preco * item.qtd); }, 0);
    html += '<div class="cart-total"><span>Total:</span><span>' + formatarMoeda(total) + '</span></div>';
  } else {
    html += '<p style="color:var(--text2);text-align:center;padding:20px">Nenhum item</p>';
  }
  html += '</div>';
  
  html += '<button class="btn btn-outline" onclick="fecharModal()">Fechar</button>';
  
  document.getElementById('modal-body').innerHTML = html;
  document.getElementById('modal-overlay').classList.add('show');
}

function finalizarPedido(pedidoId) {
  var pedido = (pedidos || []).find(function(p) { return p.id === pedidoId; });
  if (!pedido) { toast('Pedido não encontrado', 'error'); return; }
  
  var total = (pedido.itens || []).reduce(function(sum, item) { return sum + (item.preco * item.qtd); }, 0);
  
  confirmar(
    'Finalizar Pedido',
    'Deseja finalizar o Pedido #' + pedido.id.substr(0, 8) + '?\nTotal: ' + formatarMoeda(total) + '\n\nGerar PDF?',
    function(ok) {
      if (ok) {
        pedido.status = 'finalizado';
        pedido.finalizado_em = new Date().toISOString();
        
        if (isOnline && supabaseClient) {
          supabaseClient.from('pedidos').update({ status: 'finalizado', finalizado_em: pedido.finalizado_em }).eq('id', pedidoId).then(function() {
            salvarDadosLocais();
            toast('✅ Pedido finalizado!', 'success');
            gerarPDFPedido(pedidoId);
            mudarAba('orders');
          });
        } else {
          salvarDadosLocais();
          toast('✅ Pedido finalizado!', 'success');
          gerarPDFPedido(pedidoId);
          mudarAba('orders');
        }
      }
    },
    '✅'
  );
}

function abrirDevolucao(pedidoId) {
  var pedido = (pedidos || []).find(function(p) { return p.id === pedidoId; });
  if (!pedido) { toast('Pedido não encontrado', 'error'); return; }
  
  var cliente = (clientes || []).find(function(c) { return c.id === pedido.cliente_id; });
  var nomeCliente = cliente ? cliente.nome : 'N/A';
  
  // Clonar itens para edição
  var itensDevolucao = JSON.parse(JSON.stringify(pedido.itens || []));
  
  function renderizarItensDevolucao() {
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">🔄 Devolução</div>';
    html += '<div class="modal-sub">Pedido #' + pedido.id.substr(0, 8) + ' - ' + nomeCliente + '</div>';
    
    // Scanner de código de barras
    html += '<div class="scanner-area" onclick="iniciarScannerDevolucao()">';
    html += '<svg viewBox="0 0 24 24"><path d="M3 5v4h2V5h4V3H5a2 2 0 00-2 2zm2 10H3v4a2 2 0 002 2h4v-2H5v-4zm14 4h-4v2h4a2 2 0 002-2v-4h-2v4zm0-16h-4v2h4v4h2V5a2 2 0 00-2-2z"/><path d="M7 13h10v2H7zM9 9h6v2H9z"/></svg>';
    html += '<div class="scanner-text">📷 Toque para escanear código de barras</div>';
    html += '</div>';
    
    // Campo manual
    html += '<div class="form-group">';
    html += '<label class="form-label">Código de Barras (manual)</label>';
    html += '<div style="display:flex;gap:8px">';
    html += '<input class="form-input" id="dev-codigo" placeholder="Digite ou escaneie o código" style="flex:1" onkeypress="if(event.key===\'Enter\')removerItemDevolucao()">';
    html += '<button class="btn btn-primary btn-sm" onclick="removerItemDevolucao()" style="width:auto;margin:0">Remover</button>';
    html += '</div></div>';
    
    // Lista de itens
    html += '<div class="card" style="margin-bottom:16px">';
    html += '<div class="card-title">📦 Itens do Pedido (' + itensDevolucao.length + ')</div>';
    
    if (itensDevolucao.length === 0) {
      html += '<p style="color:var(--text2);text-align:center;padding:20px">Todos os itens foram devolvidos</p>';
    } else {
      html += '<ul class="item-list">';
      itensDevolucao.forEach(function(item, index) {
        var produto = (produtos || []).find(function(p) { return p.id === item.produto_id; });
        var nomeProduto = produto ? produto.nome : 'Produto removido';
        html += '<li class="item-row">';
        html += '<div class="item-info"><div class="item-name">' + nomeProduto + '</div>';
        html += '<div class="item-detail">' + item.qtd + 'x ' + formatarMoeda(item.preco) + '</div></div>';
        html += '<div class="item-actions">';
        html += '<button class="item-btn remove" onclick="removerItemPorIndex(' + index + ')" title="Remover">🗑️</button>';
        html += '</div></li>';
      });
      html += '</ul>';
    }
    html += '</div>';
    
    // Botões de ação
    html += '<button class="btn btn-warning" onclick="confirmarDevolucao()">✅ Confirmar Devolução</button>';
    html += '<button class="btn btn-outline" onclick="fecharModal()">Cancelar</button>';
    
    document.getElementById('modal-body').innerHTML = html;
  }
  
  // Funções auxiliares no escopo
  window.itensDevolucao = itensDevolucao;
  window.pedidoDevolucao = pedido;
  window.renderizarItensDevolucao = renderizarItensDevolucao;
  
  window.removerItemPorIndex = function(index) {
    confirmar(
      'Remover Item',
      'Deseja remover este item da devolução?',
      function(ok) {
        if (ok) {
          itensDevolucao.splice(index, 1);
          renderizarItensDevolucao();
        }
      },
      '🗑️'
    );
  };
  
  window.removerItemDevolucao = function() {
    var codigo = document.getElementById('dev-codigo').value.trim();
    if (!codigo) { toast('Digite o código de barras', 'warning'); return; }
    
    var index = itensDevolucao.findIndex(function(item) {
      var produto = (produtos || []).find(function(p) { return p.id === item.produto_id; });
      return produto && produto.codigo_barras === codigo;
    });
    
    if (index === -1) {
      toast('Item não encontrado no pedido', 'error');
    } else {
      confirmar(
        'Remover Item',
        'Deseja remover este item da devolução?',
        function(ok) {
          if (ok) {
            itensDevolucao.splice(index, 1);
            renderizarItensDevolucao();
            toast('Item removido!', 'success');
          }
        },
        '🗑️'
      );
    }
  };
  
  window.iniciarScannerDevolucao = function() {
    // Usar o scanner existente se disponível
    if (typeof iniciarScanner === 'function') {
      // Criar modal de scanner temporário
      var scannerHtml = '<div class="modal-handle"></div>';
      scannerHtml += '<div class="modal-title">📷 Escanear Código</div>';
      scannerHtml += '<div class="modal-sub">Aponte a câmera para o código de barras</div>';
      scannerHtml += '<div id="scanner-container" style="width:100%;height:300px;background:#000;border-radius:8px;margin-bottom:16px;display:flex;align-items:center;justify-content:center;color:var(--text2)">Câmera não disponível neste ambiente</div>';
      scannerHtml += '<div class="form-group"><label class="form-label">Código (manual)</label>';
      scannerHtml += '<input class="form-input" id="scanner-codigo" placeholder="Digite o código manualmente" onkeypress="if(event.key===\'Enter\')aplicarCodigoScanner()"></div>';
      scannerHtml += '<button class="btn btn-primary" onclick="aplicarCodigoScanner()">Aplicar Código</button>';
      scannerHtml += '<button class="btn btn-outline" onclick="fecharModal()">Cancelar</button>';
      
      document.getElementById('modal-body').innerHTML = scannerHtml;
      
      window.aplicarCodigoScanner = function() {
        var codigo = document.getElementById('scanner-codigo').value.trim();
        if (!codigo) { toast('Digite o código', 'warning'); return; }
        
        var index = itensDevolucao.findIndex(function(item) {
          var produto = (produtos || []).find(function(p) { return p.id === item.produto_id; });
          return produto && produto.codigo_barras === codigo;
        });
        
        if (index === -1) {
          toast('Item não encontrado no pedido', 'error');
        } else {
          itensDevolucao.splice(index, 1);
          fecharModal();
          renderizarItensDevolucao();
          toast('Item removido via scanner!', 'success');
        }
      };
      
      document.getElementById('modal-overlay').classList.add('show');
    } else {
      toast('Scanner não disponível', 'warning');
    }
  };
  
  window.confirmarDevolucao = function() {
    if (itensDevolucao.length === (pedido.itens || []).length) {
      toast('Selecione pelo menos um item para devolver', 'warning');
      return;
    }
    
    var itensRemovidos = (pedido.itens || []).length - itensDevolucao.length;
    
    confirmar(
      'Confirmar Devolução',
      'Deseja confirmar a devolução de ' + itensRemovidos + ' item(s)?\n\nOs itens restantes continuarão no pedido.',
      function(ok) {
        if (ok) {
          // Atualizar pedido com itens restantes
          pedido.itens = itensDevolucao;
          pedido.status = itensDevolucao.length === 0 ? 'devolvido' : 'aberto';
          
          if (isOnline && supabaseClient) {
            supabaseClient.from('pedidos').update({ itens: itensDevolucao, status: pedido.status }).eq('id', pedidoId).then(function() {
              salvarDadosLocais();
              toast('✅ Devolução registrada!', 'success');
              fecharModal();
              mudarAba('orders');
            });
          } else {
            salvarDadosLocais();
            toast('✅ Devolução registrada!', 'success');
            fecharModal();
            mudarAba('orders');
          }
        }
      },
      '🔄'
    );
  };
  
  renderizarItensDevolucao();
  document.getElementById('modal-overlay').classList.add('show');
}

function renderizarHistorico() {
  var html = '';
  var pedidosFinalizados = (pedidos || []).filter(function(p) { return p.status === 'finalizado' || p.status === 'devolvido'; });
  
  if (pedidosFinalizados.length === 0) {
    html = '<div class="empty-state"><svg viewBox="0 0 24 24"><path d="M13 3a9 9 0 00-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0013 21a9 9 0 000-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg><p>Nenhum pedido no histórico</p></div>';
  } else {
    html = '<div class="card-title"> HISTÓRICO (' + pedidosFinalizados.length + ')</div>';
    pedidosFinalizados.forEach(function(pedido) {
      var cliente = (clientes || []).find(function(c) { return c.id === pedido.cliente_id; });
      var nomeCliente = cliente ? cliente.nome : 'N/A';
      var totalItens = (pedido.itens || []).reduce(function(sum, item) { return sum + (item.qtd || 0); }, 0);
      var valorTotal = (pedido.itens || []).reduce(function(sum, item) { return sum + ((item.preco || 0) * (item.qtd || 0)); }, 0);
      var statusClass = pedido.status === 'finalizado' ? 'status-finalizado' : 'status-devolvido';
      var statusText = pedido.status === 'finalizado' ? 'FINALIZADO' : 'DEVOLVIDO';
      
      html += '<div class="order-card">';
      html += '<div class="order-header">';
      html += '<div><div class="order-id">Pedido #' + pedido.id.substr(0, 8) + '</div>';
      html += '<div class="order-info">' + nomeCliente + ' • ' + formatarData(pedido.created_at) + '</div>';
      html += '<div class="order-info">' + totalItens + ' itens • ' + formatarMoeda(valorTotal) + '</div></div>';
      html += '<span class="status-badge ' + statusClass + '">' + statusText + '</span>';
      html += '</div>';
      html += '<div class="order-actions">';
      html += '<button class="btn btn-outline btn-sm" onclick="verPedido(\'' + pedido.id + '\')">Ver</button>';
      html += '<button class="btn btn-outline btn-sm" onclick="gerarPDFPedido(\'' + pedido.id + '\')">📄 PDF</button>';
      html += '</div></div>';
    });
  }
  
  return html;
}

console.log('✅ Orders.js carregado');
