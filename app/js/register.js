// ============ CADASTRO DE USUÁRIOS (Com Nome Obrigatório) ============

function abrirCadastro(tipo) {
    perfilAtual = tipo;
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">' + (tipo === 'admin' ? '👑 Cadastrar Admin' : '📝 Criar Conta') + '</div>';
    html += '<div class="modal-sub">Preencha seus dados</div>';
    
    // Campo Nome adicionado
    html += '<div class="form-group"><label class="form-label">Nome *</label><input class="form-input" id="cadastro-nome" placeholder="Seu nome completo" onkeypress="if(event.key===\'Enter\')document.getElementById(\'cadastro-email\').focus()"></div>';
    html += '<div class="form-group"><label class="form-label">E-mail *</label><input class="form-input" id="cadastro-email" type="email" placeholder="seu@email.com" onkeypress="if(event.key===\'Enter\')document.getElementById(\'cadastro-senha\').focus()"></div>';
    html += '<div class="form-group"><label class="form-label">Senha *</label><input class="form-input" id="cadastro-senha" type="password" placeholder="Mínimo 6 caracteres" onkeypress="if(event.key===\'Enter\')document.getElementById(\'cadastro-senha2\').focus()"></div>';
    html += '<div class="form-group"><label class="form-label">Confirmar Senha *</label><input class="form-input" id="cadastro-senha2" type="password" placeholder="Repita a senha" onkeypress="if(event.key===\'Enter\')fazerCadastro()"></div>';
    html += '<div style="background:var(--bg3);padding:12px;border-radius:8px;margin-bottom:16px;font-size:12px;color:var(--text2)">💡 Dica: Use uma senha forte com pelo menos 6 caracteres</div>';
    html += '<button class="btn btn-primary" onclick="fazerCadastro()">✅ Criar Conta</button>';
    html += '<button class="btn btn-outline" onclick="abrirLogin()">Já tenho conta</button>';
    html += '<button class="btn btn-outline" onclick="mostrarTelaSelecao()">Voltar</button>';
    
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
    setTimeout(function() { document.getElementById('cadastro-nome').focus(); }, 100);
}

async function fazerCadastro() {
// 🚫 Bloqueio por dispositivo
if (LIMITES.bloqueadoPorDispositivo) {
    toast('🔒 Ação bloqueada. Limite de dispositivos atingido. Libere um dispositivo nas Configurações.', 'error');
    return;
}

// ✅ CORREÇÃO: Usar os IDs corretos do auth.js
var nome = document.getElementById('cadastro-nome').value.trim();
var email = document.getElementById('cadastro-email').value.trim();
var senha = document.getElementById('cadastro-senha').value;
var senha2 = document.getElementById('cadastro-senha2').value;

if (!nome) { 
    toast('Preencha seu nome completo', 'error'); 
    return; 
}
if (!email || !senha || !senha2) { 
    toast('Preencha todos os campos', 'error'); 
    return; 
}
if (!email.includes('@') || !email.includes('.')) {
    toast('Digite um e-mail válido', 'error');
    return;
}
if (senha.length < 6) { 
    toast('Senha deve ter no mínimo 6 caracteres', 'error'); 
    return; 
}
if (senha !== senha2) { 
    toast('As senhas não conferem', 'error'); 
    return; 
}

var btn = window.event ? window.event.target : null;
var texto = btn ? btn.innerText : 'Cadastrar';
if (btn) {
    btn.innerText = 'Cadastrando...';
    btn.disabled = true;
}

try {
    var result = await supabaseClient.auth.signUp({ 
        email: email, 
        password: senha,
        options: {
            data: {
                name: nome
            }
        }
    });
    
    if (result.error) {
        var errorMsg = result.error.message.toLowerCase();
        if (errorMsg.includes('user already') || errorMsg.includes('already registered')) {
            toast('Este e-mail já está cadastrado! Tente fazer login.', 'error');
        } else if (errorMsg.includes('weak password')) {
            toast('Senha muito fraca. Use pelo menos 6 caracteres.', 'error');
        } else if (errorMsg.includes('invalid email')) {
            toast('E-mail inválido', 'error');
        } else {
            toast('Erro ao cadastrar: ' + result.error.message, 'error');
        }
        console.error('Erro cadastro:', result.error);
        if (btn) {
            btn.innerText = texto;
            btn.disabled = false;
        }
        return;
    }
    
    if (result.data && result.data.user) {
        toast('Conta criada com sucesso!', 'success');
        setTimeout(async function() {
            var loginResult = await supabaseClient.auth.signInWithPassword({ 
                email: email, 
                password: senha 
            });
            if (loginResult.data && loginResult.data.user) {
                localStorage.setItem('kayla_lembrar_me', 'true');
                localStorage.setItem('kayla_email', email);
                await loginSucesso(loginResult.data.user);
                try {
                    await supabaseClient.functions.invoke('send-reset-email', {
                        body: { 
                            email: email, 
                            tipo: 'welcome'
                        }
                    });
                } catch (emailError) {
                    console.warn('Erro ao enviar e-mail de boas-vindas:', emailError);
                }
            } else {
                toast('Conta criada! Faça login para entrar.', 'success');
                fecharModal();
                abrirLogin();
            }
        }, 500);
    } else {
        toast('Conta criada! Verifique seu e-mail para confirmar.', 'success');
        fecharModal();
        abrirLogin();
    }
} catch (error) {
    toast('Erro de conexão: ' + error.message, 'error');
    console.error('Erro:', error);
}

if (btn) {
    btn.innerText = texto;
    btn.disabled = false;
}
}

console.log('✅ Register.js carregado (Com Campo Nome e E-mail de Boas-Vindas)');
