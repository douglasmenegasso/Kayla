// ============ ASSINATURAS E DISPOSITIVOS ============

// Configurações de limites
window.LIMITES = {
    proAtivo: false,
    maxClientes: 3,
    maxProdutos: 10,
    maxVendas: 3,
    bloqueadoPorDispositivo: false // Mantido para compatibilidade, mas não usado na lógica de bloqueio
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

        // 1. Verificar se o dispositivo já está registrado (mesmo que inativo)
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
                // ✅ CORREÇÃO CRUCIAL: Reativa o dispositivo e ATUALIZA O CONTADOR
                console.log('[Dispositivo] Dispositivo já registrado mas INATIVO. Reativando e atualizando contador...');
                
                // Pega a contagem atual
                var { count: dispositivosAtivosReais, error: countError } = await supabaseClient
                    .from('dispositivos')
                    .select('id', { count: 'exact', head: true })
                    .eq('assinatura_id', assinatura.id)
                    .eq('ativo', true);

                if (countError) {
                    console.error('[Dispositivo] Erro ao contar dispositivos:', countError);
                    dispositivosAtivosReais = 0;
                }

                var novaContagem = dispositivosAtivosReais + 1;

                // Atualiza a assinatura com a nova contagem
                await supabaseClient
                    .from('assinaturas')
                    .update({ 
                        dispositivos_usados: novaContagem,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', assinatura.id);

                // Reativa o dispositivo
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

                localStorage.setItem('kayla_pro_devices', novaContagem + '/' + assinatura.dispositivos_max);
                console.log('[Dispositivo] ✅ Dispositivo reativado e contador atualizado para ' + novaContagem);
                return true;
            }
        }

        // ✅ CORREÇÃO: Contar dispositivos ativos REAIS no banco
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
            resetarStatusLocal();
            return false;
        }
        
        var assinatura = result.data;
        
        if (assinatura.data_fim && new Date(assinatura.data_fim) < new Date()) {
            resetarStatusLocal();
            await supabaseClient
                .from('assinaturas')
                .update({ status: 'expirada' })
                .eq('id', assinatura.id);
            return false;
        }

        // ✅ LÓGICA SIMPLIFICADA: Verificar se o dispositivo ATUAL está na lista de ativos
        var { data: ativos, error: countError } = await supabaseClient
            .from('dispositivos')
            .select('device_id')
            .eq('assinatura_id', assinatura.id)
            .eq('ativo', true);

        if (countError) {
            console.error('[Pro] Erro ao contar dispositivos:', countError);
            ativos = [];
        }

        var dispositivosAtivosCount = ativos ? ativos.length : 0;
        var meuId = getDeviceId();
        var estouAtivo = ativos ? ativos.some(function(d) { return d.device_id === meuId; }) : false;

        console.log('[Pro] Dispositivos ativos:', dispositivosAtivosCount, '/', assinatura.dispositivos_max, '| Este dispositivo ativo:', estouAtivo);

        // Se NÃO estou na lista de ativos, sou GRÁTIS (sem modo leitura, apenas rebaixado)
        if (!estouAtivo) {
            console.warn('[Pro] Este dispositivo não está ativado. Operando em modo GRÁTIS.');
            LIMITES.proAtivo = false;
            LIMITES.bloqueadoPorDispositivo = false;
            
            localStorage.setItem('kayla_pro', 'false');
            localStorage.setItem('kayla_pro_devices', dispositivosAtivosCount + '/' + assinatura.dispositivos_max);
            localStorage.removeItem('kayla_pro_blocked');
            return false;
        }
        
        // Se estou ativo, configurar PRO normalmente
        LIMITES.proAtivo = true;
        LIMITES.bloqueadoPorDispositivo = false;
        localStorage.setItem('kayla_pro', 'true');
        localStorage.setItem('kayla_pro_key', assinatura.key_ativacao || '');
        localStorage.setItem('kayla_pro_expires', assinatura.data_fim || '');
        localStorage.setItem('kayla_pro_devices', dispositivosAtivosCount + '/' + assinatura.dispositivos_max);
        localStorage.removeItem('kayla_pro_blocked');
        
        console.log('[Pro] ✅ PRO ativado! Dispositivos:', dispositivosAtivosCount + '/' + assinatura.dispositivos_max);
        return true;
        
    } catch(e) {
        console.error('[Pro] Erro ao verificar status:', e);
        return false;
    }
}

function resetarStatusLocal() {
    LIMITES.proAtivo = false;
    LIMITES.bloqueadoPorDispositivo = false;
    localStorage.removeItem('kayla_pro');
    localStorage.removeItem('kayla_pro_key');
    localStorage.removeItem('kayla_pro_expires');
    localStorage.removeItem('kayla_pro_devices');
    localStorage.removeItem('kayla_pro_blocked');
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
            resetarStatusLocal();
            atualizarBadgePlano();
            if (typeof mudarAba === 'function') mudarAba('settings');
            toast('✅ Assinatura PRO cancelada com sucesso!', 'success');
        } catch(e) {
            toast('❌ Erro ao cancelar assinatura', 'error');
            console.error('Erro ao cancelar assinatura:', e);
        }
    });
}
