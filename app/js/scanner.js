// ============ SCANNER ENGINE (Kayla) + PAINEL DE DEBUG ============
let _stream=null,_reader=null,_scanRAF=null,_bd=null;
let _active=false,_lastScan=0,_lastCode='';

// ---------- MINI PAINEL DE DEBUG ----------
var _debugLogs=[];
function debugLog(msg){
  try{
    var line='['+new Date().toLocaleTimeString()+'] '+msg;
    _debugLogs.push(line);
    if(_debugLogs.length>80)_debugLogs.shift();
    var el=document.getElementById('debug-panel-content');
    if(el) el.textContent=_debugLogs.join('\n');
  }catch(e){}
  console.log('[Scanner] '+msg);
}
window.debugLog=debugLog;

function _criarPainelDebug(){
  if(document.getElementById('debug-fab'))return;
  var fab=document.createElement('button');
  fab.id='debug-fab';
  fab.textContent='🐞';
  fab.style.cssText='position:fixed;bottom:95px;left:10px;z-index:99998;width:46px;height:46px;border-radius:50%;background:#252530;color:#fff;border:1px solid #7c5cfc;font-size:20px;cursor:pointer;opacity:.9';
  fab.onclick=function(){
    var p=document.getElementById('debug-panel');
    if(p)p.style.display=(p.style.display==='none')?'block':'none';
  };
  document.body.appendChild(fab);

  var panel=document.createElement('div');
  panel.id='debug-panel';
  panel.style.cssText='display:none;position:fixed;bottom:150px;left:10px;right:10px;z-index:99997;background:rgba(15,15,19,.97);border:1px solid #7c5cfc;border-radius:10px;padding:10px';
  panel.innerHTML=
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'+
    '<strong style="color:#9b82fc;font-size:12px">🐞 Debug do Scanner</strong>'+
    '<span>'+
    '<button id="debug-copy" style="background:#252530;color:#fff;border:1px solid #2a2a35;border-radius:6px;font-size:10px;padding:4px 8px;margin-right:4px">Copiar</button>'+
    '<button id="debug-clear" style="background:#252530;color:#fff;border:1px solid #2a2a35;border-radius:6px;font-size:10px;padding:4px 8px;margin-right:4px">Limpar</button>'+
    '<button id="debug-close" style="background:#252530;color:#fff;border:1px solid #2a2a35;border-radius:6px;font-size:10px;padding:4px 8px">✕</button>'+
    '</span></div>'+
    '<pre id="debug-panel-content" style="color:#00c853;font-size:10px;line-height:1.4;max-height:36vh;overflow-y:auto;white-space:pre-wrap;word-break:break-word;margin:0"></pre>';
  document.body.appendChild(panel);

  document.getElementById('debug-close').onclick=function(){panel.style.display='none';};
  document.getElementById('debug-clear').onclick=function(){_debugLogs=[];document.getElementById('debug-panel-content').textContent='';};
  document.getElementById('debug-copy').onclick=function(){
    var txt=_debugLogs.join('\n');
    function done(){debugLog('Logs copiados! Cole no chat.');}
    try{
      if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(done);}
      else{var ta=document.createElement('textarea');ta.value=txt;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);done();}
    }catch(e){debugLog('Falha ao copiar: '+e.message);}
  };
  debugLog('Painel de debug pronto');
}
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',_criarPainelDebug);}else{_criarPainelDebug();}

// ---------- MOTOR ----------
function _hasBD(){ var h=(typeof BarcodeDetector!=='undefined'); debugLog('BarcodeDetector disponivel: '+h); return h; }

function beep(){ try{ var c=new (window.AudioContext||window.webkitAudioContext)(); var o=c.createOscillator(); var g=c.createGain(); o.connect(g);g.connect(c.destination); o.frequency.value=1800;o.type='square'; g.gain.setValueAtTime(0.3,c.currentTime); g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.12); o.start(c.currentTime); o.stop(c.currentTime+0.12);}catch(e){} }

async function _getStream(){
  debugLog('Solicitando camera...');
  var cons={video:{facingMode:{ideal:'environment'},width:{ideal:1280,max:1920},height:{ideal:720,max:1080}}};
  try{ var s=await navigator.mediaDevices.getUserMedia(cons); debugLog('Camera OK (1280x720)'); return s; }
  catch(e1){
    debugLog('Falhou 1280x720: '+e1.name+' / '+e1.message);
    try{ var s2=await navigator.mediaDevices.getUserMedia({video:{facingMode:{exact:'environment'}}}); debugLog('Camera OK (facing exato)'); return s2; }
    catch(e2){
      debugLog('Falhou facing exato: '+e2.name);
      var s3=await navigator.mediaDevices.getUserMedia({video:true});
      debugLog('Camera OK (generica)');
      return s3;
    }
  }
}

async function _playVideo(video,stream){
  debugLog('Iniciando video...');
  video.srcObject=stream;
  video.setAttribute('playsinline','');
  video.setAttribute('webkit-playsinline','');
  video.muted=true;
  await new Promise(function(res,rej){
    var t=setTimeout(function(){rej(new Error('timeout video'));},10000);
    var go=function(){clearTimeout(t);video.play().then(function(){debugLog('Video rodando');res();}).catch(rej);};
    video.readyState>=3?go():video.addEventListener('canplay',go,{once:true});
  });
}

function _makeZXing(){
  debugLog('Criando leitor ZXing...');
  if(typeof ZXing==='undefined'){debugLog('ERRO: ZXing nao carregou (verifique index.html)');return null;}
  var h=new Map();
  h.set(ZXing.DecodeHintType.POSSIBLE_FORMATS,[ZXing.BarcodeFormat.EAN_13,ZXing.BarcodeFormat.EAN_8,ZXing.BarcodeFormat.CODE_128,ZXing.BarcodeFormat.QR_CODE,ZXing.BarcodeFormat.UPC_A,ZXing.BarcodeFormat.UPC_E,ZXing.BarcodeFormat.CODE_39,ZXing.BarcodeFormat.ITF]);
  h.set(ZXing.DecodeHintType.TRY_HARDER,true);
  debugLog('ZXing OK');
  return new ZXing.BrowserMultiFormatReader(h,{delayBetweenScanAttempts:80,delayBetweenScanSuccess:1500});
}

async function _bdLoop(video,onCode){
  debugLog('Loop BarcodeDetector iniciado');
  _bd=new BarcodeDetector({formats:['ean_13','ean_8','code_128','qr_code','upc_a','upc_e','code_39','itf']});
  var last='',lastT=0,fc=0;
  async function tick(){
    if(!_active)return;
    fc++;
    if(fc%3!==0){_scanRAF=requestAnimationFrame(tick);return;}
    try{
      if(video.readyState>=2){
        var r=await _bd.detect(video);
        if(r&&r.length>0){
          var code=r[0].rawValue;var now=Date.now();
          if(code!==last||now-lastT>2500){last=code;lastT=now;debugLog('LIDO (BD): '+code);onCode(code);}
        }
      }
    }catch(e){}
    if(_active)_scanRAF=requestAnimationFrame(tick);
  }
  _scanRAF=requestAnimationFrame(tick);
}

function pararScannerKayla(){
  debugLog('Parando scanner');
  _active=false;
  if(_scanRAF){cancelAnimationFrame(_scanRAF);_scanRAF=null;}
  if(_reader){try{_reader.reset();}catch(e){}_reader=null;}
  if(_stream){_stream.getTracks().forEach(function(t){t.stop();});_stream=null;}
  _bd=null;
}

async function iniciarScannerKayla(containerId,onCode){
  debugLog('iniciarScannerKayla -> '+containerId);
  var box=document.getElementById(containerId);
  if(!box){debugLog('ERRO: container nao encontrado: '+containerId);return;}
  pararScannerKayla();
  _active=true;
  var video=box.querySelector('video');
  if(!video){
    box.innerHTML='';
    video=document.createElement('video');
    video.style.width='100%';video.style.borderRadius='8px';video.style.background='#000';
    box.appendChild(video);
  }
  box.style.display='block';
  try{
    _stream=await _getStream();
    await _playVideo(video,_stream);
    var wrap=function(code){
      var now=Date.now();
      if(code===_lastCode&&(now-_lastScan)<3000)return;
      _lastCode=code;_lastScan=now;beep();onCode(code);
    };
    if(_hasBD()){ await _bdLoop(video,wrap); }
    else{
      _reader=_makeZXing();
      if(!_reader)throw new Error('ZXing indisponivel');
      debugLog('ZXing decodeFromStream iniciado');
      _reader.decodeFromStream(_stream,video,function(result){
        if(!result||!_active)return;
        var code=result.getText();
        debugLog('LIDO (ZXing): '+code);
        wrap(code);
      });
    }
  }catch(err){
    _active=false;
    debugLog('ERRO FINAL: '+err.name+' / '+err.message);
    box.innerHTML='<p style="color:var(--text3);text-align:center;padding:12px">📷 Camera indisponivel. Digite o codigo manualmente.</p>';
  }
}

window.iniciarScannerKayla=iniciarScannerKayla;
window.pararScannerKayla=pararScannerKayla;
console.log('✅ Scanner engine + debug carregado');
