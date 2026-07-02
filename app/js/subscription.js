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
    if (!currentUser || !supabaseClient || !isOnline) return true;

    try {
        var deviceId = getDeviceId();
        var deviceName = getDeviceName();
        var deviceType = getDeviceType();
        var assinatura = await getAssinaturaAtiva();

        if (!assinatura) return true;

        // 1. Verificar se o dispositivo já está registrado
        var { data: dispositivoExistente } = await supabaseClient
            .from('dispositivos')
            .select('id, ativo')
            .eq('assinatura_id', assinatura.id)
            .eq('device_id', deviceId)
            .limit(1)
            .maybeSingle();

        if (dispositivoExistente) {
            if (dispositivoExistente.ativo === true) {
                await supabaseClient.from('dispositivos').update({ ultimo_acesso: new Date().toISOString() }).eq('id', dispositivoExistente.id);
                return true;
            } else {
                // Tentar reativar se houver vaga
                var { count: ativos } = await supabaseClient.from('dispositivos').select('id', { count: 'exact', head: true }).eq('assinatura_id', assinatura.id).eq('ativo', true);
                if (ativos >= assinatura.dispositivos_max) return false;

                await supabaseClient.from('assinaturas').update({ dispositivos_usados: ativos + 1 }).eq('id', assinatura.id);
                await supabaseClient.from('dispositivos').update({ ativo: true, ultimo_acesso: new Date().toISOString(), device_name: deviceName }).eq('id', dispositivoExistente.id);
                return true;
            }
        }

        // 2. Novo registro se houver vaga
        var { count: ativos } = await supabaseClient.from('dispositivos').select('id', { count: 'exact', head: true }).eq('assinatura_id', assinatura.id).eq('ativo', true);
        if (ativos >= assinatura.dispositivos_max) return false;

        await supabaseClient.from('dispositivos').insert({
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

        await supabaseClient.from('assinaturas').update({ dispositivos_usados: ativos + 1 }).eq('id', assinatura.id);
        return true;
    } catch(e) { return true; }
}

// ============ VERIFICAR STATUS PRO ============

async function verificarStatusPro() {
    if (!currentUser || !supabaseClient) return false;
    
    try {
        var result = await supabaseClient.from('assinaturas').select('*').eq('user_id', currentUser.id).eq('status', 'ativa').order('created_at', { ascending: false }).limit(1).maybeSingle();
        
        if (result.error || !result.data) {
            resetarStatusLocal();
            return false;
        }
        
        var assinatura = result.data;
        if (assinatura.data_fim && new Date(assinatura.data_fim) < new Date()) {
            resetarStatusLocal();
            await supabaseClient.from('assinaturas').update({ status: 'expirada' }).eq('id', assinatura.id);
            return false;
        }

        // VERIFICAÇÃO RIGOROSA: Buscar IDs de dispositivos ativos no banco
        var { data: ativos } = await supabaseClient.from('dispositivos').select('device_id').eq('assinatura_id', assinatura.id).eq('ativo', true);
        
        var meuId = getDeviceId();
        var estouAtivo = ativos ? ativos.some(function(d) { return d.device_id === meuId; }) : false;
        var totalAtivos = ativos ? ativos.length : 0;

        // ATUALIZAR CONTADOR NA ASSINATURA SE ESTIVER ERRADO
        if (assinatura.dispositivos_usados !== totalAtivos) {
            await supabaseClient.from('assinaturas').update({ dispositivos_usados: totalAtivos }).eq('id', assinatura.id);
        }

        // TRAVA: Se não estou na lista de ativos, SOU GRÁTIS neste dispositivo
        if (!estouAtivo) {
            LIMITES.proAtivo = false;
            localStorage.setItem('kayla_pro', 'false');
            localStorage.setItem('kayla_pro_devices', totalAtivos + '/' + assinatura.dispositivos_max);
            
            // ✅ NOVO: Mas ainda armazenar a chave para facilitar ativação posterior
            if (assinatura.key_ativacao) {
                localStorage.setItem('kayla_pro_key', assinatura.key_ativacao);
                localStorage.setItem('kayla_pro_expires', assinatura.data_fim || '');
            }
            
            atualizarBadgePlano();
            return false;
        }
        
        // Se estou ativo, PRO liberado
        LIMITES.proAtivo = true;
        localStorage.setItem('kayla_pro', 'true');
        localStorage.setItem('kayla_pro_key', assinatura.key_ativacao || '');
        localStorage.setItem('kayla_pro_expires', assinatura.data_fim || '');
        localStorage.setItem('kayla_pro_devices', totalAtivos + '/' + assinatura.dispositivos_max);
        atualizarBadgePlano();
        return true;
        
    } catch(e) { return false; }
}

function resetarStatusLocal() {
    LIMITES.proAtivo = false;
    localStorage.removeItem('kayla_pro');
    localStorage.removeItem('kayla_pro_key');
    localStorage.removeItem('kayla_pro_expires');
    localStorage.removeItem('kayla_pro_devices');
    atualizarBadgePlano();
}

function atualizarBadgePlano() {
    var badge = document.getElementById('plan-badge');
    if (!badge) return;
    badge.textContent = LIMITES.proAtivo ? 'PRO' : 'GRÁTIS';
    badge.className = LIMITES.proAtivo ? 'badge-pro' : 'badge-free';
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
    return atual < limite;
}

async function getAssinaturaAtiva() {
    if (!currentUser || !supabaseClient) return null;
    try {
        var result = await supabaseClient.from('assinaturas').select('*').eq('user_id', currentUser.id).eq('status', 'ativa').order('created_at', { ascending: false }).limit(1).maybeSingle();
        return result.data;
    } catch(e) { return null; }
}

async function cancelarAssinatura() {
    if (!currentUser) return;
    var assinatura = await getAssinaturaAtiva();
    if (!assinatura) return;

    confirmar('🚫 CANCELAR PRO (1/2)', 'Isso desativará todos os seus dispositivos e você perderá o acesso às funções PRO imediatamente. Confirmar?', function(confirmed) {
        if (!confirmed) return;
        
        setTimeout(function() {
            confirmar('🚨 CONFIRMAÇÃO FINAL (2/2)', 'VOCÊ TEM CERTEZA? Sua assinatura será cancelada PERMANENTEMENTE e não poderá ser recuperada. Deseja continuar?', async function(finalConfirmed) {
                if (!finalConfirmed) return;
                
                try {
                    // Como a tabela assinaturas tem RLS restrito a service_role para UPDATE,
                    // tentamos usar a Edge Function de cancelamento dedicada.
                    var response = await fetch(SUPABASE_EDGE_URL + '/cancel-subscription', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + SUPABASE_KEY
                        },
                        body: JSON.stringify({ 
                            user_id: currentUser.id,
                            assinatura_id: assinatura.id
                        })
                    });
                    
                    if (!response.ok) {
                        // Fallback: Tentar via client direto (pode falhar se RLS estiver ativo)
                        await supabaseClient.from('assinaturas').update({ status: 'cancelada', updated_at: new Date().toISOString() }).eq('id', assinatura.id);
                        await supabaseClient.from('dispositivos').update({ ativo: false }).eq('assinatura_id', assinatura.id);
                    }
                    
                    resetarStatusLocal();
                    if (typeof mudarAba === 'function') mudarAba('settings');
                    toast('✅ Assinatura cancelada permanentemente.', 'success');
                } catch(e) { 
                    console.error('Erro ao cancelar assinatura:', e);
                    toast('❌ Erro ao cancelar.', 'error'); 
                }
            });
        }, 500);
    });
}
