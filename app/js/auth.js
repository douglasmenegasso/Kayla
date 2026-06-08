// ============ AUTENTICAÇÃO ============

function mostrarTelaSelecao() {
    // Tela já está visível no HTML - não precisa fazer nada
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
}

function abrirLogin() {
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">🔐 Login</div>';
    html += '<div class="modal-sub">Digite suas credenciais</div>';
    html += '<div class="form-group"><label class="form-label">E-mail</label><input class="form-input" id="email" type="email" placeholder="seu@email.com" onkeypress="if(event.key===\'Enter\')fazerLogin()"></div>';
    html += '<div class="form-group"><label class="form-label">Senha</label><input class="form-input" id="senha" type="password" placeholder="Mínimo 6 caracteres" onkeypress="if(event.key===\'Enter\')fazerLogin()"></div>';
    html += '<div class="checkbox-group"><input type="checkbox" id="lembrar-me"><label for="lembrar-me" style="color:var(--text2);font-size:13px">Lembrar de mim</label></div>';
    html += '<div style="text-align:right;margin-bottom:12px"><button class="btn btn-sm btn-outline" onclick="recuperarSenha()" style="width:auto;padding:6px 12px;font-size:11px">🔑 Esqueci a senha</button></div>';
    html += '<button class="btn btn-primary" onclick="fazerLogin()">Entrar</button>';
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
    
    // Se tem sessão salva, entra direto (online ou offline)
    if (lembrarMe === 'true') {
        var emailSalvo = localStorage.getItem('kayla_email');
        var userSalvo = localStorage.getItem('kayla_user');
        
        if (userSalvo) {
            try {
                currentUser = JSON.parse(userSalvo);
            } catch(e) {
                currentUser = { email: emailSalvo, id: 'local' };
            }
            
            // Tenta carregar online, mas se falhar usa dados locais
            if (isOnline && supabaseClient) {
                try {
                    await carregarDados();
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
    
    // Sem sessão salva - mostra tela de login
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
    
    var btn = event ? event.target : null;
    if (!btn) {
        btn = document.querySelector('button[type="submit"]');
    }
    
    var textoOriginal = btn ? btn.innerText : 'Entrar';
    if (btn) {
        btn.innerText = 'Entrando...';
        btn.disabled = true;
    }
    
    try {
        // Verifica se está online
        if (isOnline && supabaseClient) {
            // ONLINE: Tenta login no Supabase
            console.log('[AUTH] Login online via Supabase');
            
            var result = await supabaseClient.auth.signInWithPassword({ 
                email: email, 
                password: senha 
            });
            
            if (result.error) {
                var errorMsg = result.error.message.toLowerCase();
                
                if (errorMsg.includes('invalid login credentials') || errorMsg.includes('bad request')) {
                    toast('E-mail ou senha incorretos!', 'error');
                } else if (errorMsg.includes('email not confirmed')) {
                    toast('Confirme seu e-mail antes de entrar', 'warning');
                } else {
                    toast('Erro: ' + result.error.message, 'error');
                }
                
                console.error('[AUTH] Erro login:', result.error);
                if (btn) {
                    btn.innerText = textoOriginal;
                    btn.disabled = false;
                }
                return;
            }
            
            // Login online sucesso
            await loginSucesso(result.data.user);
            
        } else {
            // OFFLINE: Verifica se tem sessão salva
            console.log('[AUTH] Tentando login offline');
            
            var userSalvo = localStorage.getItem('kayla_user');
            var emailSalvo = localStorage.getItem('kayla_email');
            var senhaSalva = localStorage.getItem('kayla_senha_hash'); // Hash simples
            
            if (userSalvo && emailSalvo === email) {
                // Verifica se a senha bate (comparação simples)
                if (senhaSalva && senha !== atob(senhaSalva)) {
                    toast('Senha incorreta para login offline', 'error');
                    if (btn) {
                        btn.innerText = textoOriginal;
                        btn.disabled = false;
                    }
                    return;
                }
                
                // Login offline sucesso
                console.log('[AUTH] Login offline bem-sucedido');
                var userOffline = JSON.parse(userSalvo);
                await loginSucesso(userOffline);
                
            } else {
                // Sem sessão salva
                console.log('[AUTH] Sem sessão offline salva');
                toast('⚠️ Sem conexão e sem sessão salva.\n\nConecte-se à internet para fazer o primeiro login.', 'error');
                if (btn) {
                    btn.innerText = textoOriginal;
                    btn.disabled = false;
                }
                return;
            }
        }
        
        // Salvar "lembrar-me"
        if (lembrarMe) {
            localStorage.setItem('kayla_lembrar_me', 'true');
            localStorage.setItem('kayla_email', email);
        } else {
            localStorage.removeItem('kayla_lembrar_me');
            localStorage.removeItem('kayla_email');
        }
        
    } catch (error) {
        console.error('[AUTH] Erro inesperado:', error);
        toast('Erro de conexão: ' + error.message, 'error');
    }
    
    if (btn) {
        btn.innerText = textoOriginal;
        btn.disabled = false;
    }
}

async function loginSucesso(user) {
    console.log('[AUTH] Login sucesso:', user.email);
    
    currentUser = user;
    
    // Salvar sessão localmente para funcionar offline
    try {
        localStorage.setItem('kayla_user', JSON.stringify(user));
        localStorage.setItem('kayla_email', user.email);
        
        // Salvar senha (hash simples em base64)
        var senhaInput = document.getElementById('senha');
        if (senhaInput && senhaInput.value) {
            localStorage.setItem('kayla_senha_hash', btoa(senhaInput.value));
        }
        
        console.log('[AUTH] Sessão salva no localStorage');
    } catch(e) {
        console.error('[AUTH] Erro ao salvar sessão:', e);
    }
    
    // Carregar dados
    if (isOnline && supabaseClient) {
        console.log('[AUTH] Carregando dados online...');
        await carregarDados();
    } else {
        console.log('[AUTH] Carregando dados offline...');
        carregarDadosLocais();
    }
    
    // Fechar modal e mostrar app
    fecharModal();
    toast('Bem-vindo!', 'success');
    mostrarApp();
    atualizarBadgePlano();
    
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
    
    // Limpar TODOS os dados locais
    localStorage.removeItem('kayla_lembrar_me');
    localStorage.removeItem('kayla_email');
    localStorage.removeItem('kayla_user');
    localStorage.removeItem('kayla_senha_hash'); // Remover senha salva
    localStorage.removeItem('perfilAcesso');
    
    currentUser = null;
    clienteAtual = null;
    pedidoItens = [];
    
    toast('Logout realizado', 'success');
    
    // Mostrar tela de login
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
            carregarDadosLocais(); // Fallback para offline
        }
    } else {
        // Offline: carrega do localStorage
        carregarDadosLocais();
    }
}

async function sincronizarDados() {
    if (!isOnline || !currentUser) return;
    toast('🔄 Sincronizando...', 'warning');
    await carregarDados();
    toast('✅ Dados sincronizados!', 'success');
}

console.log('✅ Auth.js carregado');
