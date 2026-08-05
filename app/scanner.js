// ============ SCANNER ENGINE (Kayla) ============
let _stream=null,_scanRAF=null,_bd=null,_html5=null;
let _active=false,_lastScan=0,_lastCode='';

function _hasBD(){ return typeof BarcodeDetector!=='undefined'; }

function beep(){ try{ const c=new (window.AudioContext||window.webkitAudioContext)(); const o=c.createOscillator(); const g=c.createGain(); o.connect(g);g.connect(c.destination); o.frequency.value=1800;o.type='square'; g.gain.setValueAtTime(0.3,c.currentTime); g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.12); o.start(c.currentTime); o.stop(c.currentTime+0.12);}catch(e){} }

async function _getStream(){
  const cons={ video:{ facingMode:{ideal:'environment'}, width:{ideal:1280,max:1920}, height:{ideal:720,max:1080} } };
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
  await new Promise((res,rej)=>{
    const t=setTimeout(()=>rej(new Error('timeout')),10000);
    const go=()=>{clearTimeout(t);video.play().then(res).catch(rej);};
    video.readyState>=3?go():video.addEventListener('canplay',go,{once:true});
  });
}

async function _bdLoop(video,onCode){
  _bd=new BarcodeDetector({formats:['ean_13','ean_8','code_128','qr_code','upc_a','upc_e','code_39','itf']});
  let last='',lastT=0,fc=0;
  async function tick(){
    if(!_active)return; fc++;
    if(fc%3!==0){_scanRAF=requestAnimationFrame(tick);return;}
    try{
      if(video.readyState>=2){
        const r=await _bd.detect(video);
        if(r&&r.length>0){
          const code=r[0].rawValue;const now=Date.now();
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
  if(_html5){try{_html5.stop();}catch(e){}_html5=null;}
  if(_stream){_stream.getTracks().forEach(t=>t.stop());_stream=null;}
  _bd=null;
}

async function iniciarScannerKayla(containerId,onCode){
  const box=document.getElementById(containerId); if(!box)return;
  pararScannerKayla(); _active=true;
  box.style.display='block';
  const wrap=(code)=>{
    const now=Date.now();
    if(code===_lastCode&&(now-_lastScan)<3000)return;
    _lastCode=code;_lastScan=now;beep();onCode(code);
  };

  // 1) Leitor nativo (Android/Chrome)
  if(_hasBD()){
    try{
      let video=box.querySelector('video');
      if(!video){ box.innerHTML=''; video=document.createElement('video'); video.style.width='100%';video.style.borderRadius='8px';video.style.background='#000'; box.appendChild(video); }
      _stream=await _getStream();
      await _playVideo(video,_stream);
      await _bdLoop(video,wrap);
      return;
    }catch(e){ console.warn('[Scanner] nativo falhou:',e); pararScannerKayla(); _active=true; }
  }

  // 2) html5-qrcode (iPhone/Safari) — já carregado no index.html
  if(typeof Html5Qrcode!=='undefined'){
    try{
      box.innerHTML='';
      _html5=new Html5Qrcode(containerId);
      await _html5.start({facingMode:'environment'},{fps:10,qrbox:{width:250,height:150}},function(txt){wrap(txt);},function(){});
      return;
    }catch(e){ console.warn('[Scanner] html5 falhou:',e); pararScannerKayla(); _active=true; }
  }

  // 3) nada funcionou
  _active=false;
  box.innerHTML='<p style="color:var(--text3);text-align:center;padding:12px">📷 Câmera indisponível. Digite o código manualmente.</p>';
}
window.iniciarScannerKayla=iniciarScannerKayla;
window.pararScannerKayla=pararScannerKayla;
