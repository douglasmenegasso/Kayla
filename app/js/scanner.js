// ============ SCANNER ENGINE (Kayla - Android Optimized) ============
let _stream=null,_reader=null,_scanRAF=null,_bd=null;
let _active=false,_lastScan=0,_lastCode='';

function _hasBD(){ 
  var has = typeof BarcodeDetector !== 'undefined';
  console.log('[Scanner] BarcodeDetector disponível:', has);
  return has;
}

function beep(){ 
  try{ 
    const c=new (window.AudioContext||window.webkitAudioContext)(); 
    const o=c.createOscillator(); 
    const g=c.createGain(); 
    o.connect(g);
    g.connect(c.destination); 
    o.frequency.value=1800;
    o.type='square'; 
    g.gain.setValueAtTime(0.3,c.currentTime); 
    g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.12); 
    o.start(c.currentTime); 
    o.stop(c.currentTime+0.12);
  }catch(e){
    console.warn('[Scanner] Beep falhou:', e);
  } 
}

async function _getStream(){
  console.log('[Scanner] Solicitando câmera...');
  
  // Tenta primeiro com constraints ideais (alta resolução)
  const cons1 = { 
    video: { 
      facingMode: {ideal:'environment'}, 
      width: {ideal:1280,max:1920}, 
      height: {ideal:720,max:1080} 
    } 
  };
  
  try {
    console.log('[Scanner] Tentando constraints ideais (1280x720)...');
    return await navigator.mediaDevices.getUserMedia(cons1);
  } catch(e1) {
    console.warn('[Scanner] Constraints ideais falhou:', e1.message);
    
    // Tenta com facingMode exato
    const cons2 = {
      video: { facingMode: {exact:'environment'} }
    };
    try {
      console.log('[Scanner] Tentando facingMode exato...');
      return await navigator.mediaDevices.getUserMedia(cons2);
    } catch(e2) {
      console.warn('[Scanner] FacingMode exato falhou:', e2.message);
      
      // Último recurso: câmera genérica
      console.log('[Scanner] Tentando câmera genérica...');
      return await navigator.mediaDevices.getUserMedia({video:true});
    }
  }
}

async function _playVideo(video,stream){
  console.log('[Scanner] Iniciando vídeo...');
  video.srcObject=stream; 
  video.setAttribute('playsinline',''); 
  video.setAttribute('webkit-playsinline',''); 
  video.muted=true;
  
  await new Promise((res,rej)=>{ 
    const t=setTimeout(()=>rej(new Error('timeout')),10000); 
    const go=()=>{
      clearTimeout(t);
      video.play()
        .then(()=>{
          console.log('[Scanner] Vídeo iniciou com sucesso');
          res();
        })
        .catch(rej);
    }; 
    video.readyState>=3?go():video.addEventListener('canplay',go,{once:true}); 
  });
}

function _makeZXing(){
  console.log('[Scanner] Criando leitor ZXing...');
  
  if(typeof ZXing === 'undefined') {
    console.error('[Scanner] ZXing não está carregado! Verifique se o script foi incluído no index.html');
    return null;
  }
  
  console.log('[Scanner] ZXing carregado, configurando...');
  
  const h = new Map();
  h.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
    ZXing.BarcodeFormat.EAN_13,
    ZXing.BarcodeFormat.EAN_8,
    ZXing.BarcodeFormat.CODE_128,
    ZXing.BarcodeFormat.QR_CODE,
    ZXing.BarcodeFormat.UPC_A,
    ZXing.BarcodeFormat.UPC_E,
    ZXing.BarcodeFormat.CODE_39,
    ZXing.BarcodeFormat.ITF
  ]);
  h.set(ZXing.DecodeHintType.TRY_HARDER, true);
  
  const reader = new ZXing.BrowserMultiFormatReader(h, {
    delayBetweenScanAttempts: 80,
    delayBetweenScanSuccess: 1500
  });
  
  console.log('[Scanner] ZXing configurado com sucesso');
  return reader;
}

async function _bdLoop(video,onCode){
  console.log('[Scanner] Iniciando loop BarcodeDetector...');
  _bd = new BarcodeDetector({
    formats: ['ean_13','ean_8','code_128','qr_code','upc_a','upc_e','code_39','itf']
  });
  
  let last='', lastT=0, fc=0;
  
  async function tick(){ 
    if(!_active) return; 
    fc++; 
    
    // Processa a cada 3 frames (performance)
    if(fc%3 !== 0){
      _scanRAF = requestAnimationFrame(tick); 
      return;
    } 
    
    try{ 
      if(video.readyState >= 2){ 
        const r = await _bd.detect(video); 
        if(r && r.length > 0){ 
          const code = r[0].rawValue; 
          const now = Date.now(); 
          if(code !== last || now - lastT > 2500){
            last = code; 
            lastT = now; 
            console.log('[Scanner] Código detectado (BD):', code);
            onCode(code);
          } 
        } 
      } 
    }catch(e){
      console.warn('[Scanner] Erro no loop BD:', e);
    } 
    
    if(_active) _scanRAF = requestAnimationFrame(tick); 
  }
  
  _scanRAF = requestAnimationFrame(tick);
}

function pararScannerKayla(){
  console.log('[Scanner] Parando scanner...');
  _active = false;
  
  if(_scanRAF){
    cancelAnimationFrame(_scanRAF);
    _scanRAF = null;
  }
  
  if(_reader){
    try{
      _reader.reset();
    }catch(e){
      console.warn('[Scanner] Erro ao resetar ZXing:', e);
    }
    _reader = null;
  }
  
  if(_stream){
    _stream.getTracks().forEach(t => t.stop());
    _stream = null;
  }
  
  _bd = null;
  console.log('[Scanner] Scanner parado');
}

async function iniciarScannerKayla(containerId, onCode){
  console.log('[Scanner] Iniciando scanner no container:', containerId);
  
  const box = document.getElementById(containerId); 
  if(!box){
    console.error('[Scanner] Container não encontrado:', containerId);
    return;
  }
  
  pararScannerKayla(); 
  _active = true;
  
  // Cria elemento de vídeo se não existir
  let video = box.querySelector('video');
  if(!video){ 
    box.innerHTML=''; 
    video = document.createElement('video'); 
    video.style.width = '100%'; 
    video.style.borderRadius = '8px'; 
    video.style.background = '#000'; 
    box.appendChild(video); 
  }
  
  box.style.display = 'block';
  
  try{
    _stream = await _getStream(); 
    await _playVideo(video, _stream);
    
    const wrap = (code) => { 
      const now = Date.now(); 
      if(code === _lastCode && (now - _lastScan) < 3000) return; 
      _lastCode = code;
      _lastScan = now; 
      beep(); 
      onCode(code); 
    };
    
    // Tenta BarcodeDetector nativo primeiro
    if(_hasBD()){ 
      console.log('[Scanner] Usando BarcodeDetector nativo');
      await _bdLoop(video, wrap); 
    } else {
      // Fallback para ZXing
      console.log('[Scanner] BarcodeDetector não disponível, usando ZXing');
      _reader = _makeZXing(); 
      
      if(!_reader){
        throw new Error('ZXing não pôde ser inicializado');
      }
      
      console.log('[Scanner] Iniciando decodeFromStream com ZXing...');
      _reader.decodeFromStream(_stream, video, (result) => { 
        if(!result || !_active) return; 
        const code = result.getText();
        console.log('[Scanner] Código detectado (ZXing):', code);
        wrap(code); 
      });
      
      console.log('[Scanner] ZXing decodeFromStream iniciado');
    }
    
  } catch(err){
    _active = false;
    console.error('[Scanner] Erro ao iniciar:', err);
    
    // Mensagem amigável
    const denied = err.name === 'NotAllowedError' || err.name === 'SecurityError';
    let msg = '📷 Câmera indisponível. Digite o código manualmente.';
    
    if(denied){
      msg = '📷 Permissão de câmera negada. Vá nas configurações do navegador e permita o acesso.';
    }
    
    box.innerHTML = '<p style="color:var(--text3);text-align:center;padding:12px">' + msg + '</p>';
    
    toast(msg, 'warning');
  }
}

window.iniciarScannerKayla = iniciarScannerKayla;
window.pararScannerKayla = pararScannerKayla;

console.log('✅ Scanner engine carregado (Android optimized)');
