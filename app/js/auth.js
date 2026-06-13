// ============ RECUPERAÇÃO DE SENHA ============

function recuperarSenha() {
    var email = document.getElementById('email').value.trim();
    
    if (!email) {
        toast('Digite seu e-mail', 'warning');
        document.getElementById('email').focus();
        return;
    }
    
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        toast('E-mail inválido', 'error');
        return;
    }
    
    confirmar('Recuperar Senha', 'Será enviado um link de recuperação para:\n\n' + email + '\n\nDeseja continuar?', function(confirmed) {
        if (!confirmed) return;
        
        (async function() {
            try {
                if (supabaseClient) {
                    var result = await supabaseClient.auth.resetPasswordForEmail(email, {
                        redirectTo: window.location.origin + '/app/reset-password.html'
                    });
                    
                    if (result.error) {
                        toast('Erro: ' + result.error.message, 'error');
                    } else {
                        toast('✅ E-mail de recuperação enviado!\n\nVerifique sua caixa de entrada e spam.', 'success');
                        fecharModal();
                    }
                } else {
                    toast('⚠️ Modo offline\n\nEm produção, o e-mail seria enviado para: ' + email, 'warning');
                }
            } catch(e) {
                toast('Erro de conexão: ' + e.message, 'error');
                console.error('Erro na recuperação:', e);
            }
        })();
    });
}

// ============ RESET DE SENHA - VERSÃO CORRIGIDA ============

async function verificarResetSenha() {
    console.log('[RESET] Verificando token de recuperação...');
    
    var hash = window.location.hash;
    
    if (!hash || hash.length === 0) {
        console.log('[RESET] Nenhum token na URL');
        return;
    }
    
    if (hash.includes('access_token') && hash.includes('type=recovery')) {
        console.log('[RESET] Token de recuperação detectado');
        
        // Extrair parâmetros da URL
        var params = new URLSearchParams(hash.substring(1));
        var accessToken = params.get('access_token');
        var refreshToken = params.get('refresh_token');
        var type = params.get('type');
        var expiresIn = params.get('expires_in');
        
        console.log('[RESET] Type:', type);
        console.log('[RESET] Access Token:', accessToken ? 'Presente' : 'Ausente');
        console.log('[RESET] Refresh Token:', refreshToken ? 'Presente' : 'Ausente');
        console.log('[RESET] Expires In:', expiresIn);
        
        if (!accessToken) {
            console.error('[RESET] Token ausente');
            mostrarErroReset('Link inválido ou expirado. Solicite uma nova recuperação de senha.');
            return;
        }
        
        if (!supabaseClient) {
            console.error('[RESET] Cliente Supabase não inicializado');
            mostrarErroReset('Erro de configuração. Recarregue a página.');
            return;
        }
        
        // Tentar estabelecer sessão
        try {
            console.log('[RESET] Estabelecendo sessão...');
            
            var { data, error } = await supabaseClient.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || ''
            });
            
            if (error) {
                console.error('[RESET] Erro ao estabelecer sessão:', error);
                console.error('[RESET] Error message:', error.message);
                console.error('[RESET] Error status:', error.status);
                mostrarErroReset('Link expirado ou inválido. Solicite uma nova recuperação.');
                return;
            }
            
            if (!data || !data.session) {
                console.error('[RESET] Sessão não estabelecida - data:', data);
                mostrarErroReset('Não foi possível validar o link. Tente novamente.');
                return;
            }
            
            console.log('[RESET] ✅ Sessão estabelecida com sucesso');
            console.log('[RESET] User:', data.user?.email);
            console.log('[RESET] Session expires at:', data.session?.expires_at);
            
            // Armazenar tokens no localStorage para uso posterior
            if (data.session) {
                localStorage.setItem('kayla_reset_access_token', data.session.access_token);
                localStorage.setItem('kayla_reset_refresh_token', data.session.refresh_token);
            }
            
            // Mostrar formulário
            mostrarFormularioResetSenha();
            
        } catch(e) {
            console.error('[RESET] Exceção ao estabelecer sessão:', e);
            console.error('[RESET] Stack:', e.stack);
            mostrarErroReset('Erro de conexão. Tente novamente.');
        }
    } else if (hash.includes('error')) {
        // Erro retornado pelo Supabase
        var params = new URLSearchParams(hash.substring(1));
        var error = params.get('error');
        var errorDescription = params.get('error_description');
        
        console.error('[RESET] Erro na URL:', error, errorDescription);
        mostrarErroReset(errorDescription || 'Ocorreu um erro. Solicite uma nova recuperação.');
    }
}

function mostrarErroReset(mensagem) {
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">❌ Erro</div>';
    html += '<div class="modal-sub">' + mensagem + '</div>';
    html += '<button class="btn btn-primary" onclick="window.location.href=\'/app/\'">Voltar para Login</button>';
    
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
}

function mostrarFormularioResetSenha() {
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">🔐 Redefinir Senha</div>';
    html += '<div class="modal-sub">Digite sua nova senha</div>';
    
    html += '<div class="form-group">';
    html += '<label class="form-label">Nova Senha</label>';
    html += '<input class="form-input" id="nova-senha" type="password" placeholder="Mínimo 6 caracteres" onkeypress="if(event.key===\'Enter\')processarResetSenha()">';
    html += '</div>';
    
    html += '<div class="form-group">';
    html += '<label class="form-label">Confirmar Nova Senha</label>';
    html += '<input class="form-input" id="confirmar-senha" type="password" placeholder="Repita a nova senha" onkeypress="if(event.key===\'Enter\')processarResetSenha()">';
    html += '</div>';
    
    html += '<button class="btn btn-primary" onclick="processarResetSenha()">🔐 Redefinir Senha</button>';
    html += '<button class="btn btn-outline" onclick="window.location.href=\'/app/\'">Cancelar</button>';
    
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
    
    // Focar no primeiro campo
    setTimeout(function() {
        document.getElementById('nova-senha').focus();
    }, 100);
}

async function processarResetSenha() {
    var novaSenha = document.getElementById('nova-senha').value;
    var confirmarSenha = document.getElementById('confirmar-senha').value;
    
    if (!novaSenha || !confirmarSenha) {
        toast('Preencha todos os campos', 'error');
        return;
    }
    
    if (novaSenha.length < 6) {
        toast('A senha deve ter pelo menos 6 caracteres', 'error');
        return;
    }
    
    if (novaSenha !== confirmarSenha) {
        toast('As senhas não coincidem', 'error');
        return;
    }
    
    var btn = event.target;
    var textoOriginal = btn.innerText;
    btn.innerText = 'Processando...';
    btn.disabled = true;
    
    try {
        if (!supabaseClient) {
            toast('Serviço indisponível', 'error');
            btn.innerText = textoOriginal;
            btn.disabled = false;
            return;
        }
        
        console.log('[RESET] Iniciando atualização de senha...');
        
        // Primeiro, verificar se temos sessão válida
        var { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
        
        if (sessionError) {
            console.error('[RESET] Erro ao obter sessão:', sessionError);
            
            // Tentar usar tokens armazenados
            var storedAccessToken = localStorage.getItem('kayla_reset_access_token');
            var storedRefreshToken = localStorage.getItem('kayla_reset_refresh_token');
            
            if (storedAccessToken) {
                console.log('[RESET] Tentando restaurar sessão com tokens armazenados...');
                
                var { data: restoreData, error: restoreError } = await supabaseClient.auth.setSession({
                    access_token: storedAccessToken,
                    refresh_token: storedRefreshToken || ''
                });
                
                if (restoreError || !restoreData.session) {
                    console.error('[RESET] Falha ao restaurar sessão:', restoreError);
                    toast('Sessão expirada. Solicite um novo link de recuperação.', 'error');
                    btn.innerText = textoOriginal;
                    btn.disabled = false;
                    return;
                }
                
                console.log('[RESET] ✅ Sessão restaurada com sucesso');
            } else {
                toast('Sessão expirada. Solicite um novo link de recuperação.', 'error');
                btn.innerText = textoOriginal;
                btn.disabled = false;
                return;
            }
        }
        
        if (!sessionData || !sessionData.session) {
            console.error('[RESET] Sessão ausente após verificação');
            toast('Sessão expirada. Solicite um novo link de recuperação.', 'error');
            btn.innerText = textoOriginal;
            btn.disabled = false;
            return;
        }
        
        console.log('[RESET] Sessão válida, atualizando senha...');
        
        // Atualizar senha
        var { data, error } = await supabaseClient.auth.updateUser({
            password: novaSenha
        });
        
        if (error) {
            console.error('[RESET] Erro ao atualizar senha:', error);
            console.error('[RESET] Error message:', error.message);
            console.error('[RESET] Error status:', error.status);
            toast('Erro: ' + error.message, 'error');
            btn.innerText = textoOriginal;
            btn.disabled = false;
            return;
        }
        
        console.log('[RESET] ✅ Senha atualizada com sucesso');
        console.log('[RESET] User:', data.user?.email);
        
        toast('✅ Senha redefinida com sucesso!', 'success');
        
        // Limpar tokens armazenados
        localStorage.removeItem('kayla_reset_access_token');
        localStorage.removeItem('kayla_reset_refresh_token');
        
        // Limpar URL
        window.history.replaceState(null, null, window.location.pathname);
        
        // Fazer logout para forçar login com nova senha
        try {
            await supabaseClient.auth.signOut();
            console.log('[RESET] Logout realizado');
        } catch(e) {
            console.warn('[RESET] Erro ao fazer logout:', e);
        }
        
        // Redirecionar após 2 segundos
        setTimeout(function() {
            fecharModal();
            window.location.href = '/app/';
        }, 2000);
        
    } catch(e) {
        console.error('[RESET] Exceção:', e);
        console.error('[RESET] Stack:', e.stack);
        toast('Erro de conexão: ' + e.message, 'error');
        btn.innerText = textoOriginal;
        btn.disabled = false;
    }
}

// Verificar reset de senha ao carregar
window.addEventListener('load', function() {
    setTimeout(function() {
        verificarResetSenha();
    }, 500);
});

console.log('✅ Reset password functions loaded');
