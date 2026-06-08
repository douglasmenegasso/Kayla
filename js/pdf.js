// ============ GERAÇÃO DE PDF ============

async function gerarPDFPedido(pedido) {
    try {
        var { jsPDF } = window.jspdf;
        var doc = new jsPDF();
        
        // Cabeçalho com logo
        var logoLocal = localStorage.getItem('kayla_logo_local');
        if (logoLocal) {
            try {
                doc.addImage(logoLocal, 'PNG', 15, 10, 35, 17);
            } catch(e) {}
        }
        
        // Nome da empresa
        doc.setFontSize(14);
        doc.setTextColor(124, 92, 252);
        doc.setFont(undefined, 'bold');
        doc.text(configEmpresa.nome || 'Kayla - Venda Consignada', 105, 15, { align: 'center' });
        doc.setFont(undefined, 'normal');
        
        // Dados da empresa
        doc.setFontSize(8);
        doc.setTextColor(100);
        var yEmpresa = 21;
        if (configEmpresa.cnpj) {
            doc.text('CNPJ/CPF: ' + configEmpresa.cnpj, 105, yEmpresa, { align: 'center' });
            yEmpresa += 4;
        }
        if (configEmpresa.endereco) {
            doc.text(configEmpresa.endereco, 105, yEmpresa, { align: 'center' });
            yEmpresa += 4;
        }
        if (configEmpresa.telefone) {
            doc.text('Tel: ' + configEmpresa.telefone, 105, yEmpresa, { align: 'center' });
            yEmpresa += 4;
        }
        
        // Linha separadora
        doc.setDrawColor(200);
        doc.setLineWidth(0.2);
        doc.line(10, 35, 200, 35);
        
        // Título
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.setFont(undefined, 'bold');
        doc.text('PEDIDO DE VENDA', 105, 43, { align: 'center' });
        doc.setFont(undefined, 'normal');
        
        // Linha separadora
        doc.setDrawColor(220);
        doc.setLineWidth(0.1);
        doc.line(10, 47, 200, 47);
        
        // Informações do pedido
        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.text('Pedido #' + pedido.id.toString().substr(0,8), 15, 55);
        doc.text('Data: ' + new Date(pedido.created_at).toLocaleDateString('pt-BR'), 15, 61);
        doc.text('Status: ' + pedido.status.toUpperCase(), 15, 67);
        
        // Cliente em destaque
        doc.setFillColor(245, 245, 245);
        doc.rect(15, 72, 180, 12, 'F');
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('Cliente: ' + pedido.cliente_nome, 20, 80);
        doc.setFont(undefined, 'normal');
        
        // Linha separadora
        doc.setDrawColor(200);
        doc.setLineWidth(0.2);
        doc.line(10, 90, 200, 90);
        
        // Título dos itens
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('Itens do Pedido:', 15, 98);
        
        // Cabeçalho da tabela
        doc.setFontSize(8);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(100);
        doc.text('PRODUTO', 20, 105);
        doc.text('QTD', 105, 105, { align: 'center' });
        doc.text('PREÇO UNIT.', 135, 105, { align: 'right' });
        doc.text('TOTAL', 185, 105, { align: 'right' });
        
        // Linha separadora
        doc.setDrawColor(200);
        doc.setLineWidth(0.1);
        doc.line(15, 107, 195, 107);
        
        var y = 115;
        var itens = [];
        
        // Buscar itens
        if (isOnline && supabaseClient) {
            try {
                var result = await supabaseClient
                    .from('pedido_itens')
                    .select('*')
                    .eq('pedido_id', pedido.id)
                    .order('created_at', { ascending: true });
                
                if (result.data) {
                    itens = result.data;
                }
            } catch(e) {
                console.error('Erro ao buscar itens:', e);
            }
        }
        
        if (itens.length === 0 && pedido.itens_json) {
            try {
                itens = JSON.parse(pedido.itens_json);
            } catch(e) {}
        }
        
        // Listar itens
        if (itens.length > 0) {
            itens.forEach(function(item, index) {
                var nome = item.nome || 'Sem nome';
                var codigo = item.codigo || '';
                var qtd = parseInt(item.qtd) || 0;
                var preco = parseFloat(item.preco) || 0;
                var total = parseFloat(item.total) || (qtd * preco);
                
                // Fundo alternado
                if (index % 2 === 0) {
                    doc.setFillColor(250, 250, 250);
                    doc.rect(15, y - 6, 180, 12, 'F');
                }
                
                // Nome do produto
                doc.setFontSize(9);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(0);
                doc.text(nome, 20, y);
                
                // Código (embaixo do nome)
                if (codigo) {
                    doc.setFontSize(7);
                    doc.setFont(undefined, 'normal');
                    doc.setTextColor(120);
                    doc.text('Cód: ' + codigo, 20, y + 4);
                }
                
                // Quantidade (centralizado verticalmente)
                doc.setFontSize(9);
                doc.setFont(undefined, 'normal');
                doc.setTextColor(0);
                doc.text(qtd + 'x', 105, y + 2, { align: 'center' });
                
                // Preço unitário (alinhado à direita, centralizado verticalmente)
                doc.text('R$ ' + preco.toFixed(2).replace('.',','), 135, y + 2, { align: 'right' });
                
                // Total (alinhado à direita, centralizado verticalmente)
                doc.setFont(undefined, 'bold');
                doc.text('R$ ' + total.toFixed(2).replace('.',','), 185, y + 2, { align: 'right' });
                doc.setFont(undefined, 'normal');
                
                // Linha separadora ABAIXO do código
                doc.setDrawColor(230);
                doc.setLineWidth(0.1);
                doc.line(15, y + 9, 195, y + 9);
                
                y += 13; // Mais espaço entre itens
            });
        } else {
            doc.setFontSize(9);
            doc.setTextColor(150);
            doc.text('Nenhum item encontrado', 20, y);
            y += 8;
        }
        
        // Linha separadora antes do total
        y += 4;
        doc.setDrawColor(200);
        doc.setLineWidth(0.2);
        doc.line(15, y, 195, y);
        y += 8;
        
        // Total
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0);
        doc.text('TOTAL:', 140, y, { align: 'right' });
        doc.setFontSize(13);
        doc.setTextColor(124, 92, 252);
        doc.text('R$ ' + parseFloat(pedido.total).toFixed(2).replace('.',','), 185, y, { align: 'right' });
        
        // Linha separadora
        doc.setDrawColor(200);
        doc.setLineWidth(0.2);
        doc.line(15, y + 3, 195, y + 3);
        
        // Rodapé
        y += 12;
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.setFont(undefined, 'normal');
        doc.text('Gerado em: ' + new Date().toLocaleString('pt-BR'), 105, y, { align: 'center' });
        doc.text('Obrigado pela preferência!', 105, y + 4, { align: 'center' });
        
        // Gerar PDF
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
                    } else {
                        doc.save(filename);
                    }
                } else {
                    doc.save(filename);
                }
            } else {
                doc.save(filename);
            }
        }, 500);
        
        toast(' PDF gerado!', 'success');
        
    } catch(error) {
        toast('Erro ao gerar PDF: ' + error.message, 'error');
        console.error('Erro ao gerar PDF:', error);
    }
}
console.log('✅ PDF.js carregado');
