// ============ GERAÇÃO DE PDF ============

async function gerarPDFPedido(pedido) {
    // Verificar se é PRO
    var isPro = LIMITES.proAtivo || localStorage.getItem('kayla_plano') === 'pro';
    
    if (!isPro) {
        mostrarModalUpgradePDF();
        return;
    }
    
    try {
        var { jsPDF } = window.jspdf;
        var doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // ========== CABEÇALHO E INFORMAÇÕES DA EMPRESA ==========
        var nomeEmpresa = configEmpresa.nome || 'Kayla - Venda Consignada';
        var logoLocal = localStorage.getItem('kayla_logo_local');
        var y = 15;

        // Logo e nome da empresa
        if (logoLocal) {
            try {
                // Logo à esquerda
                doc.addImage(logoLocal, 'PNG', 15, y, 25, 15);
                
                // Nome da empresa à direita do logo
                doc.setFontSize(18);
                doc.setTextColor(124, 92, 252); // Roxo Kayla
                doc.setFont('helvetica', 'bold');
                doc.text(nomeEmpresa, 50, y + 11);
            } catch(e) {
                // Fallback se o logo falhar
                doc.setFontSize(22);
                doc.setTextColor(124, 92, 252);
                doc.setFont('helvetica', 'bold');
                doc.text(nomeEmpresa, 105, y + 10, { align: 'center' });
            }
        } else {
            // Sem logo, nome centralizado
            doc.setFontSize(22);
            doc.setTextColor(124, 92, 252);
            doc.setFont('helvetica', 'bold');
            doc.text(nomeEmpresa, 105, y + 10, { align: 'center' });
        }

        // Informações da empresa (CNPJ, Endereço, Telefone)
        y = 35;
        doc.setFontSize(8);
        doc.setTextColor(80);
        doc.setFont('helvetica', 'normal');

        if (logoLocal) {
            // Se tiver logo, alinha as informações abaixo da linha do logo
            var xInfo = 15;
            if (configEmpresa.cnpj) doc.text('CNPJ/CPF: ' + configEmpresa.cnpj, xInfo, y);
            if (configEmpresa.endereco) doc.text(configEmpresa.endereco, xInfo, y + 4);
            if (configEmpresa.telefone) doc.text('Tel: ' + configEmpresa.telefone, xInfo, y + 8);
        } else {
            // Sem logo, centraliza as informações
            if (configEmpresa.cnpj) doc.text('CNPJ/CPF: ' + configEmpresa.cnpj, 105, y, { align: 'center' });
            if (configEmpresa.endereco) doc.text(configEmpresa.endereco, 105, y + 4, { align: 'center' });
            if (configEmpresa.telefone) doc.text('Tel: ' + configEmpresa.telefone, 105, y + 8, { align: 'center' });
        }

        // Linha separadora após as informações da empresa
        y += 14;
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(15, y, 195, y);

        // ========== TÍTULO ==========
        y += 12;
        doc.setFontSize(14);
        doc.setTextColor(40);
        doc.setFont('helvetica', 'bold');
        doc.text('PEDIDO DE VENDA', 105, y, { align: 'center' });

        // ========== INFORMAÇÕES DO PEDIDO ==========
        y += 10;
        doc.setDrawColor(220, 220, 220);
        doc.setFillColor(248, 249, 250); // Cinza muito claro
        doc.rect(15, y - 5, 180, 35, 'F'); // Box do pedido

        doc.setFontSize(10);
        doc.setTextColor(80);
        doc.setFont('helvetica', 'normal');
        doc.text('Pedido #' + pedido.id.toString().substr(0,8), 20, y + 5);
        doc.text('Data: ' + new Date(pedido.created_at).toLocaleDateString('pt-BR'), 20, y + 12);
        doc.text('Status: ' + pedido.status.toUpperCase(), 20, y + 19);

        // ========== CLIENTE EM DESTAQUE ==========
        y += 45;
        doc.setFillColor(242, 236, 255); // Roxo bem claro (soft)
        doc.setDrawColor(124, 92, 252);
        doc.roundedRect(15, y - 6, 180, 14, 3, 3, 'FD'); // Card arredondado
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(60);
        doc.text('Cliente: ' + pedido.cliente_nome, 20, y + 4); // ✅ SEM O EMOJI, APENAS TEXTO LIMPO

        // ========== ITENS DO PEDIDO ==========
        y += 24;
        doc.setDrawColor(0);
        doc.setLineWidth(0.3);
        doc.line(15, y, 195, y); // Linha separadora
        y += 8;

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        doc.text('Itens do Pedido:', 15, y);
        y += 8;

        // Cabeçalho da tabela (Fundo escuro moderno)
        doc.setFillColor(44, 44, 52); // bg2
        doc.setDrawColor(44, 44, 52);
        doc.rect(15, y - 4, 180, 8, 'FD');

        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('PRODUTO', 20, y + 2);
        doc.text('QTD', 105, y + 2, { align: 'center' });
        doc.text('PREÇO UNIT.', 135, y + 2, { align: 'right' });
        doc.text('TOTAL', 185, y + 2, { align: 'right' });

        // Linha separadora
        y += 10;
        doc.setDrawColor(0);
        doc.setLineWidth(0.2);
        doc.line(15, y, 195, y);

        // ========== LISTA DE ITENS ==========
        var itens = [];
        if (isOnline && supabaseClient) {
            try {
                var result = await supabaseClient
                    .from('pedido_itens')
                    .select('*')
                    .eq('pedido_id', pedido.id)
                    .order('created_at', { ascending: true });
                
                if (result.data) { itens = result.data; }
            } catch(e) { console.error('Erro ao buscar itens:', e); }
        }
        if (itens.length === 0 && pedido.itens_json) {
            try { itens = JSON.parse(pedido.itens_json); } catch(e) {}
        }

        y += 4;
        if (itens.length > 0) {
            itens.forEach(function(item) {
                var nome = item.nome || 'Sem nome';
                var codigo = item.codigo || '';
                var qtd = parseInt(item.qtd) || 0;
                var preco = parseFloat(item.preco) || 0;
                var total = parseFloat(item.total) || (qtd * preco);
                
                // Nome do produto
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0);
                doc.text(nome, 20, y);
                
                // Código
                if (codigo) {
                    doc.setFontSize(7);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(120);
                    doc.text('Cód: ' + codigo, 20, y + 4);
                }
                
                // Quantidade
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(0);
                doc.text(qtd + 'x', 105, y + 2, { align: 'center' });
                
                // Preço unitário
                doc.text('R$ ' + preco.toFixed(2).replace('.',','), 135, y + 2, { align: 'right' });
                
                // Total
                doc.setFont('helvetica', 'bold');
                doc.text('R$ ' + total.toFixed(2).replace('.',','), 185, y + 2, { align: 'right' });
                doc.setFont('helvetica', 'normal');
                
                // Linha separadora (tracejada/leve)
                y += 12;
                doc.setDrawColor(200, 200, 200);
                doc.setLineWidth(0.2);
                doc.line(15, y, 195, y);
                y += 4;
            });
        } else {
            doc.setFontSize(9);
            doc.setTextColor(150);
            doc.text('Nenhum item encontrado', 105, y + 4, { align: 'center' });
            y += 10;
        }

        // ========== TOTAL GERAL ==========
        y += 6;
        doc.setDrawColor(0);
        doc.setLineWidth(0.8);
        doc.line(120, y, 195, y); // Linha grossa antes do total
        y += 10;

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        doc.text('TOTAL:', 140, y, { align: 'right' });
        doc.setFontSize(16);
        doc.setTextColor(124, 92, 252); // Roxo Kayla
        doc.text('R$ ' + parseFloat(pedido.total).toFixed(2).replace('.',','), 185, y, { align: 'right' });
        
        // Linha após total
        y += 8;
        doc.setDrawColor(0);
        doc.setLineWidth(0.8);
        doc.line(120, y, 195, y);

        // ========== RODAPÉ ==========
        y += 16;
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.setFont('helvetica', 'italic');
        doc.text('Gerado em: ' + new Date().toLocaleString('pt-BR'), 105, y, { align: 'center' });
        doc.text('Obrigado pela preferência!', 105, y + 5, { align: 'center' });

        // ========== SALVAR / COMPARTILHAR ==========
        var pdfBlob = doc.output('blob');
        var filename = 'Pedido-' + pedido.id.toString().substr(0,8) + '.pdf';
        
        setTimeout(function() {
            if (confirm('✅ PDF gerado com sucesso!\n\nDeseja compartilhar com o cliente?')) {
                if (navigator.share && navigator.canShare) {
                    var file = new File([pdfBlob], filename, { type: 'application/pdf' });
                    if (navigator.canShare({ files: [file] })) {
                        navigator.share({
                            title: 'Pedido #' + pedido.id.toString().substr(0,8),
                            text: 'Segue o pedido de ' + pedido.cliente_nome,
                            files: [file]
                        }).catch(function(error) {
                            doc.save(filename);
                        });
                    } else { doc.save(filename); }
                } else { doc.save(filename); }
            } else { doc.save(filename); }
        }, 500);
        
        toast('📄 PDF gerado!', 'success');
        
    } catch(error) {
        toast('Erro ao gerar PDF: ' + error.message, 'error');
        console.error('Erro ao gerar PDF:', error);
    }
}

// ============ MODAL DE UPGRADE (Recurso PRO) ============

function mostrarModalUpgradePDF() {
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">🔒 Recurso PRO</div>';
    html += '<div style="text-align:center;margin:20px 0">';
    html += '<div style="font-size:64px;margin-bottom:16px">📄</div>';
    html += '<div style="font-size:18px;font-weight:600;margin-bottom:8px;color:var(--accent)">Geração de PDF</div>';
    html += '<div style="font-size:14px;color:var(--text2);margin-bottom:24px">A geração de PDFs personalizados está disponível apenas no plano PRO</div>';
    html += '<div style="background:var(--bg3);border-radius:12px;padding:20px;margin-bottom:20px">';
    html += '<div style="font-size:14px;font-weight:600;margin-bottom:12px;color:var(--text)">Benefícios do PRO:</div>';
    html += '<ul style="text-align:left;font-size:13px;color:var(--text2);padding-left:20px;margin:0">';
    html += '<li style="margin-bottom:8px">✅ Geração ilimitada de PDFs</li>';
    html += '<li style="margin-bottom:8px">✅ Logotipo da empresa nos PDFs</li>';
    html += '<li style="margin-bottom:8px">✅ Compartilhamento direto</li>';
    html += '<li style="margin-bottom:8px">✅ Clientes ilimitados</li>';
    html += '<li style="margin-bottom:8px">✅ Produtos ilimitados</li>';
    html += '<li>✅ Pedidos ilimitados</li>';
    html += '</ul></div>';
    html += '<div style="background:linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%);border-radius:12px;padding:20px;margin-bottom:20px;text-align:center">';
    html += '<div style="font-size:13px;color:rgba(255,255,255,0.9);margin-bottom:4px">Plano PRO</div>';
    html += '<div style="font-size:14px;color:rgba(255,255,255,0.8);margin-bottom:4px">A partir de</div>';
    html += '<div style="font-size:32px;font-weight:700;color:#fff;margin-bottom:4px">R$ 19,90<span style="font-size:14px;font-weight:400">/mês</span></div>';
    html += '<div style="font-size:11px;color:rgba(255,255,255,0.8)">Cancele quando quiser</div>';
    html += '</div>';
    html += '<button class="btn btn-primary" onclick="fecharModal(); toast(\'Em breve! Entre em contato: contato@kayla.app.br\', \'warning\')" style="margin-bottom:12px">🚀 Assinar Plano PRO</button>';
    html += '<button class="btn btn-outline" onclick="fecharModal()">Depois eu assino</button>';
    html += '</div>';
    
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
}

console.log('✅ PDF.js carregado (Versão Final com Design Moderno e Dados da Empresa)');
