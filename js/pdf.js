// ============ GERAÇÃO DE PDF ============

async function gerarPDFPedido(pedido) {
    try {
        var { jsPDF } = window.jspdf;
        var doc = new jsPDF();
        
        var logoLocal = localStorage.getItem('kayla_logo_local');
        if (logoLocal) {
            try {
                doc.addImage(logoLocal, 'PNG', 15, 10, 40, 20);
            } catch(e) {}
        }
        
        doc.setFontSize(16);
        doc.setTextColor(124, 92, 252);
        doc.text(configEmpresa.nome || 'Kayla - Venda Consignada', 105, 15, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        if (configEmpresa.cnpj) doc.text('CNPJ/CPF: ' + configEmpresa.cnpj, 105, 22, { align: 'center' });
        if (configEmpresa.endereco) doc.text(configEmpresa.endereco, 105, 27, { align: 'center' });
        if (configEmpresa.telefone) doc.text('Tel: ' + configEmpresa.telefone, 105, 32, { align: 'center' });
        
        doc.setDrawColor(200);
        doc.line(10, 38, 200, 38);
        
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('PEDIDO DE VENDA', 105, 48, { align: 'center' });
        
        // Número do pedido na 2ª linha
        doc.setFontSize(11);
        doc.text('Pedido #' + pedido.id.toString().substr(0,8), 15, 60);
        doc.text('Data: ' + new Date(pedido.created_at).toLocaleDateString('pt-BR'), 15, 67);
        doc.text('Status: ' + pedido.status.toUpperCase(), 15, 74);
        
        // Cliente em destaque
        doc.setFillColor(240, 240, 240);
        doc.rect(15, 80, 180, 15, 'F');
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Cliente: ' + pedido.cliente_nome, 20, 90);
        doc.setFont(undefined, 'normal');
        
        doc.setFontSize(11);
        doc.text('Itens do Pedido:', 15, 105);
        
        var y = 115;
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
            itens.forEach(function(item) {
                var nome = item.nome || 'Sem nome';
                var codigo = item.codigo || '';
                var qtd = parseInt(item.qtd) || 0;
                var preco = parseFloat(item.preco) || 0;
                var total = parseFloat(item.total) || (qtd * preco);
                
                // Nome do produto
                doc.setFontSize(10);
                doc.setFont(undefined, 'bold');
                doc.text(nome, 20, y);
                doc.setFont(undefined, 'normal');
                
                // Código (se tiver)
                if (codigo) {
                    doc.setFontSize(8);
                    doc.setTextColor(100);
                    doc.text('Cód: ' + codigo, 20, y + 4);
                    doc.setTextColor(0);
                    doc.setFontSize(10);
                }
                
                // Quantidade e preço unitário
                doc.text(qtd + 'x R$ ' + preco.toFixed(2).replace('.',','), 120, y);
                
                // Total do item
                doc.text('R$ ' + total.toFixed(2).replace('.',','), 170, y, { align: 'right' });
                
                y += (codigo ? 11 : 7);
            });
        } else {
            doc.setFontSize(10);
            doc.setTextColor(150);
            doc.text('Nenhum item encontrado', 20, y);
            y += 7;
            doc.setTextColor(0);
        }
        
        y += 5;
        doc.setDrawColor(200);
        doc.line(15, y, 195, y);
        y += 10;
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('TOTAL: R$ ' + parseFloat(pedido.total).toFixed(2).replace('.',','), 170, y, { align: 'right' });
        
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.setFont(undefined, 'normal');
        doc.text('Gerado em: ' + new Date().toLocaleString('pt-BR'), 105, 280, { align: 'center' });
        
        doc.save('Pedido-' + pedido.id.toString().substr(0,8) + '.pdf');
        toast(' PDF gerado!', 'success');
        
    } catch(error) {
        toast('Erro ao gerar PDF: ' + error.message, 'error');
        console.error('Erro ao gerar PDF:', error);
    }
}

console.log('✅ PDF.js carregado');
