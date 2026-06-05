// ============ AUTENTICAÇÃO ============

function abrirLogin(tipo) {
    perfilAtual = tipo;
    var html = '<div class="modal-title">' + (tipo === 'admin' ? '👑 Login Admin' : '👤 Login Usuário') + '</div>';
    html += '<div class="modal-sub">Digite suas credenciais</div>';
    html += '<div class="form-group"><label class="form-label">E-mail</label><input class="form-input" id="email" type="email" placeholder="seu@email.com" onkeypress="if(event.key===\'Enter\')fazerLogin()"></div>';
    html += '<div class="form-group"><label class="form-label">Senha</label><input class="form-input" id="senha" type="password" placeholder="Mínimo 6 caracteres" onkeypress="if(event.key===\'Enter\')fazerLogin()"></div>';
    html += '<div class="checkbox-group"><input type="checkbox" id="lembrar-me"><label for="lembrar-me" style="color:var(--text2);font-size:13px">Lembrar de mim</label></div>';
    html += '<button class="btn btn-primary" onclick="fazerLogin()">Entrar</button>';
    html += '<button class="btn btn-outline" onclick="fecharModal()">Cancelar</button>';
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
    setTimeout(function() { document.getElementById('email').focus(); }, 100);
}

async function verificarSessao() {
    if (!supabaseClient) { mostrarTelaSelecao(); return; }
    var lembrarMe = localStorage.getItem('kayla_lembrar_me');
    if (lembrarMe === 'true') {
        var result = await supabaseClient.auth.getSession();
        if (result.data && result.data.session && result.data.session.user) {
            currentUser = result.data.session.user;
            await carregarDados();
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
    
    if (!email || !senha) { toast('Preencha tudo', 'error'); return; }
    
    var btn = event.target;
    var texto = btn.innerText;
    btn.innerText = 'Verificando...';
    btn.disabled = true;
    
    try {
        // 1. Primeiro tenta fazer login
        var loginResult = await supabaseClient.auth.signInWithPassword({ 
            email: email, 
            password: senha 
        });
        
        // 2. Se login funcionou, entra direto
        if (loginResult.data && loginResult.data.user) {
            if (lembrarMe) {
                localStorage.setItem('kayla_lembrar_me', 'true');
                localStorage.setItem('kayla_email', email);
            } else {
                localStorage.removeItem('kayla_lembrar_me');
                localStorage.removeItem('kayla_email');
            }
            await loginSucesso(loginResult.data.user);
            btn.innerText = texto;
            btn.disabled = false;
            return;
        }
        
        // 3. Se login falhou, verifica se é usuário não encontrado
        if (loginResult.error) {
            var errorMsg = loginResult.error.message.toLowerCase();
            
            // Se é erro de credenciais inválidas, tenta cadastrar
            if (errorMsg.includes('invalid login credentials') || 
                errorMsg.includes('not found') ||
                errorMsg.includes('email')) {
                
                toast('Usuário não encontrado. Cadastrando...', 'warning');
                
                // Tenta cadastrar
                var signUpResult = await supabaseClient.auth.signUp({ 
                    email: email, 
                    password: senha 
                });
                
                if (signUpResult.error) {
                    // Se erro no cadastro, mostra mensagem específica
                    if (signUpResult.error.message.includes('User already registered')) {
                        toast('Usuário já existe! Verifique e-mail e senha.', 'error');
                    } else {
                        toast('Erro ao cadastrar: ' + signUpResult.error.message, 'error');
                    }
                } else {
                    // Cadastro com sucesso
                    toast('Cadastro realizado! Fazendo login...', 'success');
                    
                    // Verifica se já está logado (Supabase as vezes loga auto)
                    if (signUpResult.data && signUpResult.data.user) {
                        if (lembrarMe) {
                            localStorage.setItem('kayla_lembrar_me', 'true');
                            localStorage.setItem('kayla_email', email);
                        }
                        await loginSucesso(signUpResult.data.user);
                    } else {
                        // Tenta fazer login após cadastro
                        setTimeout(async function() {
                            var autoLogin = await supabaseClient.auth.signInWithPassword({ 
                                email: email, 
                                password: senha 
                            });
                            if (autoLogin.data && autoLogin.data.user) {
                                if (lembrarMe) {
                                    localStorage.setItem('kayla_lembrar_me', 'true');
                                    localStorage.setItem('kayla_email', email);
                                }
                                await loginSucesso(autoLogin.data.user);
                            } else {
                                toast('Cadastro feito! Faça login com suas credenciais.', 'success');
                            }
                        }, 1000);
                    }
                }
            } else {
                // Outro erro de login
                toast('E-mail ou senha incorretos', 'error');
            }
        }
        
    } catch (error) {
        toast('Erro de conexão: ' + error.message, 'error');
        console.error(error);
    }
    
    btn.innerText = texto;
    btn.disabled = false;
}

async function loginSucesso(user) {
    currentUser = user;
    localStorage.setItem('perfilAcesso', perfilAtual);
    await carregarDados();
    fecharModal();
    toast('Bem-vindo!', 'success');
    mostrarApp();
}

async function fazerLogout() {
    if (supabaseClient && isOnline) await supabaseClient.auth.signOut();
    localStorage.removeItem('perfilAcesso');
    localStorage.removeItem('kayla_lembrar_me');
    localStorage.removeItem('kayla_email');
    currentUser = null;
    clienteAtual = null;
    pedidoItens = [];
    toast('Logout realizado', 'success');
    mostrarTelaSelecao();
}

async function carregarDados() {
    if (!isOnline) return;
    try {
        var r;
        r = await supabaseClient.from('clientes').select('*').order('nome');
        if (!r.error) { clientes = r.data || []; salvarDadosLocais(); }
        
        r = await supabaseClient.from('produtos').select('*').order('nome');
        if (!r.error) { produtos = r.data || []; salvarDadosLocais(); }
        
        r = await supabaseClient.from('pedidos').select('*').order('created_at', { ascending: false });
        if (!r.error) { pedidos = r.data || []; salvarDadosLocais(); }
        
        lastSync = new Date().toISOString();
        localStorage.setItem('kayla_last_sync', lastSync);
        
    } catch(e) { console.error('Erro:', e); }
}

async function sincronizarDados() {
    if (!isOnline || !currentUser) return;
    toast('🔄 Sincronizando...', 'warning');
    await carregarDados();
    toast('✅ Dados sincronizados!', 'success');
}

console.log('✅ Auth.js carregado');
