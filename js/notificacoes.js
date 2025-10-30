// petshop-site/js/notificacoes.js
// Notificações via Toastify com fallback para alert() caso biblioteca não esteja disponível.

// Exibe notificação de sucesso (verde)
export function mostrarSucesso(mensagem, opts = {}) {
  try {
    if (typeof Toastify === 'function') {
      Toastify({
        text: String(mensagem || ''),
        duration: opts.duration ?? 3000,
        close: opts.close ?? true,
        gravity: opts.gravity ?? 'top',
        position: opts.position ?? 'right',
        stopOnFocus: opts.stopOnFocus ?? true,
        onClick: opts.onClick, // opcional
        style: Object.assign({
          background: 'linear-gradient(to right, #00b09b, #96c93d)',
          color: '#fff'
        }, opts.style || {})
      }).showToast();
      return;
    }
  } catch (err) {
    console.warn('Toastify unavailable or errored in mostrarSucesso:', err);
  }
  // Fallback simples
  try { alert(mensagem); } catch { /* nada */ }
}

// Exibe notificação de erro (vermelho)
export function mostrarErro(mensagem, opts = {}) {
  try {
    if (typeof Toastify === 'function') {
      Toastify({
        text: String(mensagem || ''),
        duration: opts.duration ?? 5000,
        close: opts.close ?? true,
        gravity: opts.gravity ?? 'top',
        position: opts.position ?? 'right',
        stopOnFocus: opts.stopOnFocus ?? true,
        onClick: opts.onClick,
        style: Object.assign({
          background: 'linear-gradient(to right, #ff5f6d, #ffc371)',
          color: '#222'
        }, opts.style || {})
      }).showToast();
      return;
    }
  } catch (err) {
    console.warn('Toastify unavailable or errored in mostrarErro:', err);
  }
  // Fallback simples
  try { alert(mensagem); } catch { /* nada */ }
}