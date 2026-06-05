// ============ CADASTRO DE USUÁRIOS ============

function abrirCadastro(tipo) {
    perfilAtual = tipo;
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">' + (tipo === 'admin' ? '👑 Cadastrar Admin' : '👤 Cadastrar Usuário') + '</div>';
    html += '<div class="modal-sub">Crie sua conta para acessar o sistema</div>';
    html += '<div class="form-group"><label class="form-label">E-mail *</label><input class="form-input" id="reg-email" type="email" placeholder="seu@email.com" onkeypress="if(event.key===\'Enter\')document.getElementById(\'reg-senha\').focus()"></div>';
    html += '<div class="form-group"><label class="form-label">Senha *</label><input class="form-input" id="reg-senha" type="password" placeholder="Mínimo 6 caracteres" onkeypress="if(event.key===\'Enter\')document.getElementById(\'reg-senha2\').focus()"></div>';
    html += '<div class="form-group"><label class="form-label">Confirmar Senha *</label><input class="form-input" id="reg-senha2" type="password" placeholder="Repita a senha" onkeypress="if(event.key===\'Enter\')fazerCadastro()"></div>';
    html += '<button class="btn btn-primary" onclick="fazerCadastro()">✅ Criar Conta</button>';
    html += '<button class="btn btn-outline" onclick="fecharModal()">Voltar para Login</button>';
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
    setTimeout(function() { document.getElementById('reg-email').focus(); }, 100);
}

async function fazerCadastro() {
    var email = document.getElementById('reg-email').value.trim();
    var senha = document.getElementById('reg-senha').value;
    var senha2 = document.getElementById('reg-senha2').value;
    
    if (!email || !senha || !senha2) { 
        toast('Preencha todos os campos', 'error'); 
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
    
    var btn = event.target;
    var texto = btn.innerText;
    btn.innerText = 'Cadastrando...';
    btn.disabled = true;
    
    try {
        var result = await supabaseClient.auth.signUp({ 
            email: email, 
            password: senha 
        });
        
        if (result.error) {
            if (result.error.message.includes('User already registered')) {
                toast('Este e-mail já está cadastrado! Faça login.', 'error');
            } else {
                toast('Erro: ' + result.error.message, 'error');
            }
            btn.innerText = texto;
            btn.disabled = false;
            return;
        }
        
        // Verifica se já está logado (sem confirmação de email)
        if (result.data && result.data.user) {
            toast('Conta criada com sucesso!', 'success');
            setTimeout(async function() {
                // Tenta fazer login automático
                var loginResult = await supabaseClient.auth.signInWithPassword({ 
                    email: email, 
                    password: senha 
                });
                
                if (loginResult.data && loginResult.data.user) {
                    localStorage.setItem('kayla_lembrar_me', 'true');
                    localStorage.setItem('kayla_email', email);
                    await loginSucesso(loginResult.data.user);
                } else {
                    toast('Conta criada! Faça login para entrar.', 'success');
                    fecharModal();
                    abrirLogin(perfilAtual);
                }
            }, 500);
        } else {
            toast('Conta criada! Verifique seu e-mail para confirmar.', 'success');
            fecharModal();
            abrirLogin(perfilAtual);
        }
        
    } catch (error) {
        toast('Erro de conexão: ' + error.message, 'error');
        console.error(error);
    }
    
    btn.innerText = texto;
    btn.disabled = false;
}

console.log('✅ Register.js carregado');
