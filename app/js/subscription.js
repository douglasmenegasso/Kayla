// ============ ASSINATURAS E DISPOSITIVOS ============

// Configurações de limites
window.LIMITES = {
    proAtivo: false,
    maxClientes: 3,
    maxProdutos: 10,
    maxVendas: 3
};

// ============ FUNÇÃO DE REGISTRO DE DISPOSITIVO ============

async function registrarDispositivoAtual() {
    if (!currentUser || !supabaseClient || !isOnline) {
        console.log('[Dispositivo] Não é possível registrar dispositivo (offline ou sem login)');
        return true; // Permite acesso offline
    }

    try {
        var deviceId = getDeviceId();
        var deviceName = getDeviceName();
        var deviceType = getDeviceType();
        var assinatura = await getAssinaturaAtiva();

        if (!assinatura) {
            console.log('[Dispositivo] Usuário FREE - sem registro de dispositivo');
            return true;
        }

        // 1. Verificar se o dispositivo já está registrado e ativo
        var { data: dispositivoExistente, error: buscaError } = await supabaseClient
            .from('dispositivos')
            .select('id')
            .eq('assinatura_id', assinatura.id)
            .eq('device_id', deviceId)
            .eq('ativo', true)
            .limit(1)
            .maybeSingle();

        if (buscaError && buscaError.code !== 'PGRST116') {
            console.error('[Dispositivo] Erro ao buscar:', buscaError);
            return true;
        }

        if (dispositivoExistente) {
            console.log('[Dispositivo] Dispositivo já registrado, atualizando último acesso');
            await supabaseClient
                .from('dispositivos')
                .update({ ultimo_acesso: new Date().toISOString() })
                .eq('id', dispositivoExistente.id);
            return true;
        }

        // 2. Verificar limite antes de registrar um novo
        if (assinatura.dispositivos_usados >= assinatura.dispositivos_max) {
            console.warn('[Dispositivo] Limite de dispositivos atingido! Modo GRÁTIS ativado.');
            return false; // Bloqueia o registro para não estourar a tabela
        }

        // 3. Registrar novo dispositivo
        var { error: insertError } = await supabaseClient
            .from('dispositivos')
            .insert({
                assinatura_id: assinatura.id,
                user_id: currentUser.id,
                device_id: deviceId,
                device_name: deviceName,
                device_type: deviceType,
                user_agent: navigator.userAgent,
                primeiro_acesso: new Date().toISOString(),
                ultimo_acesso: new Date().toISOString(),
                ativo: true
            });

        if (insertError) {
            console.error('[Dispositivo] Erro ao registrar:', insertError);
            return false;
        }

        // 4. Atualizar o contador de dispositivos usados
        await supabaseClient
            .from('assinaturas')
            .update({ dispositivos_usados: assinatura.dispositivos_usados + 1 })
            .eq('id', assinatura.id);

        localStorage.setItem('kayla_pro_devices', (assinatura.dispositivos_usados + 1) + '/' + assinatura.dispositivos_max);
        console.log('[Dispositivo] ✅ Dispositivo registrado com sucesso!');
        return true;

    } catch(e) {
        console.error('[Dispositivo] Erro:', e);
        return true; // Em caso de erro, permite acesso (não bloqueia o usuário)
    }
}

// ============ VERIFICAR STATUS PRO ============

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
            .maybeSingle(); // .single() trocado para evitar erros de cache
        
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

        // Verificar o número de dispositivos ativos
        var { count: dispositivosAtivos, error: countError } = await supabaseClient
            .from('dispositivos')
            .select('id', { count: 'exact', head: true })
            .eq('assinatura_id', assinatura.id)
            .eq('ativo', true);

        if (!countError && dispositivosAtivos >= assinatura.dispositivos_max) {
            // Limite atingido! Rebaixa para GRÁTIS localmente
            LIMITES.proAtivo = false;
            localStorage.removeItem('kayla_pro');
            localStorage.removeItem('kayla_pro_key');
            localStorage.removeItem('kayla_pro_expires');
            localStorage.removeItem('kayla_pro_devices');
            return false; // Mantém o login, mas sem recursos PRO
        }
        
        // Ativar PRO (se passou pela verificação)
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

// ============ FUNÇÕES AUXILIARES ============

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

function verificarLimite(tipo) {
    if (LIMITES.proAtivo) return true;
    var limite = 0;
    var atual = 0;
    switch(tipo) {
        case 'clientes': limite = LIMITES.maxClientes; atual = (window.clientes || []).length; break;
        case 'produtos': limite = LIMITES.maxProdutos; atual = (window.produtos || []).length; break;
        case 'vendas': limite = LIMITES.maxVendas; atual = (window.vendas || []).length; break;
    }
    if (atual >= limite) return false;
    return true;
}

async function getAssinaturaAtiva() {
    if (!currentUser || !supabaseClient) {
        return null;
    }
    try {
        var result = await supabaseClient
            .from('assinaturas')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('status', 'ativa')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (result.error) {
            console.warn('[getAssinaturaAtiva] Erro:', result.error);
            return null;
        }
        return result.data;
    } catch(e) {
        console.error('[getAssinaturaAtiva] Erro:', e);
        return null;
    }
}

// ============ CANCELAMENTO DE ASSINATURA PRO ============

async function cancelarAssinatura() {
    if (!currentUser) { toast('Faça login primeiro.', 'error'); return; }
    var assinatura = await getAssinaturaAtiva();
    if (!assinatura) { toast('Você não possui uma assinatura PRO ativa.', 'error'); return; }

    // 🔍 Buscar créditos e dispositivos para exibir no resumo
    var resumoTexto = '';
    try {
        var { data: creditos } = await supabaseClient
            .from('creditos')
            .select('valor')
            .eq('user_id', currentUser.id)
            .eq('utilizado', false);
        var totalCredito = 0;
        if (creditos && creditos.length > 0) {
            creditos.forEach(function(cred) { totalCredito += parseFloat(cred.valor || 0); });
        }
        var { count: deviceCount } = await supabaseClient
            .from('dispositivos')
            .select('id', { count: 'exact', head: true })
            .eq('assinatura_id', assinatura.id)
            .eq('ativo', true);
        var dispositivosAtivos = deviceCount || 0;

        if (totalCredito > 0 || assinatura || dispositivosAtivos > 0) {
            resumoTexto += '\n\n🔍 Dados encontrados na sua assinatura:';
            if (totalCredito > 0) resumoTexto += '\n   💰 Créditos: R$ ' + totalCredito.toFixed(2).replace('.', ',');
            if (assinatura) resumoTexto += '\n   💎 Plano PRO: Válido até ' + new Date(assinatura.data_fim).toLocaleDateString('pt-BR');
            if (dispositivosAtivos > 0) resumoTexto += '\n   📱 Dispositivos ativos: ' + dispositivosAtivos;
            resumoTexto += '\n\nIsso será desativado ao cancelar a assinatura.';
        }
    } catch (e) { console.warn('Erro ao buscar dados para o resumo do cancelamento:', e); }

    // 🔒 Confirmação com o modal do app
    confirmar('Cancelar Assinatura PRO', '⚠️ ATENÇÃO!\nVocê está prestes a CANCELAR sua assinatura PRO.\nIsso desativará todos os seus dispositivos e você perderá acesso aos recursos PRO.' + resumoTexto, async function(confirmed) {
        if (!confirmed) return;
        try {
            await supabaseClient.from('assinaturas').update({ status: 'cancelada' }).eq('id', assinatura.id);
            await supabaseClient.from('dispositivos').update({ ativo: false }).eq('assinatura_id', assinatura.id);
            localStorage.removeItem('kayla_pro');
            localStorage.removeItem('kayla_pro_key');
            localStorage.removeItem('kayla_pro_expires');
            localStorage.removeItem('kayla_pro_devices');
            LIMITES.proAtivo = false;
            atualizarBadgePlano();
            if (typeof mudarAba === 'function') mudarAba('settings');
            toast('✅ Assinatura PRO cancelada com sucesso!', 'success');
        } catch(e) {
            toast('❌ Erro ao cancelar assinatura', 'error');
            console.error('Erro ao cancelar assinatura:', e);
        }
    });
}

// ============ EXCLUSÃO DEFINITIVA DE CONTA (LGPD) ============

async function excluirConta() {
    if (!currentUser || !supabaseClient) { toast('Nenhum usuário logado.', 'error'); return; }
    
    // 🔍 Buscar dados do usuário para exibir no resumo antes da exclusão
    var resumoTexto = '';
    try {
        var { data: creditos } = await supabaseClient
            .from('creditos')
            .select('valor')
            .eq('user_id', currentUser.id)
            .eq('utilizado', false);
        var totalCredito = 0;
        if (creditos && creditos.length > 0) {
            creditos.forEach(function(cred) { totalCredito += parseFloat(cred.valor || 0); });
        }
        var assinatura = await getAssinaturaAtiva();
        var dispositivosAtivos = 0;
        if (assinatura) {
            var { count: deviceCount } = await supabaseClient
                .from('dispositivos')
                .select('id', { count: 'exact', head: true })
                .eq('assinatura_id', assinatura.id)
                .eq('ativo', true);
            dispositivosAtivos = deviceCount || 0;
        }
        if (totalCredito > 0 || assinatura || dispositivosAtivos > 0) {
            resumoTexto += '\n\n🔍 Dados encontrados na sua conta:';
            if (totalCredito > 0) resumoTexto += '\n   💰 Créditos: R$ ' + totalCredito.toFixed(2).replace('.', ',');
            if (assinatura) resumoTexto += '\n   💎 Plano PRO: Ativo (válido até ' + new Date(assinatura.data_fim).toLocaleDateString('pt-BR') + ')';
            if (dispositivosAtivos > 0) resumoTexto += '\n   📱 Dispositivos ativos: ' + dispositivosAtivos;
            resumoTexto += '\n\nTodos esses dados serão excluídos permanentemente.';
        }
    } catch (e) { console.warn('Erro ao buscar dados para o resumo da exclusão:', e); }

    // 🔒 1ª Confirmação (Já com o resumo dos dados)
    confirmar('Excluir Conta', 'Ao confirmar, TODOS os seus dados (cadastro, clientes, produtos, pedidos e assinaturas) serão EXCLUÍDOS PERMANENTEMENTE.\n\nEsta ação é IRREVERSÍVEL de acordo com a LGPD.' + resumoTexto, async function(confirmou1) {
        if (!confirmou1) return;

        // 🔒 2ª Confirmação (Última Chance)
        confirmar('Última Chance!', 'Você tem certeza absoluta que deseja deletar sua conta?\n\nNão há como recuperar essas informações.', async function(confirmou2) {
            if (!confirmou2) return;
            try {
                var response = await fetch('https://xwwklngrkvdwgiinycvt.supabase.co/functions/v1/delete-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SUPABASE_KEY },
                    body: JSON.stringify({ userId: currentUser.id })
                });
                var resultado = await response.json();
                
                if (resultado.success) {
                    await supabaseClient.auth.signOut();
                    localStorage.clear();
                    currentUser = null;
                    LIMITES.proAtivo = false;
                    mostrarTelaSelecao();
                    toast('✅ Dados excluídos com sucesso!', 'success');
                } else {
                    toast('❌ Erro: ' + resultado.error, 'error');
                }
            } catch (e) {
                toast('Erro de conexão.', 'error');
            }
        });
    });
}

// ============ BACKUP E RESTAURAÇÃO ============

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
                var confirmar = confirm('⚠️ ATENÇÃO!\n\nIsso irá SUBSTITUIR todos os dados atuais.\n\nDeseja continuar?');
                if (!confirmar) return;
                if (backup.clientes) window.clientes = backup.clientes;
                if (backup.produtos) window.produtos = backup.produtos;
                if (backup.vendas) window.vendas = backup.vendas;
                if (backup.pedidos) window.pedidos = backup.pedidos;
                if (backup.config) window.configEmpresa = backup.config;
                if (window.clientes) localStorage.setItem('kayla_clientes', JSON.stringify(window.clientes));
                if (window.produtos) localStorage.setItem('kayla_produtos', JSON.stringify(window.produtos));
                if (window.vendas) localStorage.setItem('kayla_vendas', JSON.stringify(window.vendas));
                if (window.pedidos) localStorage.setItem('kayla_pedidos', JSON.stringify(window.pedidos));
                if (window.configEmpresa) localStorage.setItem('kayla_config_empresa', JSON.stringify(window.configEmpresa));
                toast('✅ Backup importado com sucesso!', 'success');
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
if (typeof window !== 'undefined') {
    carregarConfigEmpresa();
}

// ============ MOSTRAR INFORMAÇÕES DA ASSINATURA ============

// ====== REMOVIDO DUPLICIDADE COM PAYMENT COMPLETO ===========

// ============ MOSTRAR AVISO DE LIMITE (CORRIGIDO) ============

function mostrarAvisoLimite(tipo) {
    // Fecha qualquer modal que esteja aberto
    document.getElementById('modal-overlay').classList.remove('show');
    document.getElementById('modal-body').innerHTML = '';

    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">🔒 Limite Atingido</div>';
    html += '<div class="modal-sub">Você atingiu o limite de <strong>' + tipo + '</strong> para o plano GRÁTIS.</div>';
    
    html += '<div class="card" style="background:var(--bg3);padding:20px;text-align:center;margin-bottom:16px">';
    html += '<div style="font-size:48px;margin-bottom:12px">🚀</div>';
    html += '<div style="font-size:16px;font-weight:600;color:var(--warning);margin-bottom:8px">Aumente seus limites!</div>';
    html += '<div style="font-size:13px;color:var(--text2)">Assine o plano PRO para ter clientes e produtos ilimitados.</div>';
    html += '</div>';
    
    // Botão corrigido que leva para a tela de planos
    html += '<button class="btn btn-primary" onclick="fecharModal(); mostrarPlanos()" style="width:100%;margin-bottom:8px">🚀 Ver Planos PRO</button>';
    html += '<button class="btn btn-outline" onclick="fecharModal()" style="width:100%">Cancelar</button>';
    
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
}

console.log('✅ Subscription.js carregado (Versão Final com Modais e Resumos)');
