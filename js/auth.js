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
    // Não abre login automaticamente - fica na tela inicial
    mostrarTelaSelecao();
}

async function fazerLogin() {
    var email = document.getElementById('email').value.trim();
    var senha = document.getElementById('senha').value;
    var lembrarMe = document.getElementById('lembrar-me').checked;
    
    if (!email || !senha) { toast('Preencha tudo', 'error'); return; }
    
    var btn = window.event ? window.event.target : null;
    if (!btn) return;
    var texto = btn.innerText;
    btn.innerText = 'Entrando...';
    btn.disabled = true;
    
    try {
        var result = await supabaseClient.auth.signInWithPassword({ 
            email: email, 
            password: senha 
        });
        
        if (result.error) {
            var errorMsg = result.error.message.toLowerCase();
            
            if (errorMsg.includes('invalid login credentials') || errorMsg.includes('bad request')) {
                toast('E-mail ou senha incorretos!\n\nSe esqueceu a senha, clique em "Esqueci a senha"', 'error');
            } else if (errorMsg.includes('email not confirmed')) {
                toast('Confirme seu e-mail antes de entrar', 'warning');
            } else {
                toast('Erro: ' + result.error.message, 'error');
            }
            
            console.error('Erro login:', result.error);
            btn.innerText = texto;
            btn.disabled = false;
            return;
        }
        
        if (lembrarMe) {
            localStorage.setItem('kayla_lembrar_me', 'true');
            localStorage.setItem('kayla_email', email);
        } else {
            localStorage.removeItem('kayla_lembrar_me');
            localStorage.removeItem('kayla_email');
        }
        
        await loginSucesso(result.data.user);
        
    } catch (error) {
        toast('Erro de conexão: ' + error.message, 'error');
        console.error(error);
    }
    
    btn.innerText = texto;
    btn.disabled = false;
}

async function loginSucesso(user) {
    currentUser = user;
    await carregarDados();
    fecharModal();
    toast('Bem-vindo!', 'success');
    mostrarApp();
}

async function recuperarSenha() {
    var email = document.getElementById('email').value.trim();
    
    if (!email) { 
        toast('Digite seu e-mail primeiro', 'warning'); 
        document.getElementById('email').focus();
        return; 
    }
    
    if (!email.includes('@') || !email.includes('.')) {
        toast('Digite um e-mail válido', 'error');
        return;
    }
    
    var btn = window.event ? window.event.target : null;
    if (!btn) return;
    var texto = btn.innerText;
    btn.innerText = 'Enviando...';
    btn.disabled = true;
    
    try {
        var result = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/reset-password.html'
        });
        
        if (result.error) {
            toast('Erro: ' + result.error.message, 'error');
        } else {
            toast('📧 E-mail de recuperação enviado! Verifique sua caixa de entrada.', 'success');
        }
        
    } catch (error) {
        toast('Erro de conexão: ' + error.message, 'error');
        console.error(error);
    }
    
    btn.innerText = texto;
    btn.disabled = false;
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
