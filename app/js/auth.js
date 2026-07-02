// ============ AUTENTICAÇÃO ============

function mostrarTelaSelecao() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
}

function abrirLogin() {
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">🔐 Login</div>';
    html += '<div class="modal-sub">Digite suas credenciais</div>';
    html += '<div class="form-group"><label class="form-label">E-mail</label><input class="form-input" id="email" type="email" placeholder="seu@email.com" onkeypress="if(event.key===\'Enter\'){event.preventDefault();fazerLogin();}"></div>';
    html += '<div class="form-group"><label class="form-label">Senha</label><input class="form-input" id="senha" type="password" placeholder="Mínimo 6 caracteres" onkeypress="if(event.key===\'Enter\'){event.preventDefault();fazerLogin();}"></div>';
    html += '<div class="checkbox-group"><input type="checkbox" id="lembrar-me"><label for="lembrar-me" style="color:var(--text2);font-size:13px">Lembrar de mim</label></div>';
    html += '<div style="text-align:right;margin-bottom:12px"><button class="btn btn-sm btn-outline" onclick="recuperarSenha()" style="width:auto;padding:6px 12px;font-size:11px">🔑 Esqueci a senha</button></div>';
    html += '<button id="btn-fazer-login" class="btn btn-primary" onclick="fazerLogin()">Entrar</button>';
    html += '<button class="btn btn-outline" onclick="fecharModal()">Cancelar</button>';
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
    setTimeout(function() { document.getElementById('email').focus(); }, 100);
}

function abrirCadastro() {
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">📝 Criar Conta</div>';
    html += '<div class="modal-sub">Preencha seus dados</div>';
    html += '<div class="form-group"><label class="form-label">Nome</label><input class="form-input" id="cadastro-nome" placeholder="Seu nome"></div>';
    html += '<div class="form-group"><label class="form-label">E-mail</label><input class="form-input" id="cadastro-email" type="email" placeholder="seu@email.com"></div>';
    html += '<div class="form-group"><label class="form-label">Senha</label><input class="form-input" id="cadastro-senha" type="password" placeholder="Mínimo 6 caracteres"></div>';
    html += '<div class="form-group"><label class="form-label">Confirmar Senha</label><input class="form-input" id="cadastro-senha2" type="password" placeholder="Repita a senha"></div>';
    html += '<button class="btn btn-primary" onclick="fazerCadastro()">Cadastrar</button>';
    html += '<button class="btn btn-outline" onclick="abrirLogin()">Já tenho conta</button>';
    html += '<button class="btn btn-outline" onclick="mostrarTelaSelecao()">Voltar</button>';
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
}

async function verificarSessao() {
    var lembrarMe = localStorage.getItem('kayla_lembrar_me');
    
    if (lembrarMe === 'true') {
        var emailSalvo = localStorage.getItem('kayla_email');
        var userSalvo = localStorage.getItem('kayla_user');
        
        if (userSalvo) {
            try {
                currentUser = JSON.parse(userSalvo);
            } catch(e) {
                currentUser = { email: emailSalvo, id: 'local' };
            }
            
            if (isOnline && supabaseClient) {
                try {
                    await carregarDados();
                    await verificarStatusPro();
                    
                    // NÃO registra o dispositivo automaticamente ao restaurar sessão
                    // O usuário deve ativar manualmente via botão
                    
                    // ✅ NOVO: Verificar se voltou de um pagamento
                    if (typeof verificarRetornoPagamento === 'function') {
                        verificarRetornoPagamento();
                    }
                } catch(e) {
                    console.warn('Falha ao sincronizar, usando dados locais');
                }
            } else {
                carregarDadosLocais();
            }
            
            mostrarApp();
            return;
        }
    }
    
    mostrarTelaSelecao();
}

async function fazerLogin() {
    var email = document.getElementById('email').value.trim();
    var senha = document.getElementById('senha').value;
    var lembrarMe = document.getElementById('lembrar-me').checked;
    
    if (!email || !senha) { 
        toast('Preencha e-mail e senha', 'error'); 
        return; 
    }
    
    // Encontra o botão de forma mais confiável
    var btn = document.querySelector('.modal-content button[onclick="fazerLogin()"]');
    if (!btn) {
        btn = document.querySelector('button[onclick="fazerLogin()"]');
    }
    
    if (btn && btn.disabled) return; // Evita loop/cliques duplos

    var textoOriginal = btn ? btn.innerText : 'Entrar';
    
    if (btn) {
        btn.innerText = 'Entrando...';
        btn.disabled = true;
    }
    
    console.log('[AUTH] Tentando login - Email:', email, 'Online:', isOnline);
    
    // OFFLINE: Primeiro verifica se tem sessão salva
    var userSalvo = localStorage.getItem('kayla_user');
    var emailSalvo = localStorage.getItem('kayla_email');
    var senhaSalva = localStorage.getItem('kayla_senha_hash');
    
    if (!isOnline && userSalvo && emailSalvo === email) {
        console.log('[AUTH] Login OFFLINE detectado');
        
        try {
            var userOffline = JSON.parse(userSalvo);
            
            if (senhaSalva) {
                var senhaDecodificada = atob(senhaSalva);
                if (senha !== senhaDecodificada) {
                    toast('Senha incorreta', 'error');
                    if (btn) {
                        btn.innerText = textoOriginal;
                        btn.disabled = false;
                    }
                    return;
                }
            }
            
            currentUser = userOffline;
            
            if (lembrarMe) {
                localStorage.setItem('kayla_lembrar_me', 'true');
                localStorage.setItem('kayla_email', email);
            }
            
            carregarDadosLocais();
            
            fecharModal();
            toast('Bem-vindo (Offline)!', 'success');
            mostrarApp();
            atualizarBadgePlano();
            
            console.log('[AUTH] Login OFFLINE sucesso');
            
            if (btn) {
                btn.innerText = textoOriginal;
                btn.disabled = false;
            }
            return;
            
        } catch(e) {
            console.error('[AUTH] Erro ao fazer login offline:', e);
            toast('Erro ao carregar sessão offline', 'error');
            if (btn) {
                btn.innerText = textoOriginal;
                btn.disabled = false;
            }
            return;
        }
    }
    
    // ONLINE: Tenta login no Supabase
    if (supabaseClient && isOnline) {
        console.log('[AUTH] Login ONLINE via Supabase');
        
        try {
            var result = await supabaseClient.auth.signInWithPassword({ 
                email: email, 
                password: senha 
            });
            
            console.log('[AUTH] Resultado Supabase:', result);
            
            if (result.error) {
                var errorMsg = result.error.message || 'Erro desconhecido';
                
                if (errorMsg.toLowerCase().includes('invalid login credentials') || 
                    errorMsg.toLowerCase().includes('bad request')) {
                    toast('E-mail ou senha incorretos!', 'error');
                } else if (errorMsg.toLowerCase().includes('email not confirmed')) {
                    toast('Confirme seu e-mail antes de entrar', 'warning');
                } else {
                    toast('Erro: ' + errorMsg, 'error');
                }
                
                console.error('[AUTH] Erro login:', result.error);
                
                if (btn) {
                    btn.innerText = textoOriginal;
                    btn.disabled = false;
                }
                return;
            }
            
            // Login online sucesso
            if (result.data && result.data.user) {
                await loginSucesso(result.data.user, senha, lembrarMe);
            } else {
                toast('Erro ao fazer login', 'error');
            }
            
        } catch(error) {
            console.error('[AUTH] Exceção no login:', error);
            
            if (userSalvo && emailSalvo === email) {
                console.log('[AUTH] Falha online, tentando offline...');
                toast('Sem conexão. Tentando login offline...', 'warning');
                
                try {
                    var userOffline = JSON.parse(userSalvo);
                    currentUser = userOffline;
                    
                    if (lembrarMe) {
                        localStorage.setItem('kayla_lembrar_me', 'true');
                        localStorage.setItem('kayla_email', email);
                    }
                    
                    carregarDadosLocais();
                    fecharModal();
                    toast('Bem-vindo (Offline)!', 'success');
                    mostrarApp();
                } catch(e) {
                    console.error('[AUTH] Erro no fallback offline:', e);
                    toast('Erro ao carregar sessão offline', 'error');
                }
            } else {
                toast('Erro de conexão: ' + error.message, 'error');
            }
        } finally {
            // Garantir que o botão seja restaurado em qualquer caso (sucesso ou erro)
            if (btn) {
                btn.innerText = textoOriginal;
                btn.disabled = false;
            }
        }
    } else {
        if (!isOnline) {
            toast('Sem conexão com a internet', 'warning');
        } else {
            toast('Serviço de autenticação indisponível', 'error');
        }
        if (btn) {
            btn.innerText = textoOriginal;
            btn.disabled = false;
        }
    }
}

async function loginSucesso(user, senha, lembrarMe) {
    console.log('[AUTH] Login sucesso:', user.email);
    
    currentUser = user;
    
    try {
        localStorage.setItem('kayla_user', JSON.stringify(user));
        localStorage.setItem('kayla_email', user.email);
        
        if (senha) {
            localStorage.setItem('kayla_senha_hash', btoa(senha));
        }
        
        if (lembrarMe) {
            localStorage.setItem('kayla_lembrar_me', 'true');
        }
        
        console.log('[AUTH] Sessão salva no localStorage');
    } catch(e) {
        console.error('[AUTH] Erro ao salvar sessão:', e);
    }
    
    if (isOnline && supabaseClient) {
        console.log('[AUTH] Carregando dados online...');
        await carregarDados();
    } else {
        console.log('[AUTH] Carregando dados offline...');
        carregarDadosLocais();
    }

    // Verifica se tem assinatura válida e define a badge
    // NÃO registra o dispositivo automaticamente — o usuário deve ativar manualmente
    await verificarStatusPro();
    
    fecharModal();
    toast('Bem-vindo!', 'success');
    mostrarApp();
    atualizarBadgePlano();
    
    // ✅ NOVO: Verificar se voltou de um pagamento após o login
    setTimeout(function() {
        if (typeof verificarRetornoPagamento === 'function') {
            verificarRetornoPagamento();
        }
    }, 1000);
    
    console.log('[AUTH] Login completo!');
}

async function fazerLogout() {
    console.log('[AUTH] Logout iniciado');
    
    if (supabaseClient && isOnline) {
        try {
            await supabaseClient.auth.signOut();
        } catch(e) {
            console.warn('[AUTH] Erro ao fazer logout no Supabase:', e);
        }
    }
    
    // Limpar sessão
    localStorage.removeItem('kayla_lembrar_me');
    localStorage.removeItem('kayla_email');
    localStorage.removeItem('kayla_user');
    localStorage.removeItem('kayla_senha_hash');
    localStorage.removeItem('perfilAcesso');
    
    // Limpar status PRO local
    if (typeof resetarStatusLocal === 'function') {
        resetarStatusLocal();
    } else {
        localStorage.removeItem('kayla_pro');
        localStorage.removeItem('kayla_pro_key');
        localStorage.removeItem('kayla_pro_expires');
        localStorage.removeItem('kayla_pro_devices');
    }
    
    currentUser = null;
    clienteAtual = null;
    pedidoItens = [];
    
    toast('Logout realizado', 'success');
    
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
    
    console.log('[AUTH] Logout completo');
}

async function carregarDados() {
    if (!currentUser) return;
    
    if (isOnline && supabaseClient) {
        try {
            var userId = currentUser.id;
            var r;
            
            r = await supabaseClient.from('clientes').select('*').eq('user_id', userId).order('nome');
            if (!r.error) { clientes = r.data || []; salvarDadosLocais(); }
            
            r = await supabaseClient.from('produtos').select('*').eq('user_id', userId).order('nome');
            if (!r.error) { produtos = r.data || []; salvarDadosLocais(); }
            
            r = await supabaseClient.from('pedidos').select('*').eq('user_id', userId).order('created_at', { ascending: false });
            if (!r.error) { pedidos = r.data || []; salvarDadosLocais(); }
            
            lastSync = new Date().toISOString();
            localStorage.setItem('kayla_last_sync', lastSync);
            
        } catch(e) {
            console.error('Erro ao sincronizar:', e);
            carregarDadosLocais();
        }
    } else {
        carregarDadosLocais();
    }
}

async function sincronizarDados() {
    if (!isOnline || !currentUser) return;
    toast('🔄 Sincronizando...', 'warning');
    await carregarDados();
    toast('✅ Dados sincronizados!', 'success');
}

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

console.log('✅ Auth.js carregado (Versão corrigida com verificação de pagamento e exclusão radical de conta)');

// ============ FUNÇÕES DE EXCLUSÃO DE DADOS E CONTA ============

async function apagarDadosUsuario() {
    if (!currentUser) return;
    
    confirmar('⚠️ APAGAR TUDO (1/2)', 'Isso excluirá PERMANENTEMENTE todos os seus clientes, produtos e pedidos. Esta ação não pode ser desfeita. Deseja continuar?', function(confirmed) {
        if (!confirmed) return;
        
        setTimeout(function() {
            confirmar('🚨 CONFIRMAÇÃO FINAL (2/2)', 'VOCÊ TEM CERTEZA? Todos os seus dados de vendas, clientes e estoque serão perdidos para sempre.', async function(finalConfirmed) {
                if (!finalConfirmed) return;
                
                toast('⏳ Apagando dados...', 'warning');
                
                try {
                    if (isOnline && supabaseClient) {
                        await supabaseClient.from('clientes').delete().eq('user_id', currentUser.id);
                        await supabaseClient.from('produtos').delete().eq('user_id', currentUser.id);
                        await supabaseClient.from('pedidos').delete().eq('user_id', currentUser.id);
                    }
                    
                    clientes = [];
                    produtos = [];
                    pedidos = [];
                    salvarDadosLocais();
                    
                    toast('✅ Todos os dados foram apagados.', 'success');
                    if (typeof mudarAba === 'function') mudarAba('settings');
                    
                } catch(e) {
                    toast('❌ Erro ao apagar dados.', 'error');
                }
            });
        }, 500);
    });
}

async function excluirContaUsuario() {
    if (!currentUser) return;
    
    confirmar('🚫 EXCLUIR CONTA (1/2)', 'ATENÇÃO: Sua conta e todos os seus dados serão excluídos permanentemente. Se você tem uma assinatura PRO, ela será perdida. Deseja realmente excluir sua conta?', function(confirmed) {
        if (!confirmed) return;
        
        setTimeout(function() {
            confirmar('🚨 EXCLUSÃO PERMANENTE (2/2)', 'ÚLTIMO AVISO: Esta ação é IRREVERSÍVEL. Você perderá seu acesso e sua assinatura imediatamente. Confirmar exclusão definitiva?', async function(finalConfirmed) {
                if (!finalConfirmed) return;
                
                toast('⏳ Excluindo conta...', 'warning');
                
                try {
                    if (isOnline && supabaseClient) {
                        var userId = currentUser.id;
                        
                        // 1. Chamar Edge Function para deletar TUDO (Auth + Tabelas restritas por RLS)
                        // Como assinaturas e dispositivos têm RLS restrito a service_role para DELETE/UPDATE,
                        // a Edge Function é o único lugar que pode realizar a limpeza completa com segurança.
                        try {
                            var response = await fetch(SUPABASE_EDGE_URL + '/delete-user', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': 'Bearer ' + SUPABASE_KEY
                                },
                                body: JSON.stringify({ 
                                    user_id: userId,
                                    clean_all_data: true // Sinaliza para a função apagar também as tabelas vinculadas
                                })
                            });
                            
                            if (!response.ok) {
                                console.warn('Edge Function delete-user retornou erro:', response.status);
                                
                                // Fallback: Tentar apagar o que for possível via RLS de usuário (clientes, produtos, pedidos)
                                await Promise.allSettled([
                                    supabaseClient.from('clientes').delete().eq('user_id', userId),
                                    supabaseClient.from('produtos').delete().eq('user_id', userId),
                                    supabaseClient.from('pedidos').delete().eq('user_id', userId),
                                    supabaseClient.from('pedido_itens').delete().eq('user_id', userId)
                                ]);
                            }
                        } catch(e2) { 
                            console.error('Erro ao chamar Edge Function delete-user:', e2);
                        }
                        
                        // 3. Forçar logout no Supabase Auth (lado do cliente)
                        await supabaseClient.auth.signOut();
                    }
                    
                    // 4. Limpeza radical local
                    localStorage.clear(); // Apaga TUDO do localStorage para este domínio
                    
                    toast('✅ Conta excluída com sucesso.', 'success');
                    
                    // Recarregar a página para limpar todo o estado da memória
                    setTimeout(function() {
                        window.location.reload();
                    }, 1500);
                    
                } catch(e) {
                    console.error('Erro crítico na exclusão:', e);
                    toast('❌ Erro ao excluir conta.', 'error');
                }
            });
        }, 500);
    });
}
