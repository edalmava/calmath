import { getState, setState } from '../state.js';
import { parseSistemaCalif } from '../calification.js';
import { toast } from './ui.js';
import { renderHistorial } from './historial.js';

/**
 * Carga los settings desde IndexedDB y los aplica al estado global.
 */
export async function cargarSettings() {
  try {
    const settings = await window.dbObtenerSettings();
    if (!settings) return;

    const { setSettings } = await import('../state.js');
    setSettings({
      notaMaxima: settings.notaMaxima || 5,
      notaAprobacion: settings.notaAprobacion || 3,
    });
    if (settings.sistemaCalif) {
      setState({ sistemaCalif: settings.sistemaCalif });
    }
  } catch (e) {
    console.error('Error al cargar settings:', e);
  }
}

/**
 * Abre el modal de configuración con los valores actuales desde DB.
 */
export async function abrirModalSettings() {
  let settings = {};
  try {
    settings = await window.dbObtenerSettings() || {};
  } catch (e) {
    console.error('Error al obtener settings:', e);
  }

  const savedNotaAprobacion = settings.notaAprobacion ?? 3;
  const savedSistemaCalif = settings.sistemaCalif || '1a5';
  const { notaMaxima: max } = parseSistemaCalif(savedSistemaCalif);
  const sistemaIni = savedSistemaCalif.startsWith('0') ? '0' : '1';

  const setSistemaIni = document.getElementById('setSistemaIni');
  const setNotaMaxima = document.getElementById('setNotaMaxima');
  const setNotaAprobacion = document.getElementById('setNotaAprobacion');

  if (setSistemaIni) setSistemaIni.value = sistemaIni;
  if (setNotaMaxima) setNotaMaxima.value = max;
  if (setNotaAprobacion) setNotaAprobacion.value = savedNotaAprobacion;

  document.getElementById('modalSettings').classList.remove('hidden');
}

/**
 * Cierra el modal de configuración.
 */
export function cerrarModalSettings() {
  document.getElementById('modalSettings').classList.add('hidden');
}

/**
 * Valida y guarda la configuración desde el modal de settings.
 */
export async function guardarSettings() {
  const sistemaIni = document.getElementById('setSistemaIni').value;
  const notaMaxima = parseInt(document.getElementById('setNotaMaxima').value, 10);
  const notaAprobacion = parseFloat(document.getElementById('setNotaAprobacion').value);
  const sistemaCalif = sistemaIni + 'a' + notaMaxima;

  // Validaciones
  if (!Number.isFinite(notaMaxima) || notaMaxima < 1 || notaMaxima > 10) {
    toast('La nota maxima debe estar entre 1 y 10', true);
    return;
  }
  if (!Number.isFinite(notaAprobacion) || notaAprobacion < 0 || notaAprobacion > notaMaxima) {
    toast('La nota de aprobacion debe ser mayor o igual a 0 y menor o igual a la nota maxima', true);
    return;
  }

  try {
    await window.dbGuardarSettings({ notaMaxima, notaAprobacion, sistemaCalif });

    const { setSettings } = await import('../state.js');
    setSettings({ notaMaxima, notaAprobacion });
    setState({ sistemaCalif });

    // Actualizar UI del paso 1
    const { notaMinima } = parseSistemaCalif(sistemaCalif);
    const { pesoMode } = getState();

    document.getElementById('btnCalif1').classList.toggle('pm-active', sistemaIni === '1');
    document.getElementById('btnCalif0').classList.toggle('pm-active', sistemaIni === '0');

    const maxSelect = document.getElementById('califMaxSelect');
    if (maxSelect) maxSelect.value = String(notaMaxima);

    const pt = notaMaxima - notaMinima;
    const formula = notaMinima === 0
      ? '<strong>Σ(aciertos × peso)</strong>'
      : '<strong>1 + Σ(aciertos × peso)</strong>';

    const vp = pt > 0 ? (pt / 1).toFixed(4) : '-';
    document.getElementById('pesoModeDesc').innerHTML = pesoMode === 'igual'
      ? `Todas las preguntas valen lo mismo: <strong style="color:var(--accent2)">${vp} puntos</strong> cada una (suma total: ${pt}).`
      : 'Cada pregunta tiene un peso personalizado.';

    document.getElementById('califDesc').innerHTML =
      `Nota minima <strong style="color:var(--accent2)">${notaMinima.toFixed(1)}</strong>, maxima <strong style="color:var(--accent2)">${notaMaxima}</strong>. Formula: ${formula}`;

    cerrarModalSettings();
    toast('Configuracion guardada');
  } catch (e) {
    toast('Error al guardar: ' + e.message, true);
  }
}

/**
 * Abre el modal de confirmación para borrar una evaluación.
 * @param {number} id
 * @param {string} nombre - Ya escapado
 */
export function pedirBorrar(id, nombre) {
  setState({ pendingDeleteId: id });
  document.getElementById('modalBorrarMsg').textContent = `Eliminar la evaluacion "${nombre}"?`;
  document.getElementById('modalBorrar').classList.remove('hidden');
}

/**
 * Cierra el modal de borrado y limpia el id pendiente.
 */
export function cerrarModal() {
  document.getElementById('modalBorrar').classList.add('hidden');
  setState({ pendingDeleteId: null });
}

/**
 * Confirma y ejecuta el borrado de la evaluación pendiente.
 */
export async function confirmarBorrar() {
  const { pendingDeleteId } = getState();
  if (pendingDeleteId === null) return;

  try {
    const evals = await window.dbListar();
    const ev = evals.find(e => e.id === pendingDeleteId);
    if (ev) await window.dbEliminarFotosByEval(pendingDeleteId, ev.numE);
    await window.dbEliminar(pendingDeleteId);
    cerrarModal();
    toast('Evaluacion eliminada');
    renderHistorial();
  } catch (e) {
    toast('Error al eliminar: ' + e.message, true);
  }
}
