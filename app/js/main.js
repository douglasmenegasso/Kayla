// ============ MAIN - INICIALIZAÇÃO E NAVEGAÇÃO ============

// ============ HISTÓRICO DE VERSÕES (DEFINIÇÃO) ============
var HISTORICO_VERSOES = [
    { 
        versao: '5.4.2', 
        data: '30/06/2026', 
        mudancas: [
            '🔒 Trava de licenciamento rigorosa (Anti-2/1)',
            '📱 Identificação visual de dispositivo atual',
            '⚡ Alternância rápida entre dispositivos sem Key',
            '🌐 Diferenciação entre Edge e Chrome',
            '✅ Correção: Renderização do Histórico'
        ] 
    },
    { 
        versao: '5.4.0', 
        data: '25/06/2026', 
        mudancas: [
            '💳 Sistema de pagamentos integrado',
            '📧 Notificações automáticas por e-mail',
            '🔑 Ativação PRO simplificada com validação automática',
            '📱 Registro inteligente de múltiplos dispositivos',
            '💾 Sistema de backup e restauração de dados (PRO)',
            '💬 Suporte direto via WhatsApp'
        ] 
    }
];

// ============ RELÓGIO E DATA ============
function atualizarRelogio() {
    var agora = new Date();
    var horas = String(agora.getHours()).padStart(2, '0');
    var minutos = String(agora.getMinutes()).padStart(2, '0');
    var segundos = String(agora.getSeconds()).padStart(2, '0');
    
    var dia = String(agora.getDate()).padStart(2, '0');
    var mes = String(agora.getMonth() + 1).padStart(2, '0');
    var ano = agora.getFullYear();
    
    var horario = document.getElementById('app-relogio');
    if (horario) {
        horario.innerHTML = horas + ':' + minutos + ':' + segundos + '<br><small>' + dia + '/' + mes + '/' + ano + '</small>';
    }
}

setInterval(atualizarRelogio, 1000);

// ============ HISTÓRICO DE VERSÕES ============
function mostrarHistoricoVersoes() {
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">📱 Kayla - Sistema de Vendas</div>';
    html += '<div style="text-align:center;margin-bottom:20px">';
    html += '<div style="font-size:48px;margin-bottom:10px">🛍️</div>';
    html += '<div style="font-size:24px;font-weight:700;color:var(--accent)">Kayla</div>';
    html += '<div style="font-size:14px;color:var(--text2)">Sistema de Venda Consignada</div>';
    html += '<div style="margin-top:10px;padding:8px;background:var(--bg3);border-radius:8px;display:inline-block">';
    html += '<div style="font-size:18px;font-weight:700;color:var(--success)">v' + appVersion + '</div>';
    html += '<div style="font-size:11px;color:var(--text2)">Última atualização: ' + HISTORICO_VERSOES[0].data + '</div>';
    html += '</div></div>';
    
    html += '<div style="margin-bottom:12px"><strong style="color:var(--accent)">📋 Novidades e Melhorias:</strong></div>';
    
    HISTORICO_VERSOES.forEach(function(ver, index) {
        html += '<div style="background:var(--bg2);border-radius:12px;padding:16px;margin-bottom:12px;border:1px solid ' + (index === 0 ? 'var(--accent)' : 'var(--border)') + '">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">';
        html += '<div style="font-weight:700;color:var(--accent);font-size:15px">Versão ' + ver.versao + '</div>';
        html += '<div style="font-size:11px;color:var(--text2)">' + ver.data + '</div>';
        html += '</div>';
        html += '<ul style="margin:0;padding-left:18px;font-size:13px;color:var(--text2);line-height:1.4">';
        ver.mudancas.forEach(function(mudanca) {
            html += '<li style="margin-bottom:6px">' + mudanca + '</li>';
        });
        html += '</ul></div>';
    });
    
    html += '<button class="btn btn-outline" onclick="fecharModal()" style="margin-top:12px; width:100%; padding:14px; font-weight:700;">Fechar</button>';
    
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
}

// Navegação entre abas
function mudarAba(aba) {
    console.log('🔄 Mudando para aba:', aba);
    var content = document.getElementById('content');
    if (content) content.scrollTop = 0;
    
    document.querySelectorAll('.nav-btn').forEach(function(b) { b.classList.remove('active'); });
    var idx = ['scan','clients','products','orders','history','settings'].indexOf(aba) + 1;
    var btn = document.querySelector('.nav-btn:nth-child(' + idx + ')');
    if (btn) btn.classList.add('active');
    
    var sub = document.getElementById('header-sub');
    if (!content || !sub) return;
    
    try {
        switch(aba) {
            case 'scan': sub.textContent = 'Nova Venda'; content.innerHTML = renderizarVenda(); setTimeout(iniciarScanner, 500); break;
            case 'clients': sub.textContent = 'Clientes'; content.innerHTML = renderizarClientes(); break;
            case 'products': sub.textContent = 'Produtos'; content.innerHTML = renderizarProdutos(); break;
            case 'orders': sub.textContent = 'Pedidos'; content.innerHTML = renderizarPedidos(); break;
            case 'history': sub.textContent = 'Histórico'; content.innerHTML = renderizarHistorico(); break;
            case 'settings': sub.textContent = 'Configurações'; content.innerHTML = renderizarConfig(); break;
        }
    } catch(e) {
        content.innerHTML = '<div class="card"><div class="card-title">⚠️ Erro</div><p>' + e.message + '</p></div>';
    }
}

// Renderizar tela de Configurações
function renderizarConfig() {
    var html = '<div class="card"><div class="card-title">⚙️ Configurações</div>';
    html += '<div class="form-group"><label class="form-label"> Usuário</label><div style="background:var(--bg3);padding:12px;border-radius:8px;margin-bottom:12px">' + (currentUser ? currentUser.email : 'Não logado') + '</div></div>';
    
    var isPro = (window.LIMITES && LIMITES.proAtivo);
    var devices = localStorage.getItem('kayla_pro_devices') || '0/0';
    var planoTexto = isPro ? '💎 PRO' : '🆓 GRÁTIS';
    var planoCor = isPro ? 'var(--accent)' : 'var(--text2)';
    
    html += '<div style="display:flex;gap:8px;margin-bottom:12px">';
    html += '<div style="flex:1;background:linear-gradient(135deg, var(--bg3) 0%, var(--bg2) 100%);padding:12px;border-radius:8px;text-align:center;border:1px solid ' + planoCor + '">';
    html += '<div style="font-size:11px;color:var(--text2);margin-bottom:4px">PLANO</div>';
    html += '<div style="font-size:18px;font-weight:700;color:' + planoCor + '">' + planoTexto + '</div>';
    html += '</div>';
    html += '<div style="flex:1;background:linear-gradient(135deg, var(--bg3) 0%, var(--bg2) 100%);padding:12px;border-radius:8px;text-align:center;border:1px solid var(--border)">';
    html += '<div style="font-size:11px;color:var(--text2);margin-bottom:4px">DISPOSITIVOS</div>';
    html += '<div id="devices-banner-value" style="font-size:18px;font-weight:700;color:var(--accent)">' + devices + '</div>';
    html += '</div>';
    html += '</div>';
    
    // Área dinâmica de controles de assinatura
    html += '<div id="subscription-controls">';
    
    if (isPro) {
        var expires = localStorage.getItem('kayla_pro_expires');
        var expDate = expires ? new Date(expires).toLocaleDateString('pt-BR') : 'N/A';
        html += '<div class="form-group"><label class="form-label">📅 Validade</label><div style="background:var(--bg3);padding:12px;border-radius:8px;margin-bottom:12px;text-align:center;font-weight:600;color:var(--accent)">' + expDate + '</div></div>';
        html += '<button class="btn btn-primary" onclick="mostrarInfoAssinatura()" style="margin-top:8px;width:100%">📋 Minha Assinatura</button>';
        html += '<button class="btn btn-outline" onclick="gerenciarDispositivos()" style="margin-top:8px;width:100%">📱 Gerenciar Dispositivos</button>';
        html += '<button class="btn btn-outline" onclick="fazerUpgradeDispositivos()" style="margin-top:8px;width:100%">⬆️ Adicionar Dispositivos</button>';
        html += '<button class="btn btn-red" onclick="cancelarAssinatura()" style="margin-top:8px;width:100%">🚫 Cancelar Assinatura PRO</button>';
        html += '<button class="btn btn-primary" onclick="iniciarRenovacao()" style="margin-top:8px;width:100%">🔄 Renovar Assinatura</button>';
    } else {
        // MODO GRÁTIS - Verificar se tem assinatura no banco para mostrar o botão de dispositivos
        if (currentUser && supabaseClient && isOnline) {
            getAssinaturaAtiva().then(function(assinatura) {
                if (assinatura) {
                    var container = document.getElementById('subscription-controls');
                    if (container) {
                        var btnHtml = '<div style="padding:12px;background:rgba(124, 92, 252, 0.1);border-radius:10px;margin-bottom:12px;text-align:center;font-size:13px;color:var(--accent);border:1px dashed var(--accent)">';
                        btnHtml += '✅ Você possui uma assinatura PRO ativa!<br><strong>Libere uma vaga para usar neste dispositivo.</strong></div>';
                        btnHtml += '<button class="btn btn-primary" onclick="gerenciarDispositivos()" style="width:100%">📱 Gerenciar Dispositivos</button>';
                        btnHtml += '<button class="btn btn-outline" onclick="fazerUpgradeDispositivos()" style="margin-top:8px;width:100%">⬆️ Adicionar Dispositivos</button>';
                        btnHtml += '<button class="btn btn-outline" onclick="mostrarPlanos()" style="margin-top:8px;width:100%">🚀 Planos e Upgrade</button>';
                        container.innerHTML = btnHtml;
                    }
                }
            });
        }
        
        html += '<button class="btn btn-primary" onclick="mostrarPlanos()" style="width:100%">🚀 Assinar Plano Pro</button>';
        html += '<div class="form-group" style="margin-top:12px"><label class="form-label">Já tem uma key?</label>';
        html += '<input class="form-input" id="pro-key" placeholder="PRO-XXXX-XXXX-XXXX">';
        html += '<button class="btn btn-outline" onclick="ativarPro()" style="margin-top:8px;width:100%">⚡ Ativar Key</button></div>';
    }
    html += '</div>';

    // Backup e Restauração
    html += '<div class="form-group" style="margin-top:16px"><label class="form-label">💾 Backup e Restauração ' + (isPro ? '<span class="badge-pro" style="font-size:10px">PRO</span>' : '') + '</label>';
    html += '<button class="btn ' + (isPro ? 'btn-primary' : 'btn-outline') + '" onclick="' + (isPro ? 'exportarBackup()' : 'mostrarPlanos()') + '" style="margin-top:8px;width:100%">📥 Exportar Backup</button>';
    html += '<button class="btn btn-outline" onclick="' + (isPro ? 'importarBackup()' : 'mostrarPlanos()') + '" style="margin-top:8px;width:100%">📤 Importar Backup</button></div>';

    // Dados da Empresa
    html += '<div class="form-group" style="margin-top:16px"><label class="form-label"> Dados da Empresa</label>';
    html += '<div style="background:var(--bg3);padding:12px;border-radius:8px;margin-bottom:12px">';
    if (configEmpresa && configEmpresa.nome) {
        html += '<div style="font-weight:600">' + configEmpresa.nome + '</div>';
        if (configEmpresa.cnpj) html += '<div style="font-size:12px;color:var(--text2)">CNPJ: ' + configEmpresa.cnpj + '</div>';
    } else {
        html += '<div style="font-size:13px;color:var(--text3)">Nenhuma empresa configurada</div>';
    }
    html += '</div><button class="btn btn-outline" onclick="editarEmpresa()">📝 Editar Dados</button></div>';
    
    html += '<button class="btn btn-red" onclick="fazerLogout()" style="margin-top:20px;width:100%">🚪 Sair da Conta</button>';
    html += '<div style="text-align:center;margin-top:20px;font-size:11px;color:var(--text3)">Kayla v' + appVersion + '</div></div>';
    
    return html;
}

window.mudarAba = mudarAba;
window.renderizarConfig = renderizarConfig;
window.mostrarHistoricoVersoes = mostrarHistoricoVersoes;

console.log('✅ Main.js carregado');
