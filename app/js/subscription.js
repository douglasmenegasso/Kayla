// ============ SISTEMA DE ASSINATURA E DISPOSITIVOS ============

// ============ DISPOSITIVO ============

// Gerar ID único do dispositivo
function getDeviceId() {
    var deviceId = localStorage.getItem('kayla_device_id');
    if (!deviceId) {
        deviceId = 'DEV-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
        localStorage.setItem('kayla_device_id', deviceId);
        console.log('[SUB] Novo Device ID gerado:', deviceId);
    }
    return deviceId;
}

// Obter nome do dispositivo
function getDeviceName() {
    var ua = navigator.userAgent;
    var name = 'Dispositivo';
    
    // Detectar navegador
    var browser = 'Desconhecido';
    if (/Chrome/i.test(ua)) browser = 'Chrome';
    else if (/Firefox/i.test(ua)) browser = 'Firefox';
    else if (/Safari/i.test(ua)) browser = 'Safari';
    else if (/Edge/i.test(ua)) browser = 'Edge';
    
    // Detectar SO
    var os = 'Desconhecido';
    if (/Android/i.test(ua)) os = 'Android';
    else if (/iPhone/i.test(ua)) os = 'iPhone';
    else if (/iPad/i.test(ua)) os = 'iPad';
    else if (/Windows/i.test(ua)) os = 'Windows';
    else if (/Mac/i.test(ua)) os = 'Mac';
    else if (/Linux/i.test(ua)) os = 'Linux';
    
    name = browser + ' - ' + os;
    
    // Adicionar hostname se disponível
    if (window.location.hostname) {
        name += ' (' + window.location.hostname + ')';
    }
    
    return name;
}

// Obter informações completas do dispositivo
function getDeviceInfo() {
    var ua = navigator.userAgent;
    var deviceType = 'desktop';
    
    if (/mobile|android|iphone|ipod/i.test(ua)) deviceType = 'mobile';
    else if (/tablet|ipad/i.test(ua)) deviceType = 'tablet';
    
    return {
        id: getDeviceId(),
        name: getDeviceName(),
        type: deviceType,
        userAgent: ua,
        platform: navigator.platform || 'Desconhecido',
        language: navigator.language || 'pt-BR',
        screen: window.screen.width + 'x' + window.screen.height
    };
}

// ============ ASSINATURAS ============

// Buscar assinatura ativa do usuário
async function getAssinaturaAtiva() {
    if (!currentUser || !supabaseClient) return null;
    
    try {
        var result = await supabaseClient
            .from('assinaturas')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('status', 'ativa')
            .order('data_fim', { ascending: false })
            .limit(1);
        
        if (result.data && result.data.length > 0) {
            var assinatura = result.data[0];
            
            // Verificar se ainda está válida
            if (new Date(assinatura.data_fim) > new Date()) {
                return assinatura;
            } else {
                // Expirou - atualizar status
                await supabaseClient
                    .from('assinaturas')
                    .update({ 
                        status: 'expirada',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', assinatura.id);
                
                return null;
            }
        }
        
        return null;
    } catch(e) {
        console.error('[SUB] Erro ao buscar assinatura:', e);
        return null;
    }
}

// Verificar se assinatura está ativa (com cache local)
async function verificarAssinaturaAtiva() {
    if (!currentUser) return false;
    
    // Verificar expiração local primeiro (rápido)
    var expiraLocal = localStorage.getItem('kayla_pro_expires');
    if (expiraLocal) {
        var dataExpira = new Date(expiraLocal);
        if (dataExpira < new Date()) {
            // Expirou - limpar dados locais
            console.log('[SUB] Assinatura expirada localmente');
            LIMITES.proAtivo = false;
            localStorage.removeItem('kayla_pro');
            localStorage.removeItem('kayla_pro_expires');
            localStorage.removeItem('kayla_pro_key');
            localStorage.removeItem('kayla_pro_devices');
            atualizarBadgePlano();
            return false;
        }
    }
    
    // Verificar no banco (online)
    if (isOnline && supabaseClient) {
        try {
            var assinatura = await getAssinaturaAtiva();
            
            if (assinatura) {
                // Atualizar dados locais
                LIMITES.proAtivo = true;
                localStorage.setItem('kayla_pro', 'true');
                localStorage.setItem('kayla_pro_key', assinatura.key_ativacao);
                localStorage.setItem('kayla_pro_expires', assinatura.data_fim);
                localStorage.setItem('kayla_pro_devices', assinatura.dispositivos_usados + '/' + assinatura.dispositivos_max);
                
                atualizarBadgePlano();
                return true;
            } else {
                // Não tem assinatura ativa
                LIMITES.proAtivo = false;
                localStorage.removeItem('kayla_pro');
                localStorage.removeItem('kayla_pro_expires');
                localStorage.removeItem('kayla_pro_key');
                localStorage.removeItem('kayla_pro_devices');
                atualizarBadgePlano();
                return false;
            }
        } catch(e) {
            console.error('[SUB] Erro ao verificar assinatura:', e);
            // Se der erro, confiar no cache local
            return LIMITES.proAtivo;
        }
    }
    
    // Offline - confiar no cache local
    return LIMITES.proAtivo;
}

// ============ DISPOSITIVOS ============

// Registrar dispositivo atual
async function registrarDispositivoAtual() {
    if (!currentUser || !supabaseClient || !isOnline) {
        console.log('[SUB] Não é possível registrar dispositivo (offline ou sem login)');
        return true; // Permite acesso offline
    }
    
    try {
        var deviceInfo = getDeviceInfo();
        var assinatura = await getAssinaturaAtiva();
        
        // Se não tem assinatura, é usuário FREE - não registra
        if (!assinatura) {
            console.log('[SUB] Usuário FREE - sem registro de dispositivo');
            return true;
        }
        
        console.log('[SUB] Registrando dispositivo:', deviceInfo);
        
        // Verificar se dispositivo já está registrado
        var check = await supabaseClient
            .from('dispositivos')
            .select('id')
            .eq('assinatura_id', assinatura.id)
            .eq('device_id', deviceInfo.id)
            .limit(1);
        
        if (check.data && check.data.length > 0) {
            console.log('[SUB] Dispositivo já registrado, atualizando último acesso');
            // Atualizar último acesso
            await supabaseClient
                .from('dispositivos')
                .update({ 
                    ultimo_acesso: new Date().toISOString(),
                    device_name: deviceInfo.name,
                    user_agent: deviceInfo.userAgent
                })
                .eq('id', check.data[0].id);
            return true;
        }
        
        // Verificar limite de dispositivos
        if (assinatura.dispositivos_usados >= assinatura.dispositivos_max) {
            console.warn('[SUB] Limite de dispositivos atingido!');
            mostrarModalLimiteDispositivos(assinatura);
            return false;
        }
        
        // Registrar novo dispositivo
        var result = await supabaseClient
            .from('dispositivos')
            .insert({
                assinatura_id: assinatura.id,
                user_id: currentUser.id,
                device_id: deviceInfo.id,
                device_name: deviceInfo.name,
                device_type: deviceInfo.type,
                user_agent: deviceInfo.userAgent
            });
        
        if (result.error) {
            console.error('[SUB] Erro ao registrar dispositivo:', result.error);
            // Se der erro, permite acesso (não bloqueia o usuário)
            return true;
        }
        
        // Atualizar contador
        await supabaseClient
            .from('assinaturas')
            .update({ 
                dispositivos_usados: assinatura.dispositivos_usados + 1,
                updated_at: new Date().toISOString()
            })
            .eq('id', assinatura.id);
        
        // Atualizar localStorage
        localStorage.setItem('kayla_pro_devices', (assinatura.dispositivos_usados + 1) + '/' + assinatura.dispositivos_max);
        
        console.log('[SUB] ✅ Dispositivo registrado com sucesso!');
        return true;
        
    } catch(e) {
        console.error('[SUB] Erro ao registrar dispositivo:', e);
        // Se der erro, permite acesso (não bloqueia o usuário)
        return true;
    }
}

// ============ VERIFICAÇÃO DE ACESSO ============

// Verificar acesso ao app (chamado no login)
async function verificarAcessoApp() {
    if (!currentUser) return false;
    
    console.log('[SUB] Verificando acesso ao app...');
    
    // Verificar assinatura
    var temAssinatura = await verificarAssinaturaAtiva();
    
    if (temAssinatura) {
        // Registrar dispositivo
        var dispositivoRegistrado = await registrarDispositivoAtual();
        
        if (!dispositivoRegistrado) {
            // Limite atingido - não permite acesso PRO
            LIMITES.proAtivo = false;
            localStorage.removeItem('kayla_pro');
            atualizarBadgePlano();
            return false;
        }
        
        return true;
    }
    
    // Sem assinatura - modo FREE
    LIMITES.proAtivo = false;
    atualizarBadgePlano();
    return true; // Permite acesso ao app (modo free)
}

// ============ MODAIS ============

// Modal de limite de dispositivos
function mostrarModalLimiteDispositivos(assinatura) {
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">📱 Limite Atingido</div>';
    html += '<div class="modal-sub">Você atingiu o limite de dispositivos</div>';
    
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
    html += '<div style="text-align:center;margin-bottom:16px">';
    html += '<div style="font-size:48px">🔒</div>';
    html += '<div style="font-size:16px;font-weight:700;color:var(--warning);margin-top:8px">';
    html += assinatura.dispositivos_usados + ' de ' + assinatura.dispositivos_max + ' dispositivos em uso';
    html += '</div></div>';
    
    html += '<div style="font-size:13px;color:var(--text2);text-align:center">';
    html += 'Para adicionar mais dispositivos, você pode:<br><br>';
    html += '1️⃣ Remover um dispositivo antigo<br>';
    html += '2️⃣ Fazer upgrade do plano';
    html += '</div></div>';
    
    html += '<button class="btn btn-primary" onclick="fecharModal(); gerenciarDispositivos()">📱 Gerenciar Dispositivos</button>';
    html += '<button class="btn btn-outline" onclick="fecharModal(); mostrarPlanos()">🚀 Fazer Upgrade</button>';
    html += '<button class="btn btn-outline" onclick="fecharModal()">Fechar</button>';
    
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
}

// Modal de informações da assinatura
async function mostrarInfoAssinatura() {
    if (!currentUser) {
        toast('Faça login primeiro', 'error');
        return;
    }
    
    var assinatura = await getAssinaturaAtiva();
    
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">📋 Minha Assinatura</div>';
    
    if (!assinatura) {
        html += '<div class="card" style="background:var(--bg3);padding:20px;text-align:center;margin-bottom:16px">';
        html += '<div style="font-size:48px;margin-bottom:12px">🆓</div>';
        html += '<div style="font-size:16px;font-weight:700;margin-bottom:8px">Plano Gratuito</div>';
        html += '<div style="font-size:13px;color:var(--text2);margin-bottom:16px">';
        html += 'Você está usando o plano gratuito com limitações.';
        html += '</div>';
        html += '<div style="font-size:12px;color:var(--text2);text-align:left;margin-bottom:16px">';
        html += '<strong>Limites:</strong><br>';
        html += '• ' + LIMITES.freeClientes + ' clientes<br>';
        html += '• ' + LIMITES.freeProdutos + ' produtos<br>';
        html += '• 1 dispositivo<br>';
        html += '• Sem geração de PDF<br>';
        html += '</div>';
        html += '</div>';
        
        html += '<button class="btn btn-primary" onclick="fecharModal(); mostrarPlanos()">🚀 Assinar PRO</button>';
        html += '<button class="btn btn-outline" onclick="fecharModal()">Fechar</button>';
    } else {
        // Buscar informações do plano
        var planoNome = 'PRO';
        var planoTipo = '';
        try {
            if (assinatura.plano_id) {
                var planoResult = await supabaseClient
                    .from('planos')
                    .select('*')
                    .eq('id', assinatura.plano_id)
                    .single();
                
                if (planoResult.data) {
                    planoNome = planoResult.data.nome;
                    planoTipo = planoResult.data.tipo;
                }
            }
        } catch(e) {
            console.error('[SUB] Erro ao buscar plano:', e);
        }
        
        var dataInicio = new Date(assinatura.data_inicio).toLocaleDateString('pt-BR');
        var dataFim = new Date(assinatura.data_fim).toLocaleDateString('pt-BR');
        var diasRestantes = Math.ceil((new Date(assinatura.data_fim) - new Date()) / (1000 * 60 * 60 * 24));
        
        html += '<div class="card" style="background:linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%);padding:16px;margin-bottom:16px;text-align:center">';
        html += '<div style="font-size:48px;margin-bottom:8px">⭐</div>';
        html += '<div style="font-size:20px;font-weight:700;color:#fff;margin-bottom:4px">Plano PRO</div>';
        html += '<div style="font-size:14px;color:rgba(255,255,255,0.9)">' + planoNome + '</div>';
        html += '</div>';
        
        html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
        html += '<div style="display:flex;justify-content:space-between;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--border)">';
        html += '<span style="color:var(--text2)">Status:</span>';
        html += '<strong style="color:var(--success)">✅ ATIVA</strong>';
        html += '</div>';
        
        html += '<div style="display:flex;justify-content:space-between;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--border)">';
        html += '<span style="color:var(--text2)">Início:</span>';
        html += '<strong>' + dataInicio + '</strong>';
        html += '</div>';
        
        html += '<div style="display:flex;justify-content:space-between;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--border)">';
        html += '<span style="color:var(--text2)">Vencimento:</span>';
        html += '<strong>' + dataFim + '</strong>';
        html += '</div>';
        
        html += '<div style="display:flex;justify-content:space-between;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--border)">';
        html += '<span style="color:var(--text2)">Dias restantes:</span>';
        html += '<strong style="color:var(--accent)">' + diasRestantes + ' dias</strong>';
        html += '</div>';
        
        html += '<div style="display:flex;justify-content:space-between;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--border)">';
        html += '<span style="color:var(--text2)">Dispositivos:</span>';
        html += '<strong>' + assinatura.dispositivos_usados + ' de ' + assinatura.dispositivos_max + '</strong>';
        html += '</div>';
        
        html += '<div style="display:flex;justify-content:space-between">';
        html += '<span style="color:var(--text2)">Key de ativação:</span>';
        html += '<strong style="font-family:monospace;font-size:11px">' + assinatura.key_ativacao + '</strong>';
        html += '</div>';
        html += '</div>';
        
        html += '<button class="btn btn-primary" onclick="fecharModal(); gerenciarDispositivos()">📱 Gerenciar Dispositivos</button>';
        
        if (assinatura.dispositivos_max < 5) {
            html += '<button class="btn btn-outline" onclick="fecharModal(); fazerUpgradeDispositivos()">⬆️ Adicionar Dispositivos</button>';
        }
        
        html += '<button class="btn btn-outline" onclick="fecharModal()">Fechar</button>';
    }
    
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
}

// ============ INICIALIZAÇÃO ============

// Verificar assinatura ao carregar (se já logado)
window.addEventListener('load', function() {
    setTimeout(async function() {
        if (currentUser) {
            console.log('[SUB] Verificando assinatura ao carregar...');
            await verificarAssinaturaAtiva();
        }
    }, 1000);
});

// Verificar periodicamente (a cada 5 minutos)
setInterval(async function() {
    if (currentUser && isOnline) {
        await verificarAssinaturaAtiva();
    }
}, 5 * 60 * 1000);

console.log('✅ Subscription.js carregado');
