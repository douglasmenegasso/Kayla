// ============ PAGAMENTOS E ATIVAÇÃO ============

async function validarKeyBackend(keyCode) {
    try {
        var response = await fetch(SUPABASE_EDGE_URL + '/validate-key', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + SUPABASE_KEY
            },
            body: JSON.stringify({
                key_code: keyCode,
                device_id: getDeviceId(),
                device_name: getDeviceName()
            })
        });
        
        var data = await response.json();
        return data;
    } catch (error) {
        console.error('Erro ao validar key:', error);
        return { valid: false, message: 'Erro de conexão' };
    }
}

async function ativarPro() {
    var chave = document.getElementById('pro-key').value.trim().toUpperCase();
    if (!chave || !chave.startsWith('PRO-')) { 
        toast('Chave inválida', 'error'); 
        return; 
    }
    
    var btn = window.event ? window.event.target : null;
    var texto = btn.innerText;
    btn.innerText = 'Validando...';
    btn.disabled = true;
    
    var resultado = await validarKeyBackend(chave);
    
    if (resultado.valid) {
        LIMITES.proAtivo = true;
        localStorage.setItem('kayla_pro', 'true');
        localStorage.setItem('kayla_pro_key', chave);
        localStorage.setItem('kayla_pro_expires', resultado.expires_at || '');
        localStorage.setItem('kayla_pro_devices', resultado.devices_used + '/' + resultado.max_devices);
        
        toast('✅ Plano PRO ativado! ' + resultado.devices_used + '/' + resultado.max_devices + ' dispositivos', 'success');
        fecharModal();
        atualizarBadgePlano();
        mudarAba('settings');
    } else {
        toast('❌ ' + resultado.message, 'error');
    }
    
    btn.innerText = texto;
    btn.disabled = false;
}

function mostrarPlanos() {
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">🚀 Escolha seu Plano</div>';
    html += '<div class="modal-sub">Selecione o plano ideal para você</div>';
    
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">';
    html += '<div class="card" style="background:var(--bg3);padding:16px;cursor:pointer;border:2px solid var(--accent)" onclick="selecionarPlano(\'Mensal\', 19.90)">';
    html += '<div style="font-size:24px;font-weight:700;color:var(--accent)">R$ 19,90</div>';
    html += '<div style="font-size:13px;color:var(--text2)">Mensal<br>1 Dispositivo</div></div>';
    
    html += '<div class="card" style="background:var(--bg3);padding:16px;cursor:pointer;border:2px solid transparent" onclick="selecionarPlano(\'Trimestral\', 49.90)">';
    html += '<div style="font-size:24px;font-weight:700;color:var(--accent)">R$ 49,90</div>';
    html += '<div style="font-size:13px;color:var(--text2)">Trimestral<br>1 Dispositivo</div></div>';
    
    html += '<div class="card" style="background:var(--bg3);padding:16px;cursor:pointer;border:2px solid transparent" onclick="selecionarPlano(\'Semestral\', 89.90)">';
    html += '<div style="font-size:24px;font-weight:700;color:var(--accent)">R$ 89,90</div>';
    html += '<div style="font-size:13px;color:var(--text2)">Semestral<br>1 Dispositivo</div></div>';
    
    html += '<div class="card" style="background:var(--bg3);padding:16px;cursor:pointer;border:2px solid transparent" onclick="selecionarPlano(\'Anual\', 159.90)">';
    html += '<div style="font-size:24px;font-weight:700;color:var(--accent)">R$ 159,90</div>';
    html += '<div style="font-size:13px;color:var(--text2)">Anual<br>1 Dispositivo</div></div>';
    html += '</div>';
    
    html += '<button class="btn btn-outline" onclick="fecharModal()">Cancelar</button>';
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
}

function selecionarPlano(plano, valor) {
    toast('Em breve: Integração com Asaas para ' + plano + ' (R$ ' + valor.toFixed(2).replace('.', ',') + ')', 'warning');
    fecharModal();
}

console.log('✅ Payments.js carregado');
