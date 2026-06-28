// ============ ASSINATURAS E DISPOSITIVOS ============

// Configurações de limites
window.LIMITES = {
    proAtivo: false,
    maxClientes: 3,
    maxProdutos: 10,
    maxVendas: 3,
    bloqueadoPorDispositivo: false // NOVO: Flag para modo somente leitura
};

// ============ FUNÇÃO DE REGISTRO DE DISPOSITIVO ============

async function registrarDispositivoAtual() {
    if (!currentUser || !supabaseClient || !isOnline) {
        console.log('[Dispositivo] Não é possível registrar dispositivo (offline ou sem login)');
        return true;
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

        // ✅ CORREÇÃO DO ERRO 409: Buscar dispositivo MESMO QUE ESTEJA INATIVO (remove o .eq('ativo', true))
        var { data: dispositivoExistente, error: buscaError } = await supabaseClient
            .from('dispositivos')
            .select('id, ativo')
            .eq('assinatura_id', assinatura.id)
            .eq('device_id', deviceId)
            .limit(1)
            .maybeSingle();

        if (buscaError && buscaError.code !== 'PGRST116') {
            console.error('[Dispositivo] Erro ao buscar:', buscaError);
            return true;
        }

        // Se encontrou o registro (mesmo que inativo)
        if (dispositivoExistente) {
            if (dispositivoExistente.ativo === true) {
                console.log('[Dispositivo] Dispositivo já registrado e ativo, atualizando último acesso');
                await supabaseClient
                    .from('dispositivos')
                    .update({ ultimo_acesso: new Date().toISOString() })
                    .eq('id', dispositivoExistente.id);
                return true;
            } else {
                // ✅ Reativa o dispositivo que estava inativo, evitando o Erro 409 de chave duplicada!
                console.log('[Dispositivo] Dispositivo já registrado mas INATIVO. Reativando...');
                await supabaseClient
                    .from('dispositivos')
                    .update({ 
                        ativo: true, 
                        ultimo_acesso: new Date().toISOString(),
                        device_name: deviceName,
                        device_type: deviceType,
                        user_agent: navigator.userAgent
                    })
                    .eq('id', dispositivoExistente.id);
                return true;
            }
        }

        // ✅ CORREÇÃO: Contar dispositivos ativos REAIS no banco (não confiar no campo dispositivos_usados)
        var { count: dispositivosAtivosReais, error: countError } = await supabaseClient
            .from('dispositivos')
            .select('id', { count: 'exact', head: true })
            .eq('assinatura_id', assinatura.id)
            .eq('ativo', true);

        if (countError) {
            console.error('[Dispositivo] Erro ao contar dispositivos:', countError);
            dispositivosAtivosReais = 0;
        }

        console.log('[Dispositivo] Dispositivos ativos reais:', dispositivosAtivosReais, '/', assinatura.dispositivos_max);

        // 2. Verificar limite antes de registrar um novo
        if (dispositivosAtivosReais >= assinatura.dispositivos_max) {
            console.warn('[Dispositivo] ⚠️ Limite de dispositivos atingido! (' + dispositivosAtivosReais + '/' + assinatura.dispositivos_max + ') Não é possível registrar novo dispositivo.');
            return false;
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
            .update({ dispositivos_usados: dispositivosAtivosReais + 1 })
            .eq('id', assinatura.id);

        localStorage.setItem('kayla_pro_devices', (dispositivosAtivosReais + 1) + '/' + assinatura.dispositivos_max);
        console.log('[Dispositivo] ✅ Dispositivo registrado com sucesso!');
        return true;

    } catch(e) {
        console.error('[Dispositivo] Erro:', e);
        return true;
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
            .maybeSingle();
        
        if (result.error || !result.data) {
            LIMITES.proAtivo = false;
            LIMITES.bloqueadoPorDispositivo = false;
            localStorage.removeItem('kayla_pro');
            localStorage.removeItem('kayla_pro_key');
            localStorage.removeItem('kayla_pro_expires');
            localStorage.removeItem('kayla_pro_devices');
            localStorage.removeItem('kayla_pro_blocked');
            return false;
        }
        
        var assinatura = result.data;
        
        if (assinatura.data_fim && new Date(assinatura.data_fim) < new Date()) {
            LIMITES.proAtivo = false;
            LIMITES.bloqueadoPorDispositivo = false;
            localStorage.removeItem('kayla_pro');
            localStorage.removeItem('kayla_pro_key');
            localStorage.removeItem('kayla_pro_expires');
            localStorage.removeItem('kayla_pro_devices');
            localStorage.removeItem('kayla_pro_blocked');
            
            await supabaseClient
                .from('assinaturas')
                .update({ status: 'expirada' })
                .eq('id', assinatura.id);
            
            return false;
        }

        var { count: dispositivosAtivos, error: countError } = await supabaseClient
            .from('dispositivos')
            .select('id', { count: 'exact', head: true })
            .eq('assinatura_id', assinatura.id)
            .eq('ativo', true);

        if (countError) {
            console.error('[Pro] Erro ao contar dispositivos:', countError);
            dispositivosAtivos = 0;
        }

        console.log('[Pro] Dispositivos ativos:', dispositivosAtivos, '/', assinatura.dispositivos_max);

        // 🔒 NOVA LÓGICA: Se atingiu o limite, NÃO rebaixar para GRÁTIS. Ativar modo SOMENTE LEITURA.
        if (dispositivosAtivos >= assinatura.dispositivos_max) {
            console.warn('[Pro] ⚠️ LIMITE DE DISPOSITIVOS ATINGIDO! (' + dispositivosAtivos + '/' + assinatura.dispositivos_max + ')');
            console.warn('[Pro] 🔒 Modo SOMENTE LEITURA ativado neste dispositivo. Ações de escrita bloqueadas.');
            
            // Manter como PRO (para visualizar dados), mas bloquear ações
            LIMITES.proAtivo = true;
            LIMITES.bloqueadoPorDispositivo = true;
            
            localStorage.setItem('kayla_pro', 'true');
            localStorage.setItem('kayla_pro_key', assinatura.key_ativacao || '');
            localStorage.setItem('kayla_pro_expires', assinatura.data_fim || '');
            localStorage.setItem('kayla_pro_devices', dispositivosAtivos + '/' + assinatura.dispositivos_max);
            localStorage.setItem('kayla_pro_blocked', 'true');
            
            // Exibir o aviso para o usuário (será chamado pela UI)
            // mostrarAvisoLimiteDispositivos(); <-- Pode ser chamado onde for verificado o estado
            
            return true;
        }
        
        LIMITES.proAtivo = true;
        LIMITES.bloqueadoPorDispositivo = false;
        localStorage.setItem('kayla_pro', 'true');
        localStorage.setItem('kayla_pro_key', assinatura.key_ativacao || '');
        localStorage.setItem('kayla_pro_expires', assinatura.data_fim || '');
        localStorage.setItem('kayla_pro_devices', dispositivosAtivos + '/' + assinatura.dispositivos_max);
        localStorage.removeItem('kayla_pro_blocked');
        
        console.log('[Pro] ✅ PRO ativado! Dispositivos:', dispositivosAtivos + '/' + assinatura.dispositivos_max);
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
    
    if (LIMITES.bloqueadoPorDispositivo) {
        // Badge especial para modo apenas leitura
        badge.textContent = 'PRO (LEITURA)';
        badge.className = 'badge-pro badge-blocked';
    } else if (LIMITES.proAtivo) {
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
    
    // 🚫 Bloqueio por dispositivo
    if (LIMITES.bloqueadoPorDispositivo) {
        toast('Ação bloqueada. Limite de dispositivos atingido.', 'error');
        return;
    }

    var assinatura = await getAssinaturaAtiva();
    if (!assinatura) { toast('Você não possui uma assinatura PRO ativa.', 'error'); return; }

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

    confirmar('Cancelar Assinatura PRO', '⚠️ ATENÇÃO!\nVocê está prestes a CANCELAR sua assinatura PRO.\nIsso desativará todos os seus dispositivos e você perderá acesso aos recursos PRO.' + resumoTexto, async function(confirmed) {
        if (!confirmed) return;
        try {
            await supabaseClient.from('assinaturas').update({ status: 'cancelada' }).eq('id', assinatura.id);
            await supabaseClient.from('dispositivos').update({ ativo: false }).eq('assinatura_id', assinatura.id);
            localStorage.removeItem('kayla_pro');
            localStorage.removeItem('kayla_pro_key');
            localStorage.removeItem('kayla_pro_expires');
            localStorage.removeItem('kayla_pro_devices');
            localStorage.removeItem('kayla_pro_blocked');
            LIMITES.proAtivo = false;
            LIMITES.bloqueadoPorDispositivo = false;
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
    
    // 🚫 Bloqueio por dispositivo
    if (LIMITES.bloqueadoPorDispositivo) {
        toast('Ação bloqueada. Limite de dispositivos atingido.', 'error');
        return;
    }
    
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

    confirmar('Excluir Conta', 'Ao confirmar, TODOS os seus dados (cadastro, clientes, produtos, pedidos e assinaturas) serão EXCLUÍDOS PERMANENTEMENTE.\n\nEsta ação é IRREVERSÍVEL de acordo com a LGPD.' + resumoTexto, async function(confirmou1) {
        if (!confirmou1) return;

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
                    LIMITES.bloqueadoPorDispositivo = false;
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
    // 🚫 Verifica bloqueio por dispositivo OU falta de PRO
    if (LIMITES.bloqueadoPorDispositivo) {
        toast('Ação bloqueada. Limite de dispositivos atingido.', 'error');
        return;
    }
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
    // 🚫 Verifica bloqueio por dispositivo OU falta de PRO
    if (LIMITES.bloqueadoPorDispositivo) {
        toast('Ação bloqueada. Limite de dispositivos atingido.', 'error');
        return;
    }
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
    // 🚫 Verifica bloqueio por dispositivo OU falta de PRO
    if (LIMITES.bloqueadoPorDispositivo) {
        toast('Ação bloqueada. Limite de dispositivos atingido.', 'error');
        return;
    }
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
    // 🚫 Bloqueio duplo por segurança
    if (LIMITES.bloqueadoPorDispositivo) {
        toast('Ação bloqueada. Limite de dispositivos atingido.', 'error');
        fecharModal();
        return;
    }
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
    var url = 'https://wa.me/5541996427444?text=' + encodeURIComponent(mensagem);
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

// ============ MODAIS DE AVISO ============

// Aviso original para limite de itens do GRÁTIS
function mostrarAvisoLimite(tipo) {
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
    
    html += '<button class="btn btn-primary" onclick="fecharModal(); mostrarPlanos()" style="width:100%;margin-bottom:8px">🚀 Ver Planos PRO</button>';
    html += '<button class="btn btn-outline" onclick="fecharModal()" style="width:100%">Cancelar</button>';
    
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
}

// NOVO: Aviso específico para Limite de Dispositivos (Modo Somente Leitura)
function mostrarAvisoLimiteDispositivos() {
    document.getElementById('modal-overlay').classList.remove('show');
    document.getElementById('modal-body').innerHTML = '';

    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">📱 Limite de Dispositivos Atingido</div>';
    html += '<div class="modal-sub">Você está no modo <strong>SOMENTE LEITURA</strong>.</div>';
    
    html += '<div class="card" style="background:var(--bg3);padding:20px;text-align:center;margin-bottom:16px">';
    html += '<div style="font-size:48px;margin-bottom:12px">👁️</div>';
    html += '<div style="font-size:15px;font-weight:500;color:var(--warning);margin-bottom:8px">Você pode ver todos os dados, mas não pode alterá-los.</div>';
    html += '<div style="font-size:13px;color:var(--text2);line-height:1.6">';
    html += 'Para voltar a adicionar, editar ou gerar PDFs, você deve:<br>';
    html += '1️⃣ <strong>Desativar</strong> um dispositivo antigo na aba "Config".<br>';
    html += '2️⃣ Ou <strong>Adquirir mais licenças</strong> para o seu plano PRO.';
    html += '</div>';
    html += '</div>';
    
    html += '<button class="btn btn-primary" onclick="fecharModal()" style="width:100%;margin-bottom:8px">Entendi, continuar visualizando</button>';
    html += '<button class="btn btn-outline" onclick="fecharModal(); mudarAba(\'settings\')" style="width:100%">Ir para Configurações</button>';
    
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
}


// ====================================================================
// 🆕 NOVAS FUNÇÕES PARA GERENCIAR DISPOSITIVOS (CHAMADAS PELA CONFIG)
// ====================================================================

// 1. Listar todos os dispositivos ativos do usuário
async function listarDispositivosAtivos() {
    if (!currentUser) return [];
    try {
        var assinatura = await getAssinaturaAtiva();
        if (!assinatura) return [];
        
        var { data, error } = await supabaseClient
            .from('dispositivos')
            .select('id, device_name, device_type, ultimo_acesso, user_agent')
            .eq('assinatura_id', assinatura.id)
            .eq('ativo', true)
            .order('ultimo_acesso', { ascending: false });

        if (error) {
            console.error('[Dispositivos] Erro ao listar:', error);
            return [];
        }
        return data || [];
    } catch(e) {
        console.error('[Dispositivos] Erro na listagem:', e);
        return [];
    }
}

// 2. Desativar um dispositivo específico
async function desativarDispositivo(deviceId) {
    if (!currentUser) { toast('Usuário não logado.', 'error'); return false; }
    if (!deviceId) { toast('ID do dispositivo inválido.', 'error'); return false; }

    try {
        var { error } = await supabaseClient
            .from('dispositivos')
            .update({ ativo: false })
            .eq('id', deviceId)
            .eq('user_id', currentUser.id);

        if (error) {
            console.error('[Dispositivo] Erro ao desativar:', error);
            toast('Erro ao desativar o dispositivo.', 'error');
            return false;
        }

        toast('✅ Dispositivo removido com sucesso!', 'success');
        
        // Atualiza o status local imediatamente
        await verificarStatusPro();
        atualizarBadgePlano();
        
        // Se a UI tiver uma função de re-renderização, chame-a para mostrar o botão de ativar
        if (typeof renderizarConteudo === 'function') renderizarConteudo();
        
        return true;
    } catch(e) {
        console.error('[Dispositivo] Erro na desativação:', e);
        toast('Erro de conexão ao desativar.', 'error');
        return false;
    }
}

// 3. Forçar a ativação do dispositivo ATUAL (para usar após desativar um antigo)
async function ativarDispositivoAtual() {
    if (!currentUser) { toast('Usuário não logado.', 'error'); return false; }

    try {
        var resultado = await registrarDispositivoAtual();
        
        if (resultado === true) {
            // Reavalia o status (o verificarStatusPro vai ver que agora tem vaga e destravar)
            await verificarStatusPro();
            atualizarBadgePlano();
            
            if (!LIMITES.bloqueadoPorDispositivo) {
                toast('✅ Dispositivo ativado com sucesso! Plano PRO liberado.', 'success');
                if (typeof renderizarConteudo === 'function') renderizarConteudo();
                return true;
            } else {
                toast('⚠️ Dispositivo registrado, mas o limite ainda não foi liberado.', 'warning');
                return false;
            }
        } else {
            toast('❌ Não foi possível ativar este dispositivo. Verifique o limite.', 'error');
            return false;
        }
    } catch(e) {
        console.error('[Dispositivo] Erro ao ativar atual:', e);
        toast('Erro de conexão ao ativar.', 'error');
        return false;
    }
}

console.log('✅ Subscription.js carregado (Versão Final com Gerenciamento de Dispositivos e Correção do Erro 409)');
