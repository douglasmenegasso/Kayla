// ============ GERAÇÃO DE PDF ============

async function gerarPDFPedido(pedido) {
    try {
        var { jsPDF } = window.jspdf;
        var doc = new jsPDF();
        
        // Cabeçalho com logo
        var logoLocal = localStorage.getItem('kayla_logo_local');
        if (logoLocal) {
            try {
                doc.addImage(logoLocal, 'PNG', 15, 10, 40, 20);
            } catch(e) {}
        }
        
        // Nome da empresa centralizado
        doc.setFontSize(16);
        doc.setTextColor(124, 92, 252);
        doc.setFont(undefined, 'bold');
        doc.text(configEmpresa.nome || 'Kayla - Venda Consignada', 105, 15, { align: 'center' });
        doc.setFont(undefined, 'normal');
        
        // Dados da empresa
        doc.setFontSize(9);
        doc.setTextColor(100);
        var yEmpresa = 22;
        if (configEmpresa.cnpj) {
            doc.text('CNPJ/CPF: ' + configEmpresa.cnpj, 105, yEmpresa, { align: 'center' });
            yEmpresa += 5;
        }
        if (configEmpresa.endereco) {
            doc.text(configEmpresa.endereco, 105, yEmpresa, { align: 'center' });
            yEmpresa += 5;
        }
        if (configEmpresa.telefone) {
            doc.text('Tel: ' + configEmpresa.telefone, 105, yEmpresa, { align: 'center' });
            yEmpresa += 5;
        }
        
        // Linha separadora
        doc.setDrawColor(200);
        doc.setLineWidth(0.5);
        doc.line(10, 38, 200, 38);
        
        // Título
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.setFont(undefined, 'bold');
        doc.text('PEDIDO DE VENDA', 105, 48, { align: 'center' });
        doc.setFont(undefined, 'normal');
        
        // Linha separadora
        doc.setDrawColor(220);
        doc.setLineWidth(0.3);
        doc.line(10, 53, 200, 53);
        
        // Informações do pedido
        doc.setFontSize(11);
        doc.setTextColor(0);
        doc.text('Pedido #' + pedido.id.toString().substr(0,8), 15, 63);
        doc.text('Data: ' + new Date(pedido.created_at).toLocaleDateString('pt-BR'), 15, 70);
        doc.text('Status: ' + pedido.status.toUpperCase(), 15, 77);
        
        // Cliente em destaque com fundo
        doc.setFillColor(240, 240, 240);
        doc.rect(15, 83, 180, 15, 'F');
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Cliente: ' + pedido.cliente_nome, 20, 93);
        doc.setFont(undefined, 'normal');
        
        // Linha separadora
        doc.setDrawColor(200);
        doc.setLineWidth(0.5);
        doc.line(10, 105, 200, 105);
        
        // Título dos itens
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('Itens do Pedido:', 15, 115);
        
        // Cabeçalho da tabela de itens
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(100);
        doc.text('PRODUTO', 20, 123);
        doc.text('QTD', 120, 123);
        doc.text('PREÇO', 150, 123);
        doc.text('TOTAL', 180, 123);
        
        // Linha separadora
        doc.setDrawColor(200);
        doc.setLineWidth(0.3);
        doc.line(15, 125, 195, 125);
        
        var y = 135;
        var itens = [];
        
        // Buscar itens da tabela pedido_itens (online)
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
        
        // Se não encontrou, tentar do itens_json (offline)
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
                
                // Alternar cores de fundo para melhor leitura
                if (index % 2 === 0) {
                    doc.setFillColor(248, 248, 248);
                    doc.rect(15, y - 7, 180, 10, 'F');
                }
                
                // Nome do produto
                doc.setFontSize(10);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(0);
                doc.text(nome, 20, y);
                
                // Código (se tiver) - embaixo do nome
                if (codigo) {
                    doc.setFontSize(8);
                    doc.setFont(undefined, 'normal');
                    doc.setTextColor(100);
                    doc.text('Cód: ' + codigo, 20, y + 4);
                }
                
                // Quantidade
                doc.setFontSize(10);
                doc.setFont(undefined, 'normal');
                doc.setTextColor(0);
                doc.text(qtd + 'x', 120, y);
                
                // Preço unitário
                doc.text('R$ ' + preco.toFixed(2).replace('.',','), 150, y);
                
                // Total do item
                doc.setFont(undefined, 'bold');
                doc.text('R$ ' + total.toFixed(2).replace('.',','), 180, y);
                doc.setFont(undefined, 'normal');
                
                // Linha separadora entre itens
                doc.setDrawColor(220);
                doc.setLineWidth(0.2);
                doc.line(15, y + 2, 195, y + 2);
                
                y += 14; // Mais espaço entre itens
            });
        } else {
            doc.setFontSize(10);
            doc.setTextColor(150);
            doc.text('Nenhum item encontrado', 20, y);
            y += 10;
        }
        
        // Linha separadora antes do total
        y += 5;
        doc.setDrawColor(200);
        doc.setLineWidth(0.5);
        doc.line(15, y, 195, y);
        y += 12;
        
        // Total
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0);
        doc.text('TOTAL:', 140, y);
        doc.setFontSize(16);
        doc.setTextColor(124, 92, 252);
        doc.text('R$ ' + parseFloat(pedido.total).toFixed(2).replace('.',','), 180, y);
        
        // Linha separadora
        doc.setDrawColor(200);
        doc.setLineWidth(0.5);
        doc.line(15, y + 4, 195, y + 4);
        
        // Rodapé
        y += 18;
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.setFont(undefined, 'normal');
        doc.text('Gerado em: ' + new Date().toLocaleString('pt-BR'), 105, y, { align: 'center' });
        doc.text('Obrigado pela preferência!', 105, y + 5, { align: 'center' });
        
        // Gerar PDF como blob
        var pdfBlob = doc.output('blob');
        var pdfUrl = URL.createObjectURL(pdfBlob);
        
        // Nome do arquivo
        var filename = 'Pedido-' + pedido.id.toString().substr(0,8) + '.pdf';
        
        // Mostrar opções de download/compartilhamento
        setTimeout(function() {
            if (confirm('✅ PDF gerado com sucesso!\n\nDeseja compartilhar com o cliente?')) {
                // Tentar usar Web Share API (mobile)
                if (navigator.share && navigator.canShare) {
                    var file = new File([pdfBlob], filename, { type: 'application/pdf' });
                    if (navigator.canShare({ files: [file] })) {
                        navigator.share({
                            title: 'Pedido #' + pedido.id.toString().substr(0,8),
                            text: 'Segue o pedido de ' + pedido.cliente_nome,
                            files: [file]
                        }).catch(function(error) {
                            console.log('Erro ao compartilhar:', error);
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
