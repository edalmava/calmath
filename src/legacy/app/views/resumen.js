import { setState } from '../state.js';
import { parseSistemaCalif, calcNotaWithParams } from '../calification.js';
import { escapeHtml, showView } from './ui.js';

/**
 * Calcula los resultados de todos los estudiantes de una evaluación.
 * Usa calcNotaWithParams de calification.js eliminando la lógica duplicada.
 * @param {Object} ev - Evaluación completa desde DB
 * @returns {Array<{nombre, aciertos, nota, aprobado}>}
 */
function calcularResultados(ev) {
  const evCalif = ev.sistemaCalif || ev.evalMeta?.sistemaCalif || '1a5';
  const evMaxNota = ev.notaMaxima || 5;
  const pesos = ev.pesosPreguntas || (() => {
    const { notaMaxima, notaMinima } = parseSistemaCalif(evCalif);
    return new Array(ev.numP).fill((notaMaxima - notaMinima) / ev.numP);
  })();
  const notaAprueba = ev.notaAprobacion || 3;

  return ev.estudiantesRespuestas.map((resp, i) => {
    resp = resp || [];
    const nota = calcNotaWithParams(
      resp,
      ev.claveRespuestas,
      pesos,
      ev.numP,
      evCalif,
      notaAprueba,
      evMaxNota,
    );
    const aciertos = resp.filter((r, j) => r === ev.claveRespuestas[j]).length;
    return {
      nombre: ev.estudiantesNombres[i],
      aciertos,
      nota,
      aprobado: nota >= notaAprueba,
    };
  });
}

/**
 * Calcula el análisis de aciertos y distribución de respuestas por pregunta.
 * @param {Object} ev
 * @returns {{analisisPorPregunta: Array, distribucionPorPregunta: Array}}
 */
function calcularAnalisisPorPregunta(ev) {
  const analisisPorPregunta = [];
  const distribucionPorPregunta = [];

  for (let j = 0; j < ev.numP; j++) {
    let aciertosPregunta = 0;
    const conteo = { A: 0, B: 0, C: 0, D: 0 };

    for (let i = 0; i < ev.numE; i++) {
      const resp = (ev.estudiantesRespuestas[i] || [])[j];
      if (resp === ev.claveRespuestas[j]) aciertosPregunta++;
      if (resp && conteo[resp] !== undefined) conteo[resp]++;
    }

    const pct = ((aciertosPregunta / ev.numE) * 100).toFixed(1);
    analisisPorPregunta.push({ pregunta: j + 1, aciertos: aciertosPregunta, porcentaje: pct });
    distribucionPorPregunta.push({
      pregunta: j + 1,
      clave: ev.claveRespuestas[j],
      A: conteo.A, B: conteo.B, C: conteo.C, D: conteo.D,
    });
  }

  return { analisisPorPregunta, distribucionPorPregunta };
}

/**
 * Renderiza el header del resumen con metadata de la evaluación.
 * @param {Object} ev
 * @param {string} evCalif
 */
function renderizarHeader(ev, evCalif) {
  const { notaMinima, notaMaxima } = parseSistemaCalif(evCalif);
  const evPesoTotal = notaMaxima - notaMinima;
  const evPesoMode = ev.pesoMode || 'igual';
  const fechaLocal = ev.fecha
    ? new Date(ev.fecha + 'T12:00:00').toLocaleDateString('es-CO', {
      day: '2-digit', month: 'long', year: 'numeric',
    })
    : '-';

  const pesoLabel = evPesoMode === 'diferente'
    ? '<span style="color:var(--accent2)">Pesos individuales</span>'
    : `Peso uniforme: <strong>${(evPesoTotal / ev.numP).toFixed(4)}</strong>/pregunta`;
  const califLabel = `<span style="color:var(--accent)">Escala ${notaMinima}-${notaMaxima}</span>`;

  document.getElementById('rsmHeader').innerHTML = `
    <div class="rsm-title">${escapeHtml(ev.nombre)}</div>
    <div style="display:flex;gap:14px;flex-wrap:wrap;font-size:0.76rem;color:var(--muted);margin-top:6px;">
      <span class="periodo-pill">Periodo ${escapeHtml(ev.periodo)}</span>
      <span>${fechaLocal}</span>
      <span>${ev.numP} preguntas</span>
      <span>${ev.numE} estudiantes</span>
      <span>${pesoLabel}</span>
      <span>${califLabel}</span>
    </div>`;
}

/**
 * Renderiza los chips de estadísticas generales.
 * @param {Array} resultados
 * @param {number} numE
 * @param {number} notaAprueba
 */
function renderizarChips(resultados, numE, notaAprueba) {
  const totalNota = resultados.reduce((s, r) => s + r.nota, 0);
  const aprobados = resultados.filter(r => r.aprobado).length;
  const prom = (totalNota / numE).toFixed(2);
  const pctApr = ((aprobados / numE) * 100).toFixed(0);
  const promColor = prom >= notaAprueba
    ? 'var(--green)'
    : prom >= notaAprueba - 1 ? 'var(--accent)' : 'var(--red)';

  document.getElementById('rsmChips').innerHTML = `
    <div class="rsm-chip">
      <div class="rsm-chip-label">Promedio</div>
      <div class="rsm-chip-val" style="color:${promColor}">${prom}</div>
    </div>
    <div class="rsm-chip">
      <div class="rsm-chip-label">Aprobados</div>
      <div class="rsm-chip-val" style="color:var(--green)">${aprobados}/${numE}</div>
    </div>
    <div class="rsm-chip">
      <div class="rsm-chip-label">% Aprobacion</div>
      <div class="rsm-chip-val" style="color:var(--accent2)">${pctApr}%</div>
    </div>
    <div class="rsm-chip">
      <div class="rsm-chip-label">Reprobados</div>
      <div class="rsm-chip-val" style="color:var(--red)">${numE - aprobados}/${numE}</div>
    </div>`;
}

/**
 * Renderiza el análisis visual por pregunta y distribución de respuestas.
 * @param {Array} analisisPorPregunta
 * @param {Array} distribucionPorPregunta
 * @param {Object} ev
 */
function renderizarAnalisis(analisisPorPregunta, distribucionPorPregunta, ev) {
  const analisisHtml = analisisPorPregunta.map(a => {
    const pct = parseFloat(a.porcentaje);
    const color = pct >= 70 ? 'var(--green)' : pct >= 40 ? 'var(--accent)' : 'var(--red)';
    return `<div style="flex:1;min-width:80px;text-align:center;">
      <div style="font-size:0.68rem;color:var(--muted);margin-bottom:4px;">P${a.pregunta}</div>
      <div style="font-size:1.1rem;font-weight:700;color:${color};">${a.porcentaje}%</div>
      <div style="width:100%;height:5px;background:var(--border);border-radius:3px;margin:4px 0;overflow:hidden;">
        <div style="width:${pct}%;height:100%;background:${color};border-radius:3px;"></div>
      </div>
      <div style="font-size:0.6rem;color:var(--muted);">${a.aciertos}/${ev.numE}</div>
    </div>`;
  }).join('');

  const distribucionHtml = distribucionPorPregunta.map(d => {
    const pctA = ((d.A / ev.numE) * 100).toFixed(0);
    const pctB = ((d.B / ev.numE) * 100).toFixed(0);
    const pctC = ((d.C / ev.numE) * 100).toFixed(0);
    const pctD = ((d.D / ev.numE) * 100).toFixed(0);
    const maxVal = Math.max(d.A, d.B, d.C, d.D, 1);

    const barraOpc = (letra, count, pct, color) => `
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:6px;">
        <span style="width:14px;font-size:0.7rem;color:${color};font-weight:700;">${letra}</span>
        <div style="flex:1;height:6px;background:var(--border);border-radius:3px;overflow:hidden;">
          <div style="width:${(count / maxVal * 100)}%;height:100%;background:${color};border-radius:3px;"></div>
        </div>
        <span style="width:38px;font-size:0.65rem;color:var(--muted);text-align:right;">${count} (${pct}%)</span>
      </div>`;

    return `
      <div style="margin-bottom:14px;padding:10px;background:var(--bg);border-radius:6px;border:1px solid var(--border);">
        <div style="font-size:0.76rem;font-weight:600;margin-bottom:10px;">
          Pregunta ${d.pregunta}
          <span style="color:var(--muted);font-weight:400;">(clave: <span style="color:var(--green);font-weight:700;">${d.clave}</span>)</span>
        </div>
        ${barraOpc('A', d.A, pctA, 'var(--green)')}
        ${barraOpc('B', d.B, pctB, 'var(--red)')}
        ${barraOpc('C', d.C, pctC, 'var(--accent)')}
        ${barraOpc('D', d.D, pctD, 'var(--accent2)')}
      </div>`;
  }).join('');

  document.getElementById('rsmAnalisis').innerHTML = `
    <div style="margin-top:20px;padding-top:20px;border-top:1px solid var(--border);">
      <div style="font-size:0.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px;">Analisis por pregunta</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">${analisisHtml}</div>
    </div>
    <div style="margin-top:24px;padding-top:20px;border-top:1px solid var(--border);">
      <div style="font-size:0.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px;">Distribucion de respuestas por pregunta</div>
      ${distribucionHtml}
    </div>`;
}

/**
 * Renderiza la tabla de resultados por estudiante.
 * @param {Array} resultados
 * @param {number} numP
 * @param {number} notaAprueba
 */
function renderizarTablaResultados(resultados, numP, notaAprueba) {
  const tbody = document.getElementById('rsmBody');
  tbody.innerHTML = '';

  resultados.forEach((r, i) => {
    const barColor = r.nota >= notaAprueba
      ? 'var(--green)'
      : r.nota >= notaAprueba - 1 ? 'var(--accent)' : 'var(--red)';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="color:var(--muted)">${i + 1}</td>
      <td>${escapeHtml(r.nombre)}</td>
      <td><span style="color:var(--green);font-weight:700;">${r.aciertos}</span></td>
      <td><span style="color:var(--red);font-weight:700;">${numP - r.aciertos}</span></td>
      <td>
        <span style="color:${barColor};font-family:'Syne',sans-serif;font-weight:800;font-size:1.05rem;">${r.nota.toFixed(1)}</span>
        <div class="result-bar-wrap" style="margin-top:3px;width:90px;">
          <div class="result-bar" style="width:${((r.aciertos / numP) * 100).toFixed(0)}%;background:${barColor};"></div>
        </div>
      </td>
      <td><span class="tag ${r.aprobado ? 'tag-green' : 'tag-red'}">${r.aprobado ? 'Aprobo' : 'Reprobo'}</span></td>`;
    tbody.appendChild(tr);
  });
}

/**
 * Muestra el resumen completo de una evaluación guardada.
 * @param {number} id - ID de la evaluación en IndexedDB
 */
export async function mostrarResumen(id) {
  let ev;
  try {
    const evals = await window.dbListar();
    ev = evals.find(e => e.id === id);
    if (!ev) throw new Error('Evaluacion no encontrada.');
  } catch (e) {
    alert('Error al cargar la evaluacion: ' + e.message);
    return;
  }

  try {
    const evCalif = ev.sistemaCalif || ev.evalMeta?.sistemaCalif || '1a5';
    const notaAprueba = ev.notaAprobacion || 3;

    const resultados = calcularResultados(ev);
    const { analisisPorPregunta, distribucionPorPregunta } = calcularAnalisisPorPregunta(ev);

    renderizarHeader(ev, evCalif);
    renderizarChips(resultados, ev.numE, notaAprueba);
    renderizarAnalisis(analisisPorPregunta, distribucionPorPregunta, ev);
    renderizarTablaResultados(resultados, ev.numP, notaAprueba);

    showView('resumen');
    setState({ currentResumen: { ev, resultados, analisisPorPregunta, distribucionPorPregunta } });
  } catch (e) {
    alert('Error al mostrar resumen: ' + e.message);
  }
}
