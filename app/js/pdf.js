// ============ GERAÇÃO DE PDF ============

async function gerarPDFPedido(pedido) {
    // Verificar se é PRO
    var isPro = LIMITES.proAtivo || localStorage.getItem('kayla_plano') === 'pro';
    
    if (!isPro) {
        toast('🔒 Geração de PDF disponível apenas no plano PRO\n\nAssine o plano PRO para usar esta função', 'error');
        return;
    }
    
    try {
        var { jsPDF } = window.jspdf;
        var doc = new jsPDF();
        
        // Nome do app no topo
        doc.setFontSize(16);
        doc.setTextColor(124, 92, 252);
        doc.setFont(undefined, 'bold');
        doc.text(configEmpresa.nome || 'Kayla - Venda Consignada', 105, 15, { align: 'center' });
        doc.setFont(undefined, 'normal');
        
        // Linha separadora
        doc.setDrawColor(0);
        doc.setLineWidth(0.3);
        doc.line(10, 20, 200, 20);
        
        // Logo e informações da empresa
        var logoLocal = localStorage.getItem('kayla_logo_local');
        var yInfo = 25;
        
        if (logoLocal) {
            try {
                doc.addImage(logoLocal, 'PNG', 15, yInfo, 30, 15);
                doc.setFontSize(8);
                doc.setTextColor(80);
                var xInfo = 50;
                if (configEmpresa.cnpj) doc.text('CNPJ/CPF: ' + configEmpresa.cnpj, xInfo, yInfo + 4);
                if (configEmpresa.endereco) doc.text(configEmpresa.endereco, xInfo, yInfo + 9);
                if (configEmpresa.telefone) doc.text('Tel: ' + configEmpresa.telefone, xInfo, yInfo + 14);
            } catch(e) {
                doc.setFontSize(8);
                doc.setTextColor(80);
                if (configEmpresa.cnpj) doc.text('CNPJ/CPF: ' + configEmpresa.cnpj, 15, yInfo + 4);
                if (configEmpresa.endereco) doc.text(configEmpresa.endereco, 15, yInfo + 9);
                if (configEmpresa.telefone) doc.text('Tel: ' + configEmpresa.telefone, 15, yInfo + 14);
            }
        } else {
            doc.setFontSize(8);
            doc.setTextColor(80);
            if (configEmpresa.cnpj) doc.text('CNPJ/CPF: ' + configEmpresa.cnpj, 105, yInfo + 4, { align: 'center' });
            if (configEmpresa.endereco) doc.text(configEmpresa.endereco, 105, yInfo + 9, { align: 'center' });
            if (configEmpresa.telefone) doc.text('Tel: ' + configEmpresa.telefone, 105, yInfo + 14, { align: 'center' });
        }
        
        // Linha separadora
        doc.setDrawColor(0);
        doc.setLineWidth(0.3);
        doc.line(10, 45, 200, 45);
        
        // Título
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.setFont(undefined, 'bold');
        doc.text('PEDIDO DE VENDA', 105, 53, { align: 'center' });
        doc.setFont(undefined, 'normal');
        
        // Linha separadora
        doc.setDrawColor(0);
        doc.setLineWidth(0.3);
        doc.line(10, 57, 200, 57);
        
        // Informações do pedido
        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.text('Pedido #' + pedido.id.toString().substr(0,8), 15, 65);
        doc.text('Data: ' + new Date(pedido.created_at).toLocaleDateString('pt-BR'), 15, 71);
        doc.text('Status: ' + pedido.status.toUpperCase(), 15, 77);
        
        // Cliente em destaque
        doc.setFillColor(245, 245, 245);
        doc.rect(15, 82, 180, 12, 'F');
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('Cliente: ' + pedido.cliente_nome, 20, 90);
        doc.setFont(undefined, 'normal');
        
        // Linha separadora
        doc.setDrawColor(0);
        doc.setLineWidth(0.3);
        doc.line(10, 100, 200, 100);
        
        // Título dos itens
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('Itens do Pedido:', 15, 108);
        
        // Cabeçalho da tabela
        doc.setFontSize(8);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(80);
        doc.text('PRODUTO', 20, 115);
        doc.text('QTD', 105, 115, { align: 'center' });
        doc.text('PREÇO UNIT.', 135, 115, { align: 'right' });
        doc.text('TOTAL', 185, 115, { align: 'right' });
        
        // Linha separadora
        doc.setDrawColor(0);
        doc.setLineWidth(0.3);
        doc.line(15, 117, 195, 117);
        
        var y = 125;
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
        
        // Listar itens - SEM FAIXAS, APENAS LINHAS
        if (itens.length > 0) {
            itens.forEach(function(item) {
                var nome = item.nome || 'Sem nome';
                var codigo = item.codigo || '';
                var qtd = parseInt(item.qtd) || 0;
                var preco = parseFloat(item.preco) || 0;
                var total = parseFloat(item.total) || (qtd * preco);
                
                // Nome do produto
                doc.setFontSize(9);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(0);
                doc.text(nome, 20, y);
                
                // Código
                if (codigo) {
                    doc.setFontSize(7);
                    doc.setFont(undefined, 'normal');
                    doc.setTextColor(100);
                    doc.text('Cód: ' + codigo, 20, y + 4);
                }
                
                // Quantidade
                doc.setFontSize(9);
                doc.setFont(undefined, 'normal');
                doc.setTextColor(0);
                doc.text(qtd + 'x', 105, y + 2, { align: 'center' });
                
                // Preço unitário
                doc.text('R$ ' + preco.toFixed(2).replace('.',','), 135, y + 2, { align: 'right' });
                
                // Total
                doc.setFont(undefined, 'bold');
                doc.text('R$ ' + total.toFixed(2).replace('.',','), 185, y + 2, { align: 'right' });
                doc.setFont(undefined, 'normal');
                
                // Linha preta separando itens
                doc.setDrawColor(0);
                doc.setLineWidth(0.3);
                doc.line(15, y + 9, 195, y + 9);
                
                y += 13;
            });
        } else {
            doc.setFontSize(9);
            doc.setTextColor(150);
            doc.text('Nenhum item encontrado', 20, y);
            y += 8;
        }
        
        // Linha antes do total
        y += 4;
        doc.setDrawColor(0);
        doc.setLineWidth(0.3);
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
        
        // Linha após total
        doc.setDrawColor(0);
        doc.setLineWidth(0.3);
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
