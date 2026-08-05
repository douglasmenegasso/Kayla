// ============ SCANNER ENGINE (Kayla - iOS corrigido) ============
let _stream=null,_reader=null,_scanRAF=null,_bd=null;
let _active=false,_lastScan=0,_lastCode='';

function _hasBD(){ return typeof BarcodeDetector!=='undefined'; }

function beep(){ try{ const c=new (window.AudioContext||window.webkitAudioContext)(); const o=c.createOscillator(); const g=c.createGain(); o.connect(g);g.connect(c.destination); o.frequency.value=1800;o.type='square'; g.gain.setValueAtTime(0.3,c.currentTime); g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.12); o.start(c.currentTime); o.stop(c.currentTime+0.12);}catch(e){} }

function _carregarZXing(){
  if(typeof ZXing!=='undefined') return Promise.resolve(true);
  return new Promise(function(res){
    var s=document.createElement('script');
    s.src='https://unpkg.com/@zxing/browser@0.1.5/umd/zxing-browser.min.js';
    s.onload=function(){ res(typeof ZXing!=='undefined'); };
    s.onerror=function(){ res(false); };
    document.head.appendChild(s);
    setTimeout(function(){ res(typeof ZXing!=='undefined'); }, 8000);
  });
}

async function _getStream(){
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){ var e=new Error('Sem mediaDevices'); e.name='NoMediaDevices'; throw e; }
  var cons={ video:{ facingMode:{ideal:'environment'}, width:{ideal:1280,max:1920}, height:{ideal:720,max:1080} } };
  try{ return await navigator.mediaDevices.getUserMedia(cons); }
  catch(e){
    try{ return await navigator.mediaDevices.getUserMedia({video:{facingMode:{exact:'environment'}}}); }
    catch(e2){ return await navigator.mediaDevices.getUserMedia({video:true}); }
  }
}

async function _playVideo(video,stream){
  video.srcObject=stream;
  video.setAttribute('playsinline','');
  video.setAttribute('webkit-playsinline','');
  video.muted=true;
  await new Promise(function(res,rej){
    var t=setTimeout(function(){rej(new Error('timeout'));},10000);
    var go=function(){clearTimeout(t);video.play().then(res).catch(rej);};
    video.readyState>=3?go():video.addEventListener('canplay',go,{once:true});
  });
}

function _makeZXing(){
  if(typeof ZXing==='undefined') return null;
  var h=new Map();
  h.set(ZXing.DecodeHintType.POSSIBLE_FORMATS,[ZXing.BarcodeFormat.EAN_13,ZXing.BarcodeFormat.EAN_8,ZXing.BarcodeFormat.CODE_128,ZXing.BarcodeFormat.QR_CODE,ZXing.BarcodeFormat.UPC_A,ZXing.BarcodeFormat.UPC_E,ZXing.BarcodeFormat.CODE_39,ZXing.BarcodeFormat.ITF]);
  h.set(ZXing.DecodeHintType.TRY_HARDER,true);
  return new ZXing.BrowserMultiFormatReader(h,{delayBetweenScanAttempts:80,delayBetweenScanSuccess:1500});
}

async function _bdLoop(video,onCode){
  _bd=new BarcodeDetector({formats:['ean_13','ean_8','code_128','qr_code','upc_a','upc_e','code_39','itf']});
  var last='',lastT=0,fc=0;
  async function tick(){
    if(!_active)return; fc++;
    if(fc%3!==0){_scanRAF=requestAnimationFrame(tick);return;}
    try{
      if(video.readyState>=2){
        var r=await _bd.detect(video);
        if(r&&r.length>0){
          var code=r[0].rawValue;var now=Date.now();
          if(code!==last||now-lastT>2500){last=code;lastT=now;onCode(code);}
        }
      }
    }catch(e){}
    if(_active)_scanRAF=requestAnimationFrame(tick);
  }
  _scanRAF=requestAnimationFrame(tick);
}

function pararScannerKayla(){
  _active=false;
  if(_scanRAF){cancelAnimationFrame(_scanRAF);_scanRAF=null;}
  if(_reader){try{_reader.reset();}catch(e){}_reader=null;}
  if(_stream){_stream.getTracks().forEach(function(t){t.stop();});_stream=null;}
  _bd=null;
}

async function iniciarScannerKayla(containerId,onCode){
  var box=document.getElementById(containerId); if(!box)return;
  pararScannerKayla(); _active=true;
  var video=box.querySelector('video');
  if(!video){
    box.innerHTML='';
    video=document.createElement('video');
    video.style.width='100%';video.style.borderRadius='8px';video.style.background='#000';
    video.setAttribute('playsinline','');
    video.setAttribute('webkit-playsinline','');
    video.setAttribute('muted','');
    video.setAttribute('autoplay','');
    video.muted=true;
    box.appendChild(video);
  }
  box.style.display='block';
  var wrap=function(code){
    var now=Date.now();
    if(code===_lastCode&&(now-_lastScan)<3000)return;
    _lastCode=code;_lastScan=now;beep();onCode(code);
  };
  try{
    if(_hasBD()){
      // Android / navegadores com leitor nativo
      _stream=await _getStream();
      await _playVideo(video,_stream);
      await _bdLoop(video,wrap);
    } else {
      // iPhone (Safari): deixa o ZXing abrir E controlar a câmera
      var ok=await _carregarZXing();
      if(!ok) throw new Error('ZXing not loaded');
      _reader=_makeZXing();
      if(!_reader) throw new Error('ZXing not loaded');
      if(typeof _reader.decodeFromConstraints==='function'){
        await _reader.decodeFromConstraints({video:{facingMode:'environment'}}, video, function(r){ if(!r||!_active)return; wrap(r.getText()); });
      } else {
        _stream=await _getStream();
        await _playVideo(video,_stream);
        _reader.decodeFromStream(_stream,video,function(r){ if(!r||!_active)return; wrap(r.getText()); });
      }
    }
  }catch(err){
    _active=false;
    pararScannerKayla();
    var msg='📷 Câmera indisponível. Digite o código manualmente.';
    if(err){
      if(err.name==='NotAllowedError'||err.name==='SecurityError') msg='🔒 Câmera negada. No iPhone: Ajustes → Safari → Câmera → Permitir.';
      else if(err.name==='NoMediaDevices') msg='📱 Abra o app pelo SAFARI (não pelo ícone) para usar a câmera.';
    }
    box.innerHTML='<p style="color:var(--text3);text-align:center;padding:12px">'+msg+'</p>';
    if(typeof toast==='function') toast(msg,'warning');
    console.error('[Scanner]',err);
  }
}
window.iniciarScannerKayla=iniciarScannerKayla;
window.pararScannerKayla=pararScannerKayla;
