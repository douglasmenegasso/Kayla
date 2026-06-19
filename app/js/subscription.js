// ============ ASSINATURAS E DISPOSITIVOS ============

// Configurações de limites
window.LIMITES = {
    proAtivo: false,
    maxClientes: 50,
    maxProdutos: 100,
    maxVendas: 200
};

// Verificar status PRO do usuário
async function verificarStatusPro() {
    if (!currentUser || !supabaseClient) {
        return false;
    }
    
    try {
        var result = await supabaseClient
            .from('assinaturas')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('status', 'ativa')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        
        if (result.error || !result.data) {
            LIMITES.proAtivo = false;
            localStorage.removeItem('kayla_pro');
            localStorage.removeItem('kayla_pro_key');
            localStorage.removeItem('kayla_pro_expires');
            localStorage.removeItem('kayla_pro_devices');
            return false;
        }
        
        var assinatura = result.data;
        
        // Verificar se não expirou
        if (assinatura.data_fim && new Date(assinatura.data_fim) < new Date()) {
            LIMITES.proAtivo = false;
            localStorage.removeItem('kayla_pro');
            localStorage.removeItem('kayla_pro_key');
            localStorage.removeItem('kayla_pro_expires');
            localStorage.removeItem('kayla_pro_devices');
            
            // Atualizar status no banco
            await supabaseClient
                .from('assinaturas')
                .update({ status: 'expirada' })
                .eq('id', assinatura.id);
            
            return false;
        }
        
        // Ativar PRO
        LIMITES.proAtivo = true;
        localStorage.setItem('kayla_pro', 'true');
        localStorage.setItem('kayla_pro_key', assinatura.key_ativacao || '');
        localStorage.setItem('kayla_pro_expires', assinatura.data_fim || '');
        localStorage.setItem('kayla_pro_devices', assinatura.dispositivos_usados + '/' + assinatura.dispositivos_max);
        
        return true;
        
    } catch(e) {
        console.error('[Pro] Erro ao verificar status:', e);
        return false;
    }
}

// Atualizar badge do plano no header
function atualizarBadgePlano() {
    var badge = document.getElementById('plan-badge');
    if (!badge) return;
    
    if (LIMITES.proAtivo) {
        badge.textContent = 'PRO';
        badge.className = 'badge-pro';
    } else {
        badge.textContent = 'GRÁTIS';
        badge.className = 'badge-free';
    }
}

// Verificar limites do plano gratuito
function verificarLimite(tipo) {
    if (LIMITES.proAtivo) {
        return true; // PRO tem limites ilimitados
    }
    
    var limite = 0;
    var atual = 0;
    
    switch(tipo) {
        case 'clientes':
            limite = LIMITES.maxClientes;
            atual = (window.clientes || []).length;
            break;
        case 'produtos':
            limite = LIMITES.maxProdutos;
            atual = (window.produtos || []).length;
            break;
        case 'vendas':
            limite = LIMITES.maxVendas;
            atual = (window.vendas || []).length;
            break;
    }
    
    if (atual >= limite) {
        return false;
    }
    
    return true;
}

// Mostrar aviso de limite atingido
function mostrarAvisoLimite(tipo) {
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">🔒 Limite Atingido</div>';
    html += '<div class="modal-sub">Você atingiu o limite de ' + tipo + '</div>';
    
    html += '<div class="card" style="background:var(--bg3);padding:20px;text-align:center;margin-bottom:16px">';
    html += '<div style="font-size:48px;margin-bottom:12px">🔒</div>';
    html += '<div style="font-size:16px;font-weight:600;color:var(--warning);margin-bottom:8px">' + LIMITES[tipo] + ' de ' + LIMITES[tipo] + ' ' + tipo + ' em uso</div>';
    html += '<div style="font-size:13px;color:var(--text2)">Para adicionar mais ' + tipo + ', você pode:</div>';
    html += '<div style="margin-top:12px;font-size:12px;color:var(--text2)">';
    html += '<div style="margin-bottom:8px">1️⃣ Remover um ' + tipo.slice(0, -1) + ' antigo</div>';
    html += '<div>2️⃣ Fazer upgrade do plano</div>';
    html += '</div>';
    html += '</div>';
    
    html += '<button class="btn btn-primary" onclick="gerenciarDispositivos()" style="width:100%;margin-bottom:8px"> Gerenciar Dispositivos</button>';
    html += '<button class="btn btn-outline" onclick="fazerUpgradeDispositivos()" style="width:100%;margin-bottom:8px">🚀 Fazer Upgrade</button>';
    html += '<button class="btn btn-outline" onclick="fecharModal()" style="width:100%">Fechar</button>';
    
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
}

// Mostrar informações da assinatura
async function mostrarInfoAssinatura() {
    if (!currentUser || !supabaseClient) {
        toast('Faça login primeiro', 'error');
        return;
    }
    
    try {
        var result = await supabaseClient
            .from('assinaturas')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('status', 'ativa')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        
        if (result.error || !result.data) {
            toast('Nenhuma assinatura ativa encontrada', 'error');
            return;
        }
        
        var assinatura = result.data;
        var dataFim = new Date(assinatura.data_fim).toLocaleDateString('pt-BR');
        var diasRestantes = Math.ceil((new Date(assinatura.data_fim) - new Date()) / (1000 * 60 * 60 * 24));
        
        var html = '<div class="modal-handle"></div>';
        html += '<div class="modal-title"> Minha Assinatura</div>';
        
        html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
        html += '<div style="display:flex;justify-content:space-between;margin-bottom:12px">';
        html += '<span style="color:var(--text2)">Status:</span>';
        html += '<span class="badge-pro">ATIVA</span>';
        html += '</div>';
        html += '<div style="display:flex;justify-content:space-between;margin-bottom:12px">';
        html += '<span style="color:var(--text2)">Key:</span>';
        html += '<strong style="font-family:monospace;font-size:12px">' + (assinatura.key_ativacao || 'N/A') + '</strong>';
        html += '</div>';
        html += '<div style="display:flex;justify-content:space-between;margin-bottom:12px">';
        html += '<span style="color:var(--text2)">Dispositivos:</span>';
        html += '<strong>' + assinatura.dispositivos_usados + '/' + assinatura.dispositivos_max + '</strong>';
        html += '</div>';
        html += '<div style="display:flex;justify-content:space-between;margin-bottom:12px">';
        html += '<span style="color:var(--text2)">Validade:</span>';
        html += '<strong>' + dataFim + '</strong>';
        html += '</div>';
        html += '<div style="display:flex;justify-content:space-between">';
        html += '<span style="color:var(--text2)">Dias restantes:</span>';
        html += '<strong style="color:' + (diasRestantes <= 7 ? 'var(--warning)' : 'var(--success)') + '">' + diasRestantes + ' dias</strong>';
        html += '</div>';
        html += '</div>';
        
        html += '<button class="btn btn-outline" onclick="fecharModal()" style="width:100%">Fechar</button>';
        
        document.getElementById('modal-body').innerHTML = html;
        document.getElementById('modal-overlay').classList.add('show');
        
    } catch(e) {
        console.error('[Assinatura] Erro:', e);
        toast('Erro ao carregar assinatura', 'error');
    }
}

// Histórico de versões
function mostrarHistoricoVersoes() {
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">📋 Histórico de Versões</div>';
    html += '<div class="modal-sub">Kayla App - Sistema de Venda Consignada</div>';
    
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:12px">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
    html += '<div style="font-weight:700;color:var(--accent)">v5.4.0</div>';
    html += '<span class="badge-pro">ATUAL</span>';
    html += '</div>';
    html += '<div style="font-size:12px;color:var(--text2);margin-bottom:8px">Junho 2026</div>';
    html += '<ul style="padding-left:20px;font-size:12px;color:var(--text2);margin:0">';
    html += '<li>✅ Dashboard administrativo</li>';
    html += '<li>✅ Rastreamento de visitas</li>';
    html += '<li>✅ Sistema de emails</li>';
    html += '<li>✅ Correções de bugs</li>';
    html += '</ul>';
    html += '</div>';
    
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:12px">';
    html += '<div style="font-weight:700;color:var(--accent);margin-bottom:8px">v5.3.0</div>';
    html += '<div style="font-size:12px;color:var(--text2);margin-bottom:8px">Maio 2026</div>';
    html += '<ul style="padding-left:20px;font-size:12px;color:var(--text2);margin:0">';
    html += '<li>✅ Sistema de dispositivos</li>';
    html += '<li>✅ Upgrade de dispositivos</li>';
    html += '<li>✅ Pagamento via PIX</li>';
    html += '</ul>';
    html += '</div>';
    
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:12px">';
    html += '<div style="font-weight:700;color:var(--accent);margin-bottom:8px">v5.2.0</div>';
    html += '<div style="font-size:12px;color:var(--text2);margin-bottom:8px">Abril 2026</div>';
    html += '<ul style="padding-left:20px;font-size:12px;color:var(--text2);margin:0">';
    html += '<li>✅ Sistema de assinaturas</li>';
    html += '<li>✅ Planos Mensal e Anual</li>';
    html += '<li>✅ Integração Mercado Pago</li>';
    html += '</ul>';
    html += '</div>';
    
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:12px">';
    html += '<div style="font-weight:700;color:var(--text2);margin-bottom:8px">v5.1.0</div>';
    html += '<div style="font-size:12px;color:var(--text2);margin-bottom:8px">Março 2026</div>';
    html += '<ul style="padding-left:20px;font-size:12px;color:var(--text2);margin:0">';
    html += '<li>✅ Sistema de vendas</li>';
    html += '<li>✅ Gestão de clientes</li>';
    html += '<li>✅ Gestão de produtos</li>';
    html += '</ul>';
    html += '</div>';
    
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:12px">';
    html += '<div style="font-weight:700;color:var(--text2);margin-bottom:8px">v5.0.0</div>';
    html += '<div style="font-size:12px;color:var(--text2);margin-bottom:8px">Fevereiro 2026</div>';
    html += '<ul style="padding-left:20px;font-size:12px;color:var(--text2);margin:0">';
    html += '<li>🚀 Lançamento inicial</li>';
    html += '<li>✅ Sistema base</li>';
    html += '<li>✅ Autenticação</li>';
    html += '</ul>';
    html += '</div>';
    
    html += '<button class="btn btn-outline" onclick="fecharModal()" style="width:100%">Fechar</button>';
    
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
}

// ============ BACKUP E RESTAURAÇÃO ============

// Exportar backup
function exportarBackup() {
    if (!LIMITES.proAtivo) {
        toast('Recurso disponível apenas no plano PRO', 'error');
        return;
    }
    
    try {
        var backup = {
            versao: '5.4.0',
            data: new Date().toISOString(),
            clientes: window.clientes || [],
            produtos: window.produtos || [],
            vendas: window.vendas || [],
            pedidos: window.pedidos || [],
            config: window.configEmpresa || {}
        };
        
        var json = JSON.stringify(backup, null, 2);
        var blob = new Blob([json], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        
        var a = document.createElement('a');
        a.href = url;
        a.download = 'kayla-backup-' + new Date().toISOString().split('T')[0] + '.json';
        a.click();
        
        URL.revokeObjectURL(url);
        
        toast('✅ Backup exportado com sucesso!', 'success');
        
    } catch(e) {
        console.error('[Backup] Erro ao exportar:', e);
        toast('Erro ao exportar backup', 'error');
    }
}

// Importar backup
function importarBackup() {
    if (!LIMITES.proAtivo) {
        toast('Recurso disponível apenas no plano PRO', 'error');
        return;
    }
    
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(e) {
        var file = e.target.files[0];
        if (!file) return;
        
        var reader = new FileReader();
        reader.onload = function(event) {
            try {
                var backup = JSON.parse(event.target.result);
                
                if (!backup.versao || !backup.data) {
                    toast('Arquivo de backup inválido', 'error');
                    return;
                }
                
                // Confirmar importação
                var confirmar = confirm('⚠️ ATENÇÃO!\n\nIsso irá SUBSTITUIR todos os dados atuais.\n\nDeseja continuar?');
                if (!confirmar) return;
                
                // Importar dados
                if (backup.clientes) window.clientes = backup.clientes;
                if (backup.produtos) window.produtos = backup.produtos;
                if (backup.vendas) window.vendas = backup.vendas;
                if (backup.pedidos) window.pedidos = backup.pedidos;
                if (backup.config) window.configEmpresa = backup.config;
                
                // Salvar no localStorage
                if (window.clientes) localStorage.setItem('kayla_clientes', JSON.stringify(window.clientes));
                if (window.produtos) localStorage.setItem('kayla_produtos', JSON.stringify(window.produtos));
                if (window.vendas) localStorage.setItem('kayla_vendas', JSON.stringify(window.vendas));
                if (window.pedidos) localStorage.setItem('kayla_pedidos', JSON.stringify(window.pedidos));
                if (window.configEmpresa) localStorage.setItem('kayla_config_empresa', JSON.stringify(window.configEmpresa));
                
                toast('✅ Backup importado com sucesso!', 'success');
                
                // Recarregar dados
                if (typeof renderizarConteudo === 'function') {
                    renderizarConteudo();
                }
                
            } catch(err) {
                console.error('[Backup] Erro ao importar:', err);
                toast('Erro ao importar backup', 'error');
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

// ============ CONFIGURAÇÃO DA EMPRESA ============

function configurarEmpresa() {
    if (!LIMITES.proAtivo) {
        toast('Recurso disponível apenas no plano PRO', 'error');
        return;
    }
    
    var config = window.configEmpresa || {};
    
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">⚙️ Dados da Empresa</div>';
    html += '<div class="modal-sub">Configure as informações que aparecerão nos recibos</div>';
    
    html += '<div class="form-group">';
    html += '<label class="form-label">Nome da Empresa</label>';
    html += '<input type="text" class="form-input" id="emp-nome" value="' + (config.nome || '') + '" placeholder="Sua Empresa Ltda">';
    html += '</div>';
    
    html += '<div class="form-group">';
    html += '<label class="form-label">CNPJ</label>';
    html += '<input type="text" class="form-input" id="emp-cnpj" value="' + (config.cnpj || '') + '" placeholder="00.000.000/0000-00">';
    html += '</div>';
    
    html += '<div class="form-group">';
    html += '<label class="form-label">Telefone</label>';
    html += '<input type="text" class="form-input" id="emp-telefone" value="' + (config.telefone || '') + '" placeholder="(00) 00000-0000">';
    html += '</div>';
    
    html += '<div class="form-group">';
    html += '<label class="form-label">Endereço</label>';
    html += '<input type="text" class="form-input" id="emp-endereco" value="' + (config.endereco || '') + '" placeholder="Rua, Número - Cidade/UF">';
    html += '</div>';
    
    html += '<div class="form-group">';
    html += '<label class="form-label">Email</label>';
    html += '<input type="email" class="form-input" id="emp-email" value="' + (config.email || '') + '" placeholder="contato@empresa.com">';
    html += '</div>';
    
    html += '<button class="btn btn-primary" onclick="salvarConfigEmpresa()" style="width:100%;margin-bottom:8px"> Salvar Configurações</button>';
    html += '<button class="btn btn-outline" onclick="fecharModal()" style="width:100%">Cancelar</button>';
    
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
}

function salvarConfigEmpresa() {
    var config = {
        nome: document.getElementById('emp-nome').value.trim(),
        cnpj: document.getElementById('emp-cnpj').value.trim(),
        telefone: document.getElementById('emp-telefone').value.trim(),
        endereco: document.getElementById('emp-endereco').value.trim(),
        email: document.getElementById('emp-email').value.trim()
    };
    
    window.configEmpresa = config;
    localStorage.setItem('kayla_config_empresa', JSON.stringify(config));
    
    toast('✅ Configurações salvas!', 'success');
    fecharModal();
}

// ============ SUPORTE WHATSAPP ============

function abrirSuporteWhatsApp() {
    var mensagem = 'Olá! Preciso de suporte com o Kayla App.';
    
    if (currentUser) {
        mensagem += '\n\nUsuário: ' + currentUser.email;
        mensagem += '\nPlano: ' + (LIMITES.proAtivo ? 'PRO' : 'GRÁTIS');
        mensagem += '\nVersão: 5.4.0';
    }
    
    var url = 'https://wa.me/5500000000000?text=' + encodeURIComponent(mensagem);
    window.open(url, '_blank');
}

// ============ INICIALIZAÇÃO ============

// Carregar configurações da empresa
function carregarConfigEmpresa() {
    try {
        var config = localStorage.getItem('kayla_config_empresa');
        if (config) {
            window.configEmpresa = JSON.parse(config);
        } else {
            window.configEmpresa = {};
        }
    } catch(e) {
        console.error('[Config] Erro ao carregar:', e);
        window.configEmpresa = {};
    }
}

// Inicializar ao carregar
if (typeof window !== 'undefined') {
    carregarConfigEmpresa();
}

console.log('✅ Subscription.js carregado');
