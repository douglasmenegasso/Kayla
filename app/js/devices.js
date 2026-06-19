// ============ GERENCIAMENTO DE DISPOSITIVOS ============

// Função para obter ID único do dispositivo
function getDeviceId() {
    // Tenta pegar do localStorage primeiro
    var deviceId = localStorage.getItem('kayla_device_id');
    
    if (!deviceId) {
        // Gera novo ID único
        deviceId = 'DEV-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 10).toUpperCase();
        localStorage.setItem('kayla_device_id', deviceId);
    }
    
    return deviceId;
}

// Função para obter nome do dispositivo
function getDeviceName() {
    var userAgent = navigator.userAgent;
    var deviceName = 'Dispositivo Desconhecido';
    
    // Detectar tipo de dispositivo
    if (/Android/i.test(userAgent)) {
        deviceName = 'Android';
        if (/Mobile/i.test(userAgent)) {
            deviceName = 'Android Mobile';
        } else {
            deviceName = 'Android Tablet';
        }
    } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
        if (/iPad/i.test(userAgent)) {
            deviceName = 'iPad';
        } else if (/iPhone/i.test(userAgent)) {
            deviceName = 'iPhone';
        } else {
            deviceName = 'iPod';
        }
    } else if (/Windows/i.test(userAgent)) {
        deviceName = 'Windows';
        if (/Mobile/i.test(userAgent)) {
            deviceName = 'Windows Mobile';
        }
    } else if (/Mac/i.test(userAgent)) {
        deviceName = 'Mac';
    } else if (/Linux/i.test(userAgent)) {
        deviceName = 'Linux';
    }
    
    // Detectar navegador
    var browser = '';
    if (/Chrome/i.test(userAgent) && !/Edge/i.test(userAgent)) {
        browser = 'Chrome';
    } else if (/Firefox/i.test(userAgent)) {
        browser = 'Firefox';
    } else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) {
        browser = 'Safari';
    } else if (/Edge|Edg/i.test(userAgent)) {
        browser = 'Edge';
    }
    
    // Adicionar versão do navegador
    var browserVersion = '';
    var match = userAgent.match(/(Chrome|Firefox|Safari|Edge|Edg)\/(\d+)/i);
    if (match) {
        browserVersion = ' ' + match[2];
    }
    
    return deviceName + ' - ' + browser + browserVersion;
}

// Função para obter tipo de dispositivo
function getDeviceType() {
    var userAgent = navigator.userAgent;
    
    if (/Mobile|Android|iPhone|iPad|iPod/i.test(userAgent)) {
        return 'mobile';
    } else if (/Tablet|iPad/i.test(userAgent)) {
        return 'tablet';
    } else {
        return 'desktop';
    }
}

// ============ REGISTRO DE DISPOSITIVO ============

async function registrarDispositivo(assinaturaId) {
    if (!currentUser || !supabaseClient) {
        console.error('[Dispositivo] Usuário não autenticado');
        return null;
    }
    
    try {
        var deviceId = getDeviceId();
        var deviceName = getDeviceName();
        var deviceType = getDeviceType();
        
        console.log('[Dispositivo] Registrando:', {
            id: deviceId,
            name: deviceName,
            type: deviceType,
            assinaturaId: assinaturaId
        });
        
        // Verificar se dispositivo já está registrado
        var { data: dispositivoExistente, error: buscaError } = await supabaseClient
            .from('dispositivos')
            .select('id, ativo')
            .eq('device_id', deviceId)
            .eq('assinatura_id', assinaturaId)
            .limit(1)
            .single();
        
        if (buscaError && buscaError.code !== 'PGRST116') {
            // Erro diferente de "não encontrado"
            console.error('[Dispositivo] Erro ao buscar:', buscaError);
        }
        
        if (dispositivoExistente) {
            // Dispositivo já registrado - atualizar último acesso
            console.log('[Dispositivo] Dispositivo já registrado, atualizando último acesso');
            
            var { data: atualizado, error: updateError } = await supabaseClient
                .from('dispositivos')
                .update({
                    ultimo_acesso: new Date().toISOString(),
                    user_agent: navigator.userAgent,
                    ativo: true
                })
                .eq('id', dispositivoExistente.id)
                .select()
                .single();
            
            if (updateError) {
                console.error('[Dispositivo] Erro ao atualizar:', updateError);
                return null;
            }
            
            console.log('[Dispositivo] Último acesso atualizado');
            return atualizado;
        }
        
        // Novo dispositivo - registrar
        console.log('[Dispositivo] Registrando novo dispositivo...');
        
        var { data: novoDispositivo, error: insertError } = await supabaseClient
            .from('dispositivos')
            .insert({
                assinatura_id: assinaturaId,
                user_id: currentUser.id,
                device_id: deviceId,
                device_name: deviceName,
                device_type: deviceType,
                ip_address: null, // Não temos acesso ao IP no frontend
                user_agent: navigator.userAgent,
                primeiro_acesso: new Date().toISOString(),
                ultimo_acesso: new Date().toISOString(),
                ativo: true
            })
            .select()
            .single();
        
        if (insertError) {
            console.error('[Dispositivo] Erro ao registrar:', insertError);
            
            // Verificar se é erro de limite de dispositivos
            if (insertError.message && insertError.message.includes('limit')) {
                toast('Limite de dispositivos atingido!', 'error');
            }
            
            return null;
        }
        
        console.log('[Dispositivo] ✅ Dispositivo registrado com sucesso');
        return novoDispositivo;
        
    } catch(e) {
        console.error('[Dispositivo] Erro:', e);
        return null;
    }
}

// ============ VERIFICAÇÃO DE LIMITES ============

async function verificarLimiteDispositivos(assinaturaId) {
    if (!currentUser || !supabaseClient) {
        return { podeAdicionar: false, motivo: 'Usuário não autenticado' };
    }
    
    try {
        // Buscar assinatura ativa
        var { data: assinatura, error: assError } = await supabaseClient
            .from('assinaturas')
            .select('dispositivos_max, dispositivos_usados')
            .eq('id', assinaturaId)
            .single();
        
        if (assError || !assinatura) {
            return { podeAdicionar: false, motivo: 'Assinatura não encontrada' };
        }
        
        // Contar dispositivos ativos
        var { count: dispositivosAtivos, error: countError } = await supabaseClient
            .from('dispositivos')
            .select('id', { count: 'exact', head: true })
            .eq('assinatura_id', assinaturaId)
            .eq('ativo', true);
        
        if (countError) {
            console.error('[Dispositivo] Erro ao contar:', countError);
            return { podeAdicionar: false, motivo: 'Erro ao verificar limite' };
        }
        
        var podeAdicionar = dispositivosAtivos < assinatura.dispositivos_max;
        var motivo = podeAdicionar 
            ? null 
            : 'Você atingiu o limite de ' + assinatura.dispositivos_max + ' dispositivos';
        
        return {
            podeAdicionar: podeAdicionar,
            dispositivosAtivos: dispositivosAtivos,
            dispositivosMax: assinatura.dispositivos_max,
            motivo: motivo
        };
        
    } catch(e) {
        console.error('[Dispositivo] Erro ao verificar limite:', e);
        return { podeAdicionar: false, motivo: 'Erro de conexão' };
    }
}

// ============ LISTAR DISPOSITIVOS ============

async function listarDispositivos(assinaturaId) {
    if (!currentUser || !supabaseClient) {
        return [];
    }
    
    try {
        var { data: dispositivos, error } = await supabaseClient
            .from('dispositivos')
            .select('*')
            .eq('assinatura_id', assinaturaId)
            .eq('ativo', true)
            .order('ultimo_acesso', { ascending: false });
        
        if (error) {
            console.error('[Dispositivo] Erro ao listar:', error);
            return [];
        }
        
        return dispositivos || [];
        
    } catch(e) {
        console.error('[Dispositivo] Erro:', e);
        return [];
    }
}

// ============ REMOVER DISPOSITIVO ============

async function removerDispositivo(deviceId, assinaturaId) {
    if (!currentUser || !supabaseClient) {
        toast('Faça login primeiro', 'error');
        return false;
    }
    
    try {
        var { error } = await supabaseClient
            .from('dispositivos')
            .update({ ativo: false })
            .eq('id', deviceId)
            .eq('assinatura_id', assinaturaId);
        
        if (error) {
            console.error('[Dispositivo] Erro ao remover:', error);
            toast('Erro ao remover dispositivo', 'error');
            return false;
        }
        
        // Atualizar contador de dispositivos usados
        var { data: assinatura, error: assError } = await supabaseClient
            .from('assinaturas')
            .select('dispositivos_usados')
            .eq('id', assinaturaId)
            .single();
        
        if (!assError && assinatura) {
            var novosUsados = Math.max(0, assinatura.dispositivos_usados - 1);
            
            await supabaseClient
                .from('assinaturas')
                .update({ 
                    dispositivos_usados: novosUsados,
                    updated_at: new Date().toISOString()
                })
                .eq('id', assinaturaId);
        }
        
        console.log('[Dispositivo] ✅ Dispositivo removido');
        return true;
        
    } catch(e) {
        console.error('[Dispositivo] Erro:', e);
        toast('Erro ao remover dispositivo', 'error');
        return false;
    }
}

// ============ LIMPAR DISPOSITIVOS INATIVOS ============

async function limparDispositivosInativos(assinaturaId) {
    if (!currentUser || !supabaseClient) {
        return 0;
    }
    
    try {
        // Dispositivos inativos há mais de 30 dias
        var trintaDiasAtras = new Date();
        trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
        
        var { data: dispositivosInativos, error } = await supabaseClient
            .from('dispositivos')
            .select('id')
            .eq('assinatura_id', assinaturaId)
            .eq('ativo', true)
            .lt('ultimo_acesso', trintaDiasAtras.toISOString());
        
        if (error || !dispositivosInativos) {
            return 0;
        }
        
        // Desativar dispositivos inativos
        for (var i = 0; i < dispositivosInativos.length; i++) {
            await supabaseClient
                .from('dispositivos')
                .update({ ativo: false })
                .eq('id', dispositivosInativos[i].id);
        }
        
        console.log('[Dispositivo] ✅', dispositivosInativos.length, 'dispositivos inativos removidos');
        return dispositivosInativos.length;
        
    } catch(e) {
        console.error('[Dispositivo] Erro ao limpar:', e);
        return 0;
    }
}

// ============ EXPORTAR FUNÇÕES GLOBAIS ============

// Tornar funções disponíveis globalmente
window.getDeviceId = getDeviceId;
window.getDeviceName = getDeviceName;
window.getDeviceType = getDeviceType;
window.registrarDispositivo = registrarDispositivo;
window.verificarLimiteDispositivos = verificarLimiteDispositivos;
window.listarDispositivos = listarDispositivos;
window.removerDispositivo = removerDispositivo;
window.limparDispositivosInativos = limparDispositivosInativos;

console.log('✅ Devices.js carregado');
