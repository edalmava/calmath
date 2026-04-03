import { getState } from '../state.js';
import { reiniciar } from '../steps.js';

/**
 * Escapa caracteres especiales HTML para prevenir XSS.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Muestra una vista y oculta las demás.
 * @param {'app'|'historial'|'resumen'} v
 */
export function showView(v) {
  document.getElementById('viewApp').classList.toggle('hidden', v !== 'app');
  document.getElementById('viewHistorial').classList.toggle('hidden', v !== 'historial');
  document.getElementById('viewResumen').classList.toggle('hidden', v !== 'resumen');
  document.getElementById('stepIndicator').classList.toggle('hidden', v !== 'app');
  document.getElementById('navNueva').classList.toggle('active-nav', v === 'app');
  document.getElementById('navHist').classList.toggle('active-nav', v === 'historial' || v === 'resumen');

  if (v === 'historial') {
    window.renderHistorial();
  } else if (v === 'app') {
    const { numP, yaGuardada } = getState();
    const hayEvaluacionActiva = numP && !yaGuardada;
    if (!hayEvaluacionActiva) reiniciar();
  }
}

/**
 * Muestra una notificación temporal (toast).
 * @param {string} msg
 * @param {boolean} isError
 */
export function toast(msg, isError = false) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = document.createElement('div');
  t.className = 'toast';
  if (isError) {
    t.style.borderColor = 'var(--red)';
    t.style.color = 'var(--red)';
  }
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}
