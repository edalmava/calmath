import { escapeHtml } from './ui.js';

/**
 * Función de debounce para limitar llamadas frecuentes.
 * @param {Function} fn
 * @param {number} delay
 * @returns {Function}
 */
function debounce(fn, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Rellena el select de periodos con los valores únicos encontrados.
 * @param {Array} evals
 */
function poblarPeriodosFiltro(evals) {
  const select = document.getElementById('histFilterPeriodo');
  if (!select) return;

  const periodosUnicos = [...new Set(evals.map(ev => ev.periodo).filter(Boolean))].sort();
  const currentValue = select.value;
  select.innerHTML = '<option value="">Todos los periodos</option>';
  periodosUnicos.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p;
    opt.textContent = 'Periodo ' + p;
    select.appendChild(opt);
  });
  select.value = currentValue;
}

/**
 * Enlaza los eventos de los filtros del historial.
 */
function bindHistorialFilters() {
  const nombreInput = document.getElementById('histFilterNombre');
  const periodoSelect = document.getElementById('histFilterPeriodo');
  const fechaInput = document.getElementById('histFilterFecha');
  const clearBtn = document.getElementById('histClearFilters');

  if (nombreInput) nombreInput.oninput = debounce(() => renderHistorial(), 300);
  if (periodoSelect) periodoSelect.onchange = () => renderHistorial();
  if (fechaInput) fechaInput.onchange = () => renderHistorial();
  if (clearBtn) {
    clearBtn.onclick = () => {
      if (nombreInput) nombreInput.value = '';
      if (periodoSelect) periodoSelect.value = '';
      if (fechaInput) fechaInput.value = '';
      renderHistorial();
    };
  }
}

/**
 * Enlaza los botones de acción de cada tarjeta del historial.
 * @param {Array} evals
 */
function bindHistorialEvents(evals) {
  evals.forEach(ev => {
    const resBtn = document.getElementById('evalResBtn_' + ev.id);
    if (resBtn) resBtn.onclick = () => window.mostrarResumen(ev.id);

    const detBtn = document.getElementById('evalDetBtn_' + ev.id);
    if (detBtn) detBtn.onclick = () => window.abrirModalDet(ev.id);

    const delBtn = document.getElementById('evalDelBtn_' + ev.id);
    if (delBtn) delBtn.onclick = () => window.pedirBorrar(ev.id, escapeHtml(ev.nombre));
  });
}

/**
 * Construye el HTML de una tarjeta de evaluación para el historial.
 * @param {Object} ev
 * @returns {HTMLElement}
 */
function construirTarjetaEval(ev) {
  const notaAprueba = ev.notaAprobacion ?? 3;
  const promNota = (ev.notas.reduce((s, n) => s + n.nota, 0) / ev.notas.length).toFixed(2);
  const aprobados = ev.notas.filter(n => n.nota >= notaAprueba).length;
  const promColor = promNota >= notaAprueba
    ? 'var(--green)'
    : promNota >= notaAprueba - 1
      ? 'var(--accent)'
      : 'var(--red)';
  const fechaLocal = ev.fecha
    ? new Date(ev.fecha + 'T12:00:00').toLocaleDateString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
    : '-';

  const card = document.createElement('div');
  card.className = 'eval-card';
  card.innerHTML = `
    <div class="eval-card-info">
      <div class="eval-card-title">
        ${escapeHtml(ev.nombre)}
        <span class="periodo-pill">Periodo ${escapeHtml(ev.periodo)}</span>
      </div>
      <div class="eval-card-meta">
        <span>${fechaLocal}</span>
        <span>${ev.numP} preguntas</span>
        <span>${ev.numE} estudiantes</span>
        <span>Promedio: <strong style="color:${promColor}">${promNota}</strong></span>
        <span>${aprobados}/${ev.numE} aprobaron</span>
      </div>
    </div>
    <div class="eval-card-actions">
      <button class="btn btn-secondary" style="padding:7px 14px;font-size:0.75rem;" id="evalResBtn_${ev.id}">Resumen</button>
      <button class="btn-ghost" style="padding:7px 14px;font-size:0.75rem;border-color:var(--accent2);color:var(--accent2);" id="evalDetBtn_${ev.id}">Respuestas</button>
      <button class="btn btn-danger" style="padding:7px 14px;font-size:0.75rem;" id="evalDelBtn_${ev.id}">🗑</button>
    </div>`;
  return card;
}

/**
 * Aplica los filtros activos sobre la lista de evaluaciones.
 * @param {Array} evals
 * @returns {Array}
 */
function aplicarFiltros(evals) {
  const filterNombre = document.getElementById('histFilterNombre')?.value?.toLowerCase().trim() || '';
  const filterPeriodo = document.getElementById('histFilterPeriodo')?.value || '';
  const filterFecha = document.getElementById('histFilterFecha')?.value || '';

  if (!filterNombre && !filterPeriodo && !filterFecha) return evals;

  return evals.filter(ev => {
    const matchNombre = !filterNombre || (ev.nombre && ev.nombre.toLowerCase().includes(filterNombre));
    const matchPeriodo = !filterPeriodo || ev.periodo === filterPeriodo;
    const matchFecha = !filterFecha || ev.fecha === filterFecha;
    return matchNombre && matchPeriodo && matchFecha;
  });
}

/**
 * Renderiza el historial completo con filtros y tarjetas.
 */
export async function renderHistorial() {
  const lista = document.getElementById('histList');
  lista.innerHTML = '<div style="color:var(--muted);font-size:0.8rem;padding:16px 0;">Cargando historial...</div>';

  let todosLosEvals;
  try {
    todosLosEvals = await window.dbListar();
  } catch (e) {
    lista.innerHTML = `<div style="color:var(--red);padding:16px 0;">Error al cargar historial: ${escapeHtml(e.message)}</div>`;
    return;
  }

  if (!todosLosEvals.length) {
    lista.innerHTML = '<div class="hist-empty"><div class="hist-icon">📂</div>Aun no hay evaluaciones guardadas.</div>';
    poblarPeriodosFiltro([]);
    return;
  }

  const evalsOrdenados = [...todosLosEvals].sort(
    (a, b) => new Date(b.guardadoEn) - new Date(a.guardadoEn),
  );
  const evalsFiltrados = aplicarFiltros(evalsOrdenados);

  poblarPeriodosFiltro(evalsOrdenados);
  bindHistorialFilters();

  const countInfo = document.getElementById('histCount');
  if (countInfo) {
    countInfo.textContent = `Mostrando ${evalsFiltrados.length} de ${todosLosEvals.length} evaluaciones`;
  }

  lista.innerHTML = '';

  if (!evalsFiltrados.length) {
    lista.innerHTML = '<div class="hist-empty"><div class="hist-icon">🔍</div>No se encontraron evaluaciones con los filtros seleccionados.</div>';
    return;
  }

  evalsFiltrados.forEach(ev => lista.appendChild(construirTarjetaEval(ev)));
  bindHistorialEvents(evalsFiltrados);
}
