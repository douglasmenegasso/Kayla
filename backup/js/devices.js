// ============ DISPOSITIVOS ============

function getDeviceId() {
    if (!deviceUniqueId) {
        deviceUniqueId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('kayla_device_id', deviceUniqueId);
    }
    return deviceUniqueId;
}

function getDeviceName() {
    var ua = navigator.userAgent;
    if (ua.indexOf('Android') > -1) return 'Android';
    if (ua.indexOf('iPhone') > -1) return 'iPhone';
    if (ua.indexOf('iPad') > -1) return 'iPad';
    return 'Web';
}

async function removerDispositivo(keyCode, deviceId) {
    try {
        var response = await fetch(SUPABASE_EDGE_URL + '/remove-device', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + SUPABASE_KEY
            },
            body: JSON.stringify({
                key_code: keyCode,
                device_id: deviceId
            })
        });
        
        var data = await response.json();
        return data;
    } catch (error) {
        console.error('Erro ao remover dispositivo:', error);
        return { success: false, message: 'Erro de conexão' };
    }
}

async function gerenciarDispositivos() {
    var key = localStorage.getItem('kayla_pro_key');
    if (!key) {
        toast('Nenhuma key ativa', 'error');
        return;
    }
    
    var devices = localStorage.getItem('kayla_pro_devices') || '0/0';
    
    var html = '<div class="modal-handle"></div>';
    html += '<div class="modal-title">📱 Gerenciar Dispositivos</div>';
    html += '<div class="modal-sub">Dispositivos ativos: ' + devices + '</div>';
    
    html += '<div class="card" style="background:var(--bg3);padding:16px;margin-bottom:16px">';
    html += '<div style="margin-bottom:12px"><strong>Dispositivo atual:</strong></div>';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:var(--bg2);border-radius:8px">';
    html += '<div><div style="font-weight:600">' + getDeviceName() + '</div><div style="font-size:12px;color:var(--text3)">ID: ' + getDeviceId().substr(0, 20) + '...</div></div>';
    html += '<button class="btn btn-sm btn-red" onclick="removerEsteDispositivo()" style="margin:0">Remover</button></div></div>';
    
    html += '<small style="color:var(--text3);display:block;margin-bottom:16px">Ao remover este dispositivo, você poderá ativar em outro.</small>';
    html += '<button class="btn btn-outline" onclick="fecharModal()">Cancelar</button>';
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
}

async function removerEsteDispositivo() {
    var key = localStorage.getItem('kayla_pro_key');
    var deviceId = getDeviceId();
    
    if (!confirm('Remover este dispositivo? Você precisará ativar a key novamente.')) return;
    
    var resultado = await removerDispositivo(key, deviceId);
    
    if (resultado.success) {
        localStorage.removeItem('kayla_pro');
        localStorage.removeItem('kayla_pro_key');
        localStorage.removeItem('kayla_pro_devices');
        LIMITES.proAtivo = false;
        toast('✅ Dispositivo removido!', 'success');
        fecharModal();
        atualizarBadgePlano();
        mudarAba('settings');
    } else {
        toast('❌ ' + resultado.message, 'error');
    }
}

console.log('✅ Devices.js carregado');
