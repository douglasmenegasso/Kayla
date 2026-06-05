// ============ UTILITÁRIOS ============

// Toast notifications
function toast(mensagem, tipo) {
  var container = document.getElementById('toast-container');
  var div = document.createElement('div');
  div.className = 'toast toast-' + (tipo || 'success');
  div.textContent = mensagem;
  container.appendChild(div);
  setTimeout(function() { div.remove(); }, 3000);
}

// Custom Confirm Modal (substitui window.confirm)
function confirmar(titulo, mensagem, callback, icone) {
  var overlay = document.getElementById('confirm-overlay');
  document.getElementById('confirm-icon').textContent = icone || '✅';
  document.getElementById('confirm-title').textContent = titulo || 'Confirmação';
  document.getElementById('confirm-message').textContent = mensagem || 'Deseja continuar?';
  overlay.classList.add('show');
  
  var okBtn = document.getElementById('confirm-ok');
  var cancelBtn = document.getElementById('confirm-cancel');
  
  // Remove listeners anteriores clonando
  var newOk = okBtn.cloneNode(true);
  var newCancel = cancelBtn.cloneNode(true);
  okBtn.parentNode.replaceChild(newOk, okBtn);
  cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
  
  newOk.addEventListener('click', function() {
    overlay.classList.remove('show');
    if (callback) callback(true);
  });
  
  newCancel.addEventListener('click', function() {
    overlay.classList.remove('show');
    if (callback) callback(false);
  });
}

// Modal functions
function fecharModal() {
  document.getElementById('modal-overlay').classList.remove('show');
}

function mostrarApp() {
  document.getElementById('selection-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('bottom-nav').style.display = 'flex';
  atualizarBadges();
  mudarAba('scan');
}

function mostrarTelaSelecao() {
  document.getElementById('app').classList.add('hidden');
  document.getElementById('bottom-nav').style.display = 'none';
  document.getElementById('selection-screen').classList.remove('hidden');
}

// Badges
function atualizarBadges() {
  var plano = document.getElementById('badge-plano');
  var conexao = document.getElementById('badge-conexao');
  
  if (plano) {
    if (LIMITES && LIMITES.proAtivo) {
      plano.textContent = 'PRO';
      plano.className = 'badge badge-pro';
    } else {
      plano.textContent = 'GRÁTIS';
      plano.className = 'badge badge-free';
    }
  }
  
  if (conexao) {
    if (isOnline !== false) {
      conexao.textContent = 'ONLINE';
      conexao.className = 'badge badge-online';
    } else {
      conexao.textContent = 'OFFLINE';
      conexao.className = 'badge badge-offline';
    }
  }
}

function atualizarBadgeConexao() {
  atualizarBadges();
}

// Conexão
function verificarConexao() {
  isOnline = navigator.onLine;
  atualizarBadges();
}

// LocalStorage
function salvarDadosLocais() {
  try {
    localStorage.setItem('kayla_clientes', JSON.stringify(clientes || []));
    localStorage.setItem('kayla_produtos', JSON.stringify(produtos || []));
    localStorage.setItem('kayla_pedidos', JSON.stringify(pedidos || []));
  } catch(e) { console.error('Erro ao salvar:', e); }
}

function carregarDadosLocais() {
  try {
    var c = localStorage.getItem('kayla_clientes');
    var p = localStorage.getItem('kayla_produtos');
    var pe = localStorage.getItem('kayla_pedidos');
    if (c) clientes = JSON.parse(c);
    if (p) produtos = JSON.parse(p);
    if (pe) pedidos = JSON.parse(pe);
  } catch(e) { console.error('Erro ao carregar:', e); }
}

// Formatar moeda
function formatarMoeda(valor) {
  return 'R$ ' + (valor || 0).toFixed(2).replace('.', ',');
}

// Formatar data
function formatarData(data) {
  if (!data) return '';
  var d = new Date(data);
  return d.toLocaleDateString('pt-BR');
}

// Gerar ID
function gerarId() {
  return Math.random().toString(36).substr(2, 9);
}

// Back button
function onBackButton(e) {
  var modal = document.getElementById('modal-overlay');
  var confirm = document.getElementById('confirm-overlay');
  if (confirm.classList.contains('show')) {
    confirm.classList.remove('show');
  } else if (modal.classList.contains('show')) {
    fecharModal();
  }
}

console.log('✅ Utils.js carregado');
