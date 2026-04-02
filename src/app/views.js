/**
 * views.js — Barrel de re-exportación
 *
 * Mantiene la misma API pública que antes de la refactorización.
 * index.js y los tests no requieren cambios.
 */

export { escapeHtml, showView, toast } from './views/ui.js';
export { renderHistorial } from './views/historial.js';
export { mostrarResumen } from './views/resumen.js';
export {
  cargarSettings,
  abrirModalSettings,
  cerrarModalSettings,
  guardarSettings,
  pedirBorrar,
  cerrarModal,
  confirmarBorrar,
} from './views/modals.js';
export { exportarCSV, exportarPDF, importarEvaluacion } from './views/exports.js';
