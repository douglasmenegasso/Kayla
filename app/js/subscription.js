// ============ ASSINATURAS E DISPOSITIVOS ============

// Configurações de limites
window.LIMITES = {
    proAtivo: false,
    maxClientes: 3,
    maxProdutos: 10,
    maxVendas: 3,
    bloqueadoPorDispositivo: false
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

        // ✅ CORREÇÃO DO ERRO 409: Buscar DISPOSITIVO MESMO QUE INATIVO
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
                await supabaseClient.from('dispositivos').update({ ultimo_acesso: new Date().toISOString() }).eq('id', dispositivoExistente.id);
                return true;
            } else {
                // ✅ Reativa o dispositivo que estava inativo, evitando o Erro 409 de chave duplicada!
                console.log('[Dispositivo] Dispositivo já registrado mas INATIVO. Reativando...');
                await supabaseClient.from('dispositivos').update({ 
                    ativo: true, 
                    ultimo_acesso: new Date().toISOString(),
                    device_name: deviceName,
                    device_type: deviceType,
                    user_agent: navigator.userAgent
                }).eq('id', dispositivoExistente.id);
                return true;
            }
        }

        // ... (O restante da lógica de verificar limite e fazer INSERT caso não exista permanece igual)
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

        if (dispositivosAtivosReais >= assinatura.dispositivos_max) {
            console.warn('[Dispositivo] ⚠️ Limite de dispositivos atingido! (' + dispositivosAtivosReais + '/' + assinatura.dispositivos_max + ') Não é possível registrar novo dispositivo.');
            return false;
        }

        var { error: insertError } = await supabaseClient.from('dispositivos').insert({
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

        await supabaseClient.from('assinaturas').update({ dispositivos_usados: dispositivosAtivosReais + 1 }).eq('id', assinatura.id);
        localStorage.setItem('kayla_pro_devices', (dispositivosAtivosReais + 1) + '/' + assinatura.dispositivos_max);
        console.log('[Dispositivo] ✅ Dispositivo registrado com sucesso!');
        return true;

    } catch(e) {
        console.error('[Dispositivo] Erro:', e);
        return true;
    }
}

// ... (O restante do arquivo com verificarStatusPro e demais funções permanece IGUAL ao seu código atual. Apenas a função acima foi alterada).
