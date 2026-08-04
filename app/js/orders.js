// ============ PEDIDOS E HISTÓRICO ============

var html5QrCodeDevolucao = null;

function renderizarPedidos() {
    var stInfo = function(s){ if (s === 'finalizado') return {c:'fi', t:'FINALIZADO'}; if (s === 'devolvido') return {c:'de', t:'DEVOLVIDO'}; return {c:'ab', t:'ENVIADO'}; };

    var html = '<style>'
      + '.ped-busca-wrap{margin-bottom:12px}'
      + '.ped-grupo{background:var(--bg2);border:1px solid var(--border);border-radius:14px;margin-bottom:12px;overflow:hidden;transition:border-color .2s ease,box-shadow .2s ease}'
      + '.ped-grupo[open]{border-color:var(--accent);box-shadow:0 8px 24px rgba(124,92,252,.12)}'
      + '.ped-grupo>summary{list-style:none;cursor:pointer;padding:14px;display:flex;align-items:center;justify-content:space-between;gap:10px;transition:background .15s ease}'
      + '.ped-grupo>summary::-webkit-details-marker{display:none}'
      + '.ped-grupo>summary:hover{background:var(--bg3)}'
      + '.ped-grupo>summary:active{transform:scale(.995)}'
      + '.ped-grupo-main{flex:1;min-width:0}'
      + '.ped-grupo-nome{font-size:16px;font-weight:800;color:var(--accent);line-height:1.2}'
      + '.ped-grupo-res{font-size:12px;color:var(--text2);margin-top:3px}'
      + '.ped-grupo-right{display:flex;align-items:center;gap:8px;flex-shrink:0}'
      + '.ped-grupo-pills{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}'
      + '.ped-pill{font-size:10px;font-weight:800;padding:3px 8px;border-radius:999px}'
      + '.ped-pill.ab{background:rgba(255,152,0,.15);color:var(--warning)}'
      + '.ped-pill.fi{background:rgba(34,197,94,.15);color:var(--success)}'
      + '.ped-pill.de{background:rgba(255,23,68,.15);color:var(--error)}'
      + '.ped-grupo-chevron{width:22px;height:22px;display:flex;align-items:center;justify-content:center;color:var(--text2);transition:transform .25s ease,color .2s ease;font-size:12px}'
      + '.ped-grupo[open] .ped-grupo-chevron{transform:rotate(180deg);color:var(--accent)}'
      + '.ped-grupo-corpo{padding:4px 12px 12px;animation:pedFade .25s ease}'
      + '@keyframes pedFade{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}'
      + '.ped-linha{background:#1a1a24;border-radius:10px;padding:12px;margin-top:8px}'
      + '.ped-linha-top{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}'
      + '.ped-linha-id{font-weight:700;font-size:13px;color:var(--text1,#fff)}'
      + '.ped-linha-meta{font-size:11px;color:var(--text2);margin-top:2px}'
      + '.ped-status{font-size:10px;font-weight:800;padding:3px 8px;border-radius:999px;white-space:nowrap}'
      + '.ped-status.ab{background:rgba(255,152,0,.15);color:var(--warning)}'
      + '.ped-status.fi{background:rgba(34,197,94,.15);color:var(--success)}'
      + '.ped-status.de{background:rgba(255,23,68,.15);color:var(--error)}'
      + '.ped-linha-acoes{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}'
      + '</style>';

    html += '<div class="card"><div class="card-title">📋 Pedidos (' + pedidos.length + ')</div>';
    if (pedidos.length === 0) {
        html += '<div class="empty-state">Nenhum pedido</div></div>';
        return html;
    }

    // Agrupa por cliente
    var grupos = {};
    pedidos.forEach(function(p){ var n = p.cliente_nome || 'Sem nome'; (grupos[n] = grupos[n] || []).push(p); });
    var nomes = Object.keys(grupos);

    html += '<div style="font-size:12px;color:var(--text2);margin:-4px 0 10px">' + nomes.length + ' cliente(s)</div>';
    html += '<div class="ped-busca-wrap"><input class="form-input" id="ped-busca-cliente" placeholder="🔍 Buscar cliente" oninput="filtrarPedidosCliente(this.value)"></div>';
    html += '</div>';

    // Ordena clientes pelo pedido mais recente
    nomes.sort(function(a,b){
        var ma = Math.max.apply(null, grupos[a].map(function(p){ return new Date(p.created_at).getTime(); }));
        var mb = Math.max.apply(null, grupos[b].map(function(p){ return new Date(p.created_at).getTime(); }));
        return mb - ma;
    });

    nomes.forEach(function(nome){
        var lista = grupos[nome].slice().sort(function(a,b){ return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); });
        var totItens = 0, totValor = 0, cAb = 0, cFi = 0, cDe = 0;
        lista.forEach(function(p){
            totItens += parseInt(p.itens) || 0;
            totValor += parseFloat(p.total) || 0;
            if (p.status === 'finalizado') cFi++; else if (p.status === 'devolvido') cDe++; else cAb++;
        });
        var nomeHtml = nome.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        var nomeAttr = nome.toLowerCase().replace(/"/g,'&quot;');

        html += '<details class="ped-grupo" data-cliente-nome="' + nomeAttr + '">';
        html += '<summary>';
        html += '<div class="ped-grupo-main">';
        html += '<div class="ped-grupo-nome">' + nomeHtml + '</div>';
        html += '<div class="ped-grupo-res">' + lista.length + ' pedido(s) • ' + totItens + ' itens • R$ ' + totValor.toFixed(2).replace('.',',') + '</div>';
        html += '</div>';
        html += '<div class="ped-grupo-right">';
        html += '<div class="ped-grupo-pills">';
        if (cAb > 0) html += '<span class="ped-pill ab">' + cAb + ' ABERTO</span>';
        if (cFi > 0) html += '<span class="ped-pill fi">' + cFi + ' FINAL.</span>';
        if (cDe > 0) html += '<span class="ped-pill de">' + cDe + ' DEVOLV.</span>';
        html += '</div>';
        html += '<div class="ped-grupo-chevron">▼</div>';
        html += '</div>';
        html += '</summary>';
        html += '<div class="ped-grupo-corpo">';

        lista.forEach(function(p){
            var data = new Date(p.created_at).toLocaleDateString('pt-BR');
            var si = stInfo(p.status);
            html += '<div class="ped-linha">';
            html += '<div class="ped-linha-top">';
            html += '<div><div class="ped-linha-id">Pedido #' + p.id.toString().substr(0,8) + '</div>';
            html += '<div class="ped-linha-meta">' + data + ' • ' + (parseInt(p.itens)||0) + ' itens • R$ ' + parseFloat(p.total).toFixed(2).replace('.',',') + '</div></div>';
            html += '<span class="ped-status ' + si.c + '">' + si.t + '</span>';
            html += '</div>';
            html += '<div class="ped-linha-acoes">';
            html += '<button class="btn btn-sm btn-primary" onclick="verPedido(\'' + p.id + '\')">Ver</button>';
            if (p.status === 'aberto') {
                html += '<button class="btn btn-sm btn-outline" onclick="editarPedido(\'' + p.id + '\')">✏️ Editar</button>';
                html += '<button class="btn btn-sm btn-green" onclick="finalizarPedidoStatus(\'' + p.id + '\')">✅ Encerrar</button>';
                html += '<button class="btn btn-sm btn-warning" onclick="devolverPedido(\'' + p.id + '\')">↩️ Devolução</button>';
            }
            html += '<button class="btn btn-sm btn-outline" onclick="gerarPDFPedidoPorId(\'' + p.id + '\')">📄 PDF</button>';
            html += '</div>';
            html += '</div>';
        });

        html += '</div></details>';
    });

    return html;
}

// 🔥 NOVA FUNÇÃO: Editar Pedido
function editarPedido(pedidoId) {
    // 🚫 Bloqueio por dispositivo
    if (LIMITES.bloqueadoPorDispositivo) {
        toast('🔒 Ação bloqueada. Limite de dispositivos atingido. Libere um dispositivo nas Configurações.', 'error');
        return;
    }

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
                    if (pedido.itens_json) {
                        try {
                            itens = JSON.parse(pedido.itens_json);
                        } catch(e) {}
                    }
                    carregarPedidoParaEdicao(pedido, itens);
                }
            });
    } else {
        if (pedido.itens_json) {
            try {
                itens = JSON.parse(pedido.itens_json);
            } catch(e) {}
        }
        carregarPedidoParaEdicao(pedido, itens);
    }
}

function carregarPedidoParaEdicao(pedido, itens) {
    var cliente = clientes.find(function(c) { return c.id === pedido.cliente_id; });
    if (!cliente) {
        toast('Cliente não encontrado', 'error');
        return;
    }

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
    pedidoEmEdicao = pedido.id;

    toast('Editando pedido de ' + cliente.nome, 'success');
    mudarAba('scan');
}

async function finalizarPedidoStatus(pedidoId) {
    // 🚫 Bloqueio por dispositivo
    if (LIMITES.bloqueadoPorDispositivo) {
        toast('🔒 Ação bloqueada. Limite de dispositivos atingido. Libere um dispositivo nas Configurações.', 'error');
        return;
    }

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
    // 🚫 Bloqueio por dispositivo
    if (LIMITES.bloqueadoPorDispositivo) {
        toast('🔒 Ação bloqueada. Limite de dispositivos atingido. Libere um dispositivo nas Configurações.', 'error');
        return;
    }

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

    // ✅ MUDANÇA 3: botão Fechar agora chama fecharDevolucao()
    html += '<button class="btn btn-outline" onclick="fecharDevolucao()">Fechar</button>';
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');

    setTimeout(function() {
        carregarItensParaDevolucao(pedidoId);
    }, 100);
}

function abrirScannerDevolucao(pedidoId) {
    var readerDiv = document.getElementById('scanner-reader-devolucao');
    if (!readerDiv) return;
    if (readerDiv.dataset.ativo === '1') { pararScannerKayla(); readerDiv.dataset.ativo='0'; readerDiv.style.display='none'; return; }
    readerDiv.style.display='block'; readerDiv.dataset.ativo='1';
    iniciarScannerKayla('scanner-reader-devolucao', function(decodedText){
        var input=document.getElementById('scanner-codigo-devolucao');
        if(input){ input.value=decodedText; removerItemPorCodigo(pedidoId); }
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
        var jsonItens = [];
        if (pedido && pedido.itens_json) {
            try { jsonItens = JSON.parse(pedido.itens_json) || []; } catch(e) { jsonItens = []; }
        }
        if (jsonItens.length > 0 && isOnline && supabaseClient) {
            try {
                console.log('[Devolução] sem linhas no banco -> criando ' + jsonItens.length + ' a partir do resumo');
                var isUuid = function(s){ return typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s); };
                var rows = jsonItens.map(function(it){
                    var p = parseFloat(it.preco) || 0, q = parseInt(it.qtd) || 1;
                    return { pedido_id: pedidoId, produto_id: isUuid(it.produto_id) ? it.produto_id : null, nome: it.nome || 'Sem nome', codigo: it.codigo || '', preco: p, qtd: q, total: parseFloat(it.total) || (p * q), created_at: new Date().toISOString() };
                });
                var ins = await supabaseClient.from('pedido_itens').insert(rows).select();
                if (!ins.error && ins.data && ins.data.length > 0) { itens = ins.data; }
                else { console.warn('[Devolução] insert falhou:', ins && ins.error); itens = jsonItens; }
            } catch(e) { console.error('[Devolução] erro ao sincronizar:', e); itens = jsonItens; }
        } else {
            itens = jsonItens;
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
    // 🚫 Bloqueio por dispositivo
    if (LIMITES.bloqueadoPorDispositivo) {
        toast('🔒 Ação bloqueada. Limite de dispositivos atingido. Libere um dispositivo nas Configurações.', 'error');
        return;
    }

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
        // ✅ MUDANÇA 2: se zerou, fecha e atualiza a aba; senão redesenha a lista
        if (novosItens <= 0) { fecharModal(); if (typeof mudarAba === 'function') mudarAba('orders'); }
        else { carregarItensParaDevolucao(pedidoId); }
    } catch(e) {
        toast('Erro: ' + e.message, 'error');
        console.error(e);
    }
}

async function removerItemIndividual(pedidoId, idx, itemId) {
    // 🚫 Bloqueio por dispositivo
    if (LIMITES.bloqueadoPorDispositivo) {
        toast('🔒 Ação bloqueada. Limite de dispositivos atingido. Libere um dispositivo nas Configurações.', 'error');
        return;
    }

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
                // ✅ MUDANÇA 1: se zerou, fecha e atualiza a aba; senão redesenha a lista
                if (novosItensCount <= 0) { fecharModal(); if (typeof mudarAba === 'function') mudarAba('orders'); }
                else { carregarItensParaDevolucao(pedidoId); }

            } catch(e) {
                toast('Erro: ' + e.message, 'error');
                console.error('❌ Erro ao remover item:', e);
            }
        })();
    });
}

async function alterarQuantidadeItem(pedidoId, itemId, delta) {
    // 🚫 Bloqueio por dispositivo
    if (LIMITES.bloqueadoPorDispositivo) {
        toast('🔒 Ação bloqueada. Limite de dispositivos atingido. Libere um dispositivo nas Configurações.', 'error');
        return;
    }

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

// ============ HISTÓRICO ============

function renderizarHistorico() {
    var finalizados = pedidos.filter(function(p) { return p.status === 'finalizado'; });

    // Contar itens devolvidos
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

    // Agrupar pedidos por cliente
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

            html += '<div class="item-card" onclick="verPedidosCliente(\'' + nomeCliente.replace(/'/g, "\\\'") + '\')" style="cursor:pointer">';
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

    // ===== Coleta de dados (sem montar HTML ainda) =====
    var itensVendidos = [];
    var historicoDevolucoes = [];
    if (isOnline && supabaseClient) {
        try {
            var result = await supabaseClient
                .from('pedido_itens').select('*').eq('pedido_id', pedidoId)
                .order('created_at', { ascending: true });
            if (result.data) itensVendidos = result.data;
            if (pedido.historico_devolucoes) historicoDevolucoes = JSON.parse(pedido.historico_devolucoes);
        } catch(e) { console.error('Erro ao buscar detalhes:', e); }
    }
    if (itensVendidos.length === 0 && pedido.itens_json) {
        try { var jsonV = JSON.parse(pedido.itens_json); if (jsonV && jsonV.length > 0) itensVendidos = jsonV; } catch(e) {}
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

    // ===== Monta a tela =====
    var html = '<style>'
        + '.detalhe-tab{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:12px 8px;border-radius:10px;border:1px solid var(--border);background:var(--bg3);color:var(--text2);font-weight:700;font-size:13px;cursor:pointer;transition:transform .12s ease,background .18s ease,color .18s ease,box-shadow .18s ease,border-color .18s ease;}'
        + '.detalhe-tab:hover{transform:translateY(-1px);}'
        + '.detalhe-tab:active{transform:translateY(0) scale(.98);}'
        + '.detalhe-tab.ativo{background:var(--accent);color:#fff;border-color:var(--accent);box-shadow:0 6px 16px rgba(124,92,252,.35);}'
        + '.detalhe-tab-count{padding:1px 8px;border-radius:999px;font-size:11px;font-weight:800;background:var(--bg2);color:var(--text2);}'
        + '.detalhe-tab.ativo .detalhe-tab-count{background:rgba(255,255,255,.22);color:#fff;}'
        + '.detalhe-aba-panel{animation:detalheFade .22s ease;}'
        + '.detalhe-scroll{max-height:46vh;overflow-y:auto;-webkit-overflow-scrolling:touch;padding-right:4px;}'
        + '@keyframes detalheFade{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}'
        + '</style>';

    html += '<div class="modal-handle"></div>';
    html += '<div class="modal-title">📋 Detalhes do Pedido</div>';
    html += '<div class="modal-sub" style="font-size:16px;font-weight:700;color:var(--accent);margin-bottom:4px">' + pedido.cliente_nome + '</div>';
    html += '<div class="modal-sub">Pedido #' + pedidoId.toString().substr(0,8) + '</div>';

    // Cabeçalho
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">';
    html += '<div><div style="font-size:12px;color:var(--text2)">Data</div><div style="font-weight:600">' + new Date(pedido.created_at).toLocaleDateString('pt-BR') + '</div></div>';
    html += '<div><div style="font-size:12px;color:var(--text2)">Status</div><div style="font-weight:600;color:' + (pedido.status === 'finalizado' ? 'var(--success)' : 'var(--error)') + '">' + pedido.status.toUpperCase() + '</div></div>';
    html += '<div><div style="font-size:12px;color:var(--text2)">Total</div><div style="font-weight:700;color:var(--accent);font-size:18px">R$ ' + parseFloat(pedido.total).toFixed(2).replace('.',',') + '</div></div>';
    html += '<div><div style="font-size:12px;color:var(--text2)">Itens</div><div style="font-weight:600">' + pedido.itens + ' unidades</div></div>';
    html += '</div></div>';

    // Resumo financeiro (SEMPRE no topo)
    var liquido = parseFloat(pedido.total) - totalDevolvido;
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><span style="color:var(--text2)">Total Vendido</span><strong style="color:var(--success);font-size:16px">R$ ' + parseFloat(pedido.total).toFixed(2).replace('.',',') + '</strong></div>';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><span style="color:var(--text2)">Total Devolvido</span><strong style="color:var(--warning);font-size:16px">R$ ' + totalDevolvido.toFixed(2).replace('.',',') + '</strong></div>';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:2px solid var(--border)"><span style="font-weight:700">Líquido a Receber</span><strong style="color:var(--accent);font-size:20px">R$ ' + liquido.toFixed(2).replace('.',',') + '</strong></div>';
    html += '</div>';

    // Barra de abas
    html += '<div style="display:flex;gap:8px;margin-bottom:12px">';
    html += '<button id="detalhe-tab-vendidos" type="button" class="detalhe-tab ativo" onclick="alternarAbaDetalhes(\'vendidos\')">📦 Vendidos <span class="detalhe-tab-count">' + itensVendidos.length + '</span></button>';
    html += '<button id="detalhe-tab-historico" type="button" class="detalhe-tab" onclick="alternarAbaDetalhes(\'historico\')">↩️ Devoluções <span class="detalhe-tab-count">' + historicoDevolucoes.length + '</span></button>';
    html += '</div>';

    // Painel VENDIDOS
    html += '<div id="detalhe-aba-vendidos" class="detalhe-aba-panel">';
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
    if (itensVendidos.length === 0) {
        html += '<p style="color:var(--text2);text-align:center;padding:20px">Nenhum item encontrado</p>';
    } else {
        html += '<div class="detalhe-scroll">';
        itensVendidos.forEach(function(item) {
            var qtdVendida = parseInt(item.qtd) || 0;
            var qtdDevolvida = 0;
            qtdDevolvida += (itensDevolvidosMap['cod_' + (item.codigo || '')] || 0);
            qtdDevolvida += (itensDevolvidosMap['nome_' + (item.nome || '').toLowerCase().trim()] || 0);
            qtdDevolvida += (itensDevolvidosMap['id_' + (item.produto_id || '')] || 0);
            if (qtdDevolvida > qtdVendida) qtdDevolvida = qtdVendida;
            var qtdRestante = qtdVendida - qtdDevolvida;
            var itemTotal = parseFloat(item.total) || (parseFloat(item.preco) * qtdVendida) || 0;
            html += '<div style="background:#1a1a24;padding:12px;margin-bottom:8px;border-radius:8px">';
            html += '<div style="font-weight:600;font-size:14px;margin-bottom:4px">' + (item.nome || 'Sem nome') + '</div>';
            html += '<div style="font-size:12px;color:#a0a0b0;margin-bottom:8px">Código: ' + (item.codigo || 'N/A') + '</div>';
            html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:8px">';
            html += '<div style="background:#252530;padding:8px;border-radius:6px;text-align:center"><div style="font-size:11px;color:var(--text2)">Vendido</div><div style="font-weight:700;color:var(--success);font-size:16px">' + qtdVendida + 'x</div></div>';
            html += '<div style="background:#252530;padding:8px;border-radius:6px;text-align:center"><div style="font-size:11px;color:var(--text2)">Devolvido</div><div style="font-weight:700;color:' + (qtdDevolvida > 0 ? 'var(--warning)' : 'var(--text2)') + ';font-size:16px">' + qtdDevolvida + 'x</div></div>';
            html += '<div style="background:#252530;padding:8px;border-radius:6px;text-align:center"><div style="font-size:11px;color:var(--text2)">Restante</div><div style="font-weight:700;color:var(--accent);font-size:16px">' + qtdRestante + 'x</div></div>';
            html += '</div>';
            html += '<div style="display:flex;justify-content:space-between;margin-top:8px;padding-top:8px;border-top:1px solid var(--border)"><div style="font-size:12px;color:var(--text2)">R$ ' + parseFloat(item.preco || 0).toFixed(2).replace('.',',') + ' un</div><div style="font-weight:700;color:var(--accent)">R$ ' + itemTotal.toFixed(2).replace('.',',') + '</div></div>';
            html += '</div>';
        });
        html += '</div>';
    }
    html += '</div></div>';

    // Painel DEVOLUÇÕES
    html += '<div id="detalhe-aba-historico" class="detalhe-aba-panel" style="display:none">';
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
    if (historicoDevolucoes.length === 0) {
        html += '<p style="color:var(--text2);text-align:center;padding:20px">Nenhuma devolução registrada</p>';
    } else {
        html += '<div class="detalhe-scroll">';
        historicoDevolucoes.forEach(function(dev) {
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
    html += '</div></div>';

    // Botões finais
    html += '<button class="btn btn-primary" onclick="gerarPDFPedidoPorId(\'' + pedidoId + '\')" style="margin-bottom:8px;width:100%">📄 Gerar PDF</button>';
    html += '<button class="btn btn-outline" onclick="fecharModal()" style="width:100%">Fechar</button>';

    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
}

function alternarAbaDetalhes(qual) {
    var tv = document.getElementById('detalhe-tab-vendidos');
    var th = document.getElementById('detalhe-tab-historico');
    var pv = document.getElementById('detalhe-aba-vendidos');
    var ph = document.getElementById('detalhe-aba-historico');
    if (!tv || !th || !pv || !ph) return;
    var v = (qual === 'vendidos');
    tv.className = 'detalhe-tab' + (v ? ' ativo' : '');
    th.className = 'detalhe-tab' + (v ? '' : ' ativo');
    pv.style.display = v ? 'block' : 'none';
    ph.style.display = v ? 'none' : 'block';
    var ativo = v ? pv : ph;
    ativo.classList.remove('detalhe-aba-panel'); void ativo.offsetWidth; ativo.classList.add('detalhe-aba-panel');
}
window.alternarAbaDetalhes = alternarAbaDetalhes;

function verPedido(pedidoId) {
    if (typeof verDetalhesPedidoHistorico === 'function') return verDetalhesPedidoHistorico(pedidoId);
    toast('Detalhes indisponíveis', 'error');
}
window.verPedido = verPedido;

// ✅ MUDANÇA 4: Fechar devolução desliga a câmera e atualiza a aba Pedidos
function fecharDevolucao() {
    try { if (typeof html5QrCodeDevolucao !== 'undefined' && html5QrCodeDevolucao) { html5QrCodeDevolucao.stop(); html5QrCodeDevolucao = null; } } catch(e){}
    fecharModal();
    if (typeof mudarAba === 'function') mudarAba('orders');
}
window.fecharDevolucao = fecharDevolucao;

function filtrarPedidosCliente(valor) {
    var v = (valor || '').toLowerCase().trim();
    var gruposEls = document.querySelectorAll('.ped-grupo[data-cliente-nome]');
    gruposEls.forEach(function(el){
        var nome = (el.getAttribute('data-cliente-nome') || '');
        el.style.display = (!v || nome.indexOf(v) >= 0) ? '' : 'none';
    });
}
window.filtrarPedidosCliente = filtrarPedidosCliente;

console.log('✅ Orders.js carregado (Modo Somente Leitura Ativo)');
