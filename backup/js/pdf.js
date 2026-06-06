// ============ GERAÇÃO DE PDF ============

function gerarPDFPedido(pedido) {
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
        
        doc.setFontSize(11);
        doc.text('Pedido #' + pedido.id.toString().substr(0,8), 15, 60);
        doc.text('Data: ' + new Date(pedido.created_at).toLocaleDateString('pt-BR'), 15, 67);
        doc.text('Status: ' + pedido.status.toUpperCase(), 15, 74);
        
        doc.setFillColor(240, 240, 240);
        doc.rect(15, 80, 180, 15, 'F');
        doc.setFontSize(12);
        doc.text('Cliente: ' + pedido.cliente_nome, 20, 90);
        
        doc.setFontSize(11);
        doc.text('Itens do Pedido:', 15, 105);
        
        var y = 115;
        try {
            var itens = JSON.parse(pedido.itens_json || '[]');
            itens.forEach(function(item) {
                doc.text(item.nome, 20, y);
                doc.text(item.qtd + 'x R$ ' + item.preco.toFixed(2).replace('.',','), 120, y);
                doc.text('R$ ' + item.total.toFixed(2).replace('.',','), 170, y, { align: 'right' });
                y += 7;
            });
        } catch(e) {}
        
        y += 5;
        doc.setDrawColor(200);
        doc.line(15, y, 195, y);
        y += 10;
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('TOTAL: R$ ' + parseFloat(pedido.total).toFixed(2).replace('.',','), 170, y, { align: 'right' });
        
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text('Gerado em: ' + new Date().toLocaleString('pt-BR'), 105, 280, { align: 'center' });
        
        doc.save('Pedido-' + pedido.id.toString().substr(0,8) + '.pdf');
        toast(' PDF gerado!', 'success');
        
    } catch(error) {
        toast('Erro ao gerar PDF: ' + error.message, 'error');
    }
}

console.log('✅ PDF.js carregado');
