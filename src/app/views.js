import { getState, setState } from './state.js';
import { reiniciar } from './steps.js';
import { jsPDF } from 'jspdf';

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export { escapeHtml };

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

export async function renderHistorial() {
  const lista = document.getElementById('histList');
  lista.innerHTML = '<div style="color:var(--muted);font-size:0.8rem;padding:16px 0;">Cargando historial...</div>';
  try {
    let evals = await window.dbListar();
    if (!evals.length) {
      lista.innerHTML = '<div class="hist-empty">' +
        '<div class="hist-icon">📂</div>' +
        'Aun no hay evaluaciones guardadas.' +
        '</div>';
      poblarPeriodosFiltro([]);
      return;
    }

    const filterNombre = document.getElementById('histFilterNombre')?.value?.toLowerCase().trim() || '';
    const filterPeriodo = document.getElementById('histFilterPeriodo')?.value || '';
    const filterFecha = document.getElementById('histFilterFecha')?.value || '';

    if (filterNombre || filterPeriodo || filterFecha) {
      evals = evals.filter(ev => {
        const matchNombre = !filterNombre || (ev.nombre && ev.nombre.toLowerCase().includes(filterNombre));
        const matchPeriodo = !filterPeriodo || ev.periodo === filterPeriodo;
        const matchFecha = !filterFecha || ev.fecha === filterFecha;
        return matchNombre && matchPeriodo && matchFecha;
      });
    }

    evals.sort((a, b) => new Date(b.guardadoEn) - new Date(a.guardadoEn));
    poblarPeriodosFiltro(evals);
    
    const countInfo = document.getElementById('histCount');
    if (countInfo) countInfo.textContent = `Mostrando ${evals.length} de ${(await window.dbListar()).length} evaluaciones`;
    
    lista.innerHTML = '';
    if (!evals.length) {
      lista.innerHTML = '<div class="hist-empty">' +
        '<div class="hist-icon">🔍</div>' +
        'No se encontraron evaluaciones con los filtros seleccionados.' +
        '</div>';
      return;
    }

    evals.forEach(ev => {
      const { appSettings } = getState();
      const notaAprueba = appSettings?.notaAprobacion ?? 3;
      const promNota = (ev.notas.reduce((s, n) => s + n.nota, 0) / ev.notas.length).toFixed(2);
      const aprobados = ev.notas.filter(n => n.nota >= notaAprueba).length;
      const promColor = promNota >= notaAprueba ? 'var(--green)' : promNota >= notaAprueba - 1 ? 'var(--accent)' : 'var(--red)';
      const fechaLocal = ev.fecha
        ? new Date(ev.fecha + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
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
      lista.appendChild(card);
    });
    bindHistorialEvents(evals);
    bindHistorialFilters();
  } catch (e) {
    lista.innerHTML = '<div style="color:var(--red);padding:16px 0;">Error al cargar historial: ' + e.message + '</div>';
  }
}

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

function bindHistorialFilters() {
  const nombreInput = document.getElementById('histFilterNombre');
  const periodoSelect = document.getElementById('histFilterPeriodo');
  const fechaInput = document.getElementById('histFilterFecha');
  const clearBtn = document.getElementById('histClearFilters');

  if (nombreInput) {
    nombreInput.oninput = debounce(() => renderHistorial(), 300);
  }
  if (periodoSelect) {
    periodoSelect.onchange = () => renderHistorial();
  }
  if (fechaInput) {
    fechaInput.onchange = () => renderHistorial();
  }
  if (clearBtn) {
    clearBtn.onclick = () => {
      if (nombreInput) nombreInput.value = '';
      if (periodoSelect) periodoSelect.value = '';
      if (fechaInput) fechaInput.value = '';
      renderHistorial();
    };
  }
}

function debounce(fn, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), delay);
  };
}

function bindHistorialEvents(evals) {
  evals.forEach(ev => {
    const resBtn = document.getElementById('evalResBtn_' + ev.id);
    if (resBtn) resBtn.onclick = () => mostrarResumen(ev.id);
    const detBtn = document.getElementById('evalDetBtn_' + ev.id);
    if (detBtn) detBtn.onclick = () => abrirModalDet(ev.id);
    const delBtn = document.getElementById('evalDelBtn_' + ev.id);
    if (delBtn) delBtn.onclick = () => pedirBorrar(ev.id, escapeHtml(ev.nombre));
  });
}

export async function mostrarResumen(id) {
  try {
    const evals = await window.dbListar();
    const ev = evals.find(e => e.id === id);
    if (!ev) {
      alert('Evaluacion no encontrada.');
      return;
    }

    const pesos = ev.pesosPreguntas || new Array(ev.numP).fill(4 / ev.numP);
    const evPesoMode = ev.pesoMode || 'igual';
    const evCalif = ev.sistemaCalif || ev.evalMeta?.sistemaCalif || '1a5';
    const evNotaMin = evCalif === '0a5' ? 0 : 1;
    const evMaxNota = ev.notaMaxima || 5;
    const notaAprueba = ev.notaAprobacion || 3;
    const fechaLocal = ev.fecha
      ? new Date(ev.fecha + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
      : '-';

    const resultados = ev.estudiantesRespuestas.map((resp, i) => {
      resp = resp || [];
      let suma = 0;
      for (let j = 0; j < ev.numP; j++) {
        if (resp[j] === ev.claveRespuestas[j]) suma += pesos[j];
      }
      const notaBruta = evCalif === '0a5' ? suma : 1 + suma;
      const nota = Math.min(evMaxNota, Math.max(evNotaMin, notaBruta));
      const aciertos = resp.filter((r, j) => r === ev.claveRespuestas[j]).length;
      return { nombre: ev.estudiantesNombres[i], aciertos, nota, aprobado: nota >= notaAprueba };
    });

    const analisisPorPregunta = [];
    const distribucionPorPregunta = [];
    for (let j = 0; j < ev.numP; j++) {
      let aciertosPregunta = 0;
      const conteo = { A: 0, B: 0, C: 0, D: 0 };
      for (let i = 0; i < ev.numE; i++) {
        const resp = ev.estudiantesRespuestas[i] || [];
        const respuesta = resp[j];
        if (respuesta === ev.claveRespuestas[j]) {
          aciertosPregunta++;
        }
        if (respuesta && conteo[respuesta] !== undefined) {
          conteo[respuesta]++;
        }
      }
      const pct = ((aciertosPregunta / ev.numE) * 100).toFixed(1);
      analisisPorPregunta.push({ pregunta: j + 1, aciertos: aciertosPregunta, porcentaje: pct });
      distribucionPorPregunta.push({
        pregunta: j + 1,
        clave: ev.claveRespuestas[j],
        A: conteo.A,
        B: conteo.B,
        C: conteo.C,
        D: conteo.D,
      });
    }

    const totalNota = resultados.reduce((s, r) => s + r.nota, 0);
    const aprobados = resultados.filter(r => r.aprobado).length;
    const prom = (totalNota / ev.numE).toFixed(2);
    const pctApr = ((aprobados / ev.numE) * 100).toFixed(0);
    const promColor = prom >= notaAprueba ? 'var(--green)' : prom >= notaAprueba - 1 ? 'var(--accent)' : 'var(--red)';
    const evPesoTotal = evCalif === '0a5' ? 5 : 4;
    const pesoLabel = evPesoMode === 'diferente'
      ? '<span style="color:var(--accent2)">Pesos individuales</span>'
      : `Peso uniforme: <strong>${(evPesoTotal / ev.numP).toFixed(4)}</strong>/pregunta`;
    const califLabel = evCalif === '0a5'
      ? '<span style="color:var(--accent)">Escala 0-5</span>'
      : '<span style="color:var(--accent)">Escala 1-5</span>';

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

    document.getElementById('rsmChips').innerHTML = `
      <div class="rsm-chip">
        <div class="rsm-chip-label">Promedio</div>
        <div class="rsm-chip-val" style="color:${promColor}">${prom}</div>
      </div>
      <div class="rsm-chip">
        <div class="rsm-chip-label">Aprobados</div>
        <div class="rsm-chip-val" style="color:var(--green)">${aprobados}/${ev.numE}</div>
      </div>
      <div class="rsm-chip">
        <div class="rsm-chip-label">% Aprobacion</div>
        <div class="rsm-chip-val" style="color:var(--accent2)">${pctApr}%</div>
      </div>
      <div class="rsm-chip">
        <div class="rsm-chip-label">Reprobados</div>
        <div class="rsm-chip-val" style="color:var(--red)">${ev.numE - aprobados}/${ev.numE}</div>
      </div>`;

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

    document.getElementById('rsmAnalisis').innerHTML = `
      <div style="margin-top:20px;padding-top:20px;border-top:1px solid var(--border);">
        <div style="font-size:0.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px;">Analisis por pregunta</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">${analisisHtml}</div>
      </div>
      <div style="margin-top:24px;padding-top:20px;border-top:1px solid var(--border);">
        <div style="font-size:0.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px;">Distribucion de respuestas por pregunta</div>
        ${distribucionPorPregunta.map(d => {
    const pctA = ((d.A / ev.numE) * 100).toFixed(0);
    const pctB = ((d.B / ev.numE) * 100).toFixed(0);
    const pctC = ((d.C / ev.numE) * 100).toFixed(0);
    const pctD = ((d.D / ev.numE) * 100).toFixed(0);
    const maxVal = Math.max(d.A, d.B, d.C, d.D, 1);
    return '<div style="margin-bottom:14px;padding:10px;background:var(--bg);border-radius:6px;border:1px solid var(--border);">' +
            '<div style="font-size:0.76rem;font-weight:600;margin-bottom:10px;">Pregunta ' + d.pregunta + ' <span style="color:var(--muted);font-weight:400;">(clave: <span style="color:var(--green);font-weight:700;">' + d.clave + '</span>)</span></div>' +
            '<div style="display:flex;gap:12px;align-items:center;margin-bottom:6px;">' +
              '<span style="width:14px;font-size:0.7rem;color:var(--green);font-weight:700;">A</span>' +
              '<div style="flex:1;height:6px;background:var(--border);border-radius:3px;overflow:hidden;">' +
                '<div style="width:' + (d.A / maxVal * 100) + '%;height:100%;background:var(--green);border-radius:3px;"></div>' +
              '</div>' +
              '<span style="width:38px;font-size:0.65rem;color:var(--muted);text-align:right;">' + d.A + ' (' + pctA + '%)</span>' +
            '</div>' +
            '<div style="display:flex;gap:12px;align-items:center;margin-bottom:6px;">' +
              '<span style="width:14px;font-size:0.7rem;color:var(--red);font-weight:700;">B</span>' +
              '<div style="flex:1;height:6px;background:var(--border);border-radius:3px;overflow:hidden;">' +
                '<div style="width:' + (d.B / maxVal * 100) + '%;height:100%;background:var(--red);border-radius:3px;"></div>' +
              '</div>' +
              '<span style="width:38px;font-size:0.65rem;color:var(--muted);text-align:right;">' + d.B + ' (' + pctB + '%)</span>' +
            '</div>' +
            '<div style="display:flex;gap:12px;align-items:center;margin-bottom:6px;">' +
              '<span style="width:14px;font-size:0.7rem;color:var(--accent);font-weight:700;">C</span>' +
              '<div style="flex:1;height:6px;background:var(--border);border-radius:3px;overflow:hidden;">' +
                '<div style="width:' + (d.C / maxVal * 100) + '%;height:100%;background:var(--accent);border-radius:3px;"></div>' +
              '</div>' +
              '<span style="width:38px;font-size:0.65rem;color:var(--muted);text-align:right;">' + d.C + ' (' + pctC + '%)</span>' +
            '</div>' +
            '<div style="display:flex;gap:12px;align-items:center;">' +
              '<span style="width:14px;font-size:0.7rem;color:var(--accent2);font-weight:700;">D</span>' +
              '<div style="flex:1;height:6px;background:var(--border);border-radius:3px;overflow:hidden;">' +
                '<div style="width:' + (d.D / maxVal * 100) + '%;height:100%;background:var(--accent2);border-radius:3px;"></div>' +
              '</div>' +
              '<span style="width:38px;font-size:0.65rem;color:var(--muted);text-align:right;">' + d.D + ' (' + pctD + '%)</span>' +
            '</div>' +
            '</div>';
  }).join('')}
      </div>`;

    const tbody = document.getElementById('rsmBody');
    tbody.innerHTML = '';
    resultados.forEach((r, i) => {
      const barColor = r.nota >= notaAprueba ? 'var(--green)' : r.nota >= notaAprueba - 1 ? 'var(--accent)' : 'var(--red)';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="color:var(--muted)">${i + 1}</td>
        <td>${escapeHtml(r.nombre)}</td>
        <td><span style="color:var(--green);font-weight:700;">${r.aciertos}</span></td>
        <td><span style="color:var(--red);font-weight:700;">${ev.numP - r.aciertos}</span></td>
        <td>
          <span style="color:${barColor};font-family:'Syne',sans-serif;font-weight:800;font-size:1.05rem;">${r.nota.toFixed(1)}</span>
          <div class="result-bar-wrap" style="margin-top:3px;width:90px;">
            <div class="result-bar" style="width:${((r.aciertos / ev.numP) * 100).toFixed(0)}%;background:${barColor};"></div>
          </div>
        </td>
        <td><span class="tag ${r.aprobado ? 'tag-green' : 'tag-red'}">${r.aprobado ? 'Aprobo' : 'Reprobo'}</span></td>`;
      tbody.appendChild(tr);
    });

    showView('resumen');

    setState({ currentResumen: { ev, resultados, analisisPorPregunta, distribucionPorPregunta } });
  } catch (e) {
    alert('Error al mostrar resumen: ' + e.message);
  }
}

export function pedirBorrar(id, nombre) {
  setState({ pendingDeleteId: id });
  document.getElementById('modalBorrarMsg').textContent = `Eliminar la evaluacion "${nombre}"?`;
  document.getElementById('modalBorrar').classList.remove('hidden');
}

export function cerrarModal() {
  document.getElementById('modalBorrar').classList.add('hidden');
  setState({ pendingDeleteId: null });
}

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
    toast('Error: ' + e.message, true);
  }
}

export async function cargarSettings() {
  try {
    const settings = await window.dbObtenerSettings();
    if (settings) {
      const { setSettings } = await import('./state.js');
      setSettings({
        notaMaxima: settings.notaMaxima || 5,
        notaAprobacion: settings.notaAprobacion || 3,
      });
    }
  } catch (e) {
    console.error('Error al cargar settings:', e);
  }
}

export function abrirModalSettings() {
  const { appSettings, sistemaCalif } = getState();
  document.getElementById('setNotaMaxima').value = appSettings.notaMaxima || 5;
  document.getElementById('setNotaAprobacion').value = appSettings.notaAprobacion || 3;
  document.getElementById('setSistemaCalif').value = sistemaCalif || '1a5';
  document.getElementById('modalSettings').classList.remove('hidden');
}

export function cerrarModalSettings() {
  document.getElementById('modalSettings').classList.add('hidden');
}

export async function guardarSettings() {
  const notaMaxima = parseFloat(document.getElementById('setNotaMaxima').value) || 5;
  const notaAprobacion = parseFloat(document.getElementById('setNotaAprobacion').value) || 3;
  const sistemaCalif = document.getElementById('setSistemaCalif').value;

  if (notaAprobacion >= notaMaxima) {
    toast('La nota de aprobacion debe ser menor que la nota maxima', true);
    return;
  }

  try {
    await window.dbGuardarSettings({
      notaMaxima,
      notaAprobacion,
      sistemaCalif,
    });

    const { setSettings } = await import('./state.js');
    setSettings({ notaMaxima, notaAprobacion });
    setState({ sistemaCalif });

    cerrarModalSettings();
    toast('Configuracion guardada');
  } catch (e) {
    toast('Error al guardar: ' + e.message, true);
  }
}

export function exportarCSV() {
  const { currentResumen } = getState();
  if (!currentResumen) {
    toast('No hay datos de resumen para exportar', true);
    return;
  }

  const { ev, analisisPorPregunta, distribucionPorPregunta } = currentResumen;

  const pesos = ev.pesosPreguntas || new Array(ev.numP).fill(4 / ev.numP);
  const evPesoMode = ev.pesoMode || 'igual';
  const evCalif = ev.sistemaCalif || ev.evalMeta?.sistemaCalif || '1a5';
  const evMaxNota = ev.notaMaxima || 5;
  const notaAprueba = ev.notaAprobacion || 3;

  const claveHeader = Array.from({ length: ev.numP }, (_, i) => ev.claveRespuestas[i]).join(',');
  const pesosHeader = pesos.map(p => p.toFixed(4)).join(',');

  let csv = '# ===== METADATA (para importacion) =====\n';
  csv += '# Formato: EVALMATH_v1\n';
  csv += 'nombre,' + ev.nombre + '\n';
  csv += 'fecha,' + (ev.fecha || '') + '\n';
  csv += 'periodo,' + ev.periodo + '\n';
  csv += 'numP,' + ev.numP + '\n';
  csv += 'numE,' + ev.numE + '\n';
  csv += 'sistemaCalif,' + evCalif + '\n';
  csv += 'notaMaxima,' + evMaxNota + '\n';
  csv += 'notaAprobacion,' + notaAprueba + '\n';
  csv += 'pesoMode,' + evPesoMode + '\n';
  csv += 'pesosPreguntas,' + pesosHeader + '\n';
  csv += 'claveRespuestas,' + claveHeader + '\n';

  csv += '\n# ===== ESTUDIANTES =====\n';
  csv += '#num,nombre,respuestas,calificado\n';
  ev.estudiantesRespuestas.forEach((resp, i) => {
    const nombre = ev.estudiantesNombres[i] || '';
    const respuestas = resp.map(rp => rp || '-').join('|');
    const calif = ev.estudiantesCalificados[i] ? 'Si' : 'No';
    csv += (i + 1) + '|' + nombre.replace(/"/g, '""') + '|' + respuestas + '|' + calif + '\n';
  });

  csv += '\n# ===== ANALISIS POR PREGUNTA =====\n';
  csv += 'Pregunta,Clave,Aciertos,Porcentaje\n';
  analisisPorPregunta.forEach(a => {
    csv += a.pregunta + ',' + ev.claveRespuestas[a.pregunta - 1] + ',' + a.aciertos + ',' + a.porcentaje + '%\n';
  });

  csv += '\n# ===== DISTRIBUCION DE RESPUESTAS =====\n';
  csv += 'Pregunta,Clave,A,B,C,D\n';
  distribucionPorPregunta.forEach(d => {
    csv += d.pregunta + ',' + d.clave + ',' + d.A + ',' + d.B + ',' + d.C + ',' + d.D + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = ev.nombre.replace(/[^a-zA-Z0-9]/g, '_') + '_resultados.csv';
  link.click();
  URL.revokeObjectURL(url);
  toast('CSV exportado');
}

export async function importarEvaluacion(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target.result;
        const lines = content.split('\n').map(l => l.trim()).filter(l => l);

        const metadata = {};
        const estudiantesData = [];
        let inMetadata = false;
        let inEstudiantes = false;

        for (const line of lines) {
          if (line.startsWith('# =====')) {
            if (line.includes('METADATA')) inMetadata = true;
            else if (line.includes('ESTUDIANTES')) {
              inMetadata = false;
              inEstudiantes = true;
            }
            continue;
          }

          if (inMetadata && (line.startsWith('nombre,') ||
              line.startsWith('fecha,') ||
              line.startsWith('periodo,') ||
              line.startsWith('numP,') ||
              line.startsWith('numE,') ||
              line.startsWith('sistemaCalif,') ||
              line.startsWith('notaMaxima,') ||
              line.startsWith('notaAprobacion,') ||
              line.startsWith('pesoMode,') ||
              line.startsWith('pesosPreguntas,') ||
              line.startsWith('claveRespuestas,'))) {
            const [key, ...valueParts] = line.split(',');
            const value = valueParts.join(',');
            if (key === 'numP' || key === 'numE' || key === 'notaMaxima' || key === 'notaAprobacion') {
              metadata[key] = parseInt(value, 10);
            } else if (key === 'pesosPreguntas' || key === 'claveRespuestas') {
              metadata[key] = value.split(',');
            } else {
              metadata[key] = value;
            }
          }

          if (inEstudiantes) {
            if (line.startsWith('#') && line.includes(',')) {
              continue;
            }

            const isCalifSi = line.endsWith('|Si');
            const isCalifNo = line.endsWith('|No');
            if (!isCalifSi && !isCalifNo) {
              continue;
            }

            const calif = isCalifSi ? 'Si' : 'No';
            const califLen = calif.length + 1;
            const lineWithoutCalif = line.substring(0, line.length - califLen);

            const pipes = lineWithoutCalif.split('|');
            if (pipes.length < 2) continue;

            const numP = metadata.numP || 5;
            const num = parseInt(pipes[0], 10);

            if (isNaN(num)) continue;

            const pipesLen = pipes.length;
            const nombreEnd = pipesLen - numP;

            if (nombreEnd < 1) continue;

            const nombre = pipes.slice(1, nombreEnd).join('|');
            const respuestasArr = pipes.slice(nombreEnd);

            estudiantesData.push({
              nombre,
              respuestas: respuestasArr,
              calificados: calif === 'Si'
            });
          }
        }

        if (!metadata.nombre || !metadata.numP || !metadata.claveRespuestas) {
          throw new Error('El archivo CSV no tiene el formato esperado. Falta metadata.');
        }

        if (!Number.isInteger(metadata.numP) || metadata.numP < 1 || metadata.numP > 100) {
          throw new Error('El número de preguntas debe estar entre 1 y 100.');
        }

        if (!Number.isInteger(metadata.numE) || metadata.numE < 1 || metadata.numE > 200) {
          throw new Error('El número de estudiantes debe estar entre 1 y 200.');
        }

        const numE = metadata.numE || estudiantesData.length;
        if (estudiantesData.length > numE) {
          throw new Error(`El archivo tiene ${estudiantesData.length} estudiantes pero numE indica ${numE}.`);
        }

        const validClaves = ['A', 'B', 'C', 'D'];
        for (let i = 0; i < metadata.claveRespuestas.length; i++) {
          const clave = metadata.claveRespuestas[i];
          if (!validClaves.includes(clave)) {
            throw new Error(`Clave de respuesta inválida en pregunta ${i + 1}: "${clave}". Debe ser A, B, C o D.`);
          }
        }

        if (metadata.pesosPreguntas && metadata.pesosPreguntas.length !== metadata.numP) {
          throw new Error(`El número de pesos (${metadata.pesosPreguntas.length}) no coincide con el número de preguntas (${metadata.numP}).`);
        }

        for (const est of estudiantesData) {
          if (est.respuestas.length !== metadata.numP) {
            throw new Error(`El estudiante "${est.nombre}" tiene ${est.respuestas.length} respuestas pero deberían ser ${metadata.numP}.`);
          }
          for (let j = 0; j < est.respuestas.length; j++) {
            const resp = est.respuestas[j];
            if (resp && !validClaves.includes(resp)) {
              throw new Error(`Respuesta inválida en pregunta ${j + 1} para "${est.nombre}": "${resp}". Debe ser A, B, C, D o vacío.`);
            }
          }
        }

        console.log('Creating evaluacion object...');

        const evaluacion = {
          evalMeta: {
            nombre: metadata.nombre,
            fecha: metadata.fecha || '',
            periodo: metadata.periodo || '',
          },
          nombre: metadata.nombre,
          fecha: metadata.fecha || '',
          periodo: metadata.periodo || '',
          numP: metadata.numP,
          numE: numE,
          sistemaCalif: metadata.sistemaCalif || '1a5',
          notaMaxima: metadata.notaMaxima || 5,
          notaAprobacion: metadata.notaAprobacion || 3,
          pesoMode: metadata.pesoMode || 'igual',
          pesosPreguntas: (metadata.pesosPreguntas || new Array(metadata.numP).fill(4 / metadata.numP)).map(p => parseFloat(p)),
          claveRespuestas: metadata.claveRespuestas,
          estudiantesNombres: estudiantesData.map(e => e.nombre),
          estudiantesRespuestas: estudiantesData.map(e => e.respuestas),
          estudiantesCalificados: estudiantesData.map(e => e.calificados),
          fotosMeta: new Array(estudiantesData.length).fill(null),
          notas: [],
          guardadoEn: new Date().toISOString(),
        };

        const pesos = evaluacion.pesosPreguntas;
        const evCalif = evaluacion.sistemaCalif;
        const evNotaMin = evCalif === '0a5' ? 0 : 1;
        const evMaxNota = evaluacion.notaMaxima;

        for (let i = 0; i < evaluacion.numE; i++) {
          const resp = evaluacion.estudiantesRespuestas[i] || [];
          let suma = 0;
          for (let j = 0; j < evaluacion.numP; j++) {
            if (resp[j] === evaluacion.claveRespuestas[j]) {
              suma += pesos[j];
            }
          }
          const notaBruta = evCalif === '0a5' ? suma : 1 + suma;
          const nota = Math.min(evMaxNota, Math.max(evNotaMin, notaBruta));
          const aciertos = resp.filter((r, j) => r === evaluacion.claveRespuestas[j]).length;
          evaluacion.notas.push({ nombre: evaluacion.estudiantesNombres[i], aciertos, nota });
        }

        await window.dbGuardar(evaluacion);
        renderHistorial();
        toast('Evaluacion importada correctamente');
        resolve(evaluacion);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsText(file);
  });
}

export function exportarPDF() {
  let { currentResumen } = getState();
  
  if (!currentResumen) {
    const state = getState();
    const { numP, numE, evalMeta, estudiantesRespuestas, estudiantesNombres, claveRespuestas, pesosPreguntas, sistemaCalif } = state;
    
    if (!numP || !numE) {
      toast('No hay datos para exportar', true);
      return;
    }
    
    const notaMaxima = sistemaCalif === '0a5' ? 5 : 5;
    const notaMinima = sistemaCalif === '0a5' ? 0 : 1;
    const notaAprueba = 3;
    
    const resultados = [];
    for (let i = 0; i < numE; i++) {
      const resp = estudiantesRespuestas[i] || [];
      let suma = 0;
      for (let j = 0; j < numP; j++) {
        if (resp[j] === claveRespuestas[j]) suma += pesosPreguntas[j];
      }
      const notaBruta = sistemaCalif === '0a5' ? suma : 1 + suma;
      const nota = Math.min(notaMaxima, Math.max(notaMinima, notaBruta));
      const aciertos = resp.filter((r, j) => r === claveRespuestas[j]).length;
      resultados.push({ nombre: estudiantesNombres[i], aciertos, nota, aprobado: nota >= notaAprueba });
    }
    
    const analisisPorPregunta = [];
    const distribucionPorPregunta = [];
    for (let j = 0; j < numP; j++) {
      let aciertosPregunta = 0;
      const conteo = { A: 0, B: 0, C: 0, D: 0 };
      for (let i = 0; i < numE; i++) {
        const resp = estudiantesRespuestas[i] || [];
        const respuesta = resp[j];
        if (respuesta === claveRespuestas[j]) aciertosPregunta++;
        if (respuesta && conteo[respuesta] !== undefined) conteo[respuesta]++;
      }
      const pct = ((aciertosPregunta / numE) * 100).toFixed(1);
      analisisPorPregunta.push({ pregunta: j + 1, aciertos: aciertosPregunta, porcentaje: pct });
      distribucionPorPregunta.push({ pregunta: j + 1, clave: claveRespuestas[j], ...conteo });
    }
    
    currentResumen = {
      ev: {
        nombre: evalMeta.nombre,
        fecha: evalMeta.fecha,
        periodo: evalMeta.periodo,
        numP,
        numE,
        notaAprobacion: notaAprueba,
      },
      resultados,
      analisisPorPregunta,
      distribucionPorPregunta,
    };
  }

  const { ev, resultados, analisisPorPregunta, distribucionPorPregunta } = currentResumen;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Resultados de Evaluación', pageWidth / 2, y, { align: 'center' });
  y += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(escapeHtml(ev.nombre), pageWidth / 2, y, { align: 'center' });
  y += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const fechaLocal = ev.fecha
    ? new Date(ev.fecha + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
    : '-';
  const infoLine = `Periodo ${ev.periodo} | ${fechaLocal} | ${ev.numP} preguntas | ${ev.numE} estudiantes`;
  doc.text(infoLine, pageWidth / 2, y, { align: 'center' });
  y += 12;

  const notaAprueba = ev.notaAprobacion || 3;
  const totalNota = resultados.reduce((s, r) => s + r.nota, 0);
  const aprobados = resultados.filter(r => r.aprobado).length;
  const prom = (totalNota / ev.numE).toFixed(2);
  const pctApr = ((aprobados / ev.numE) * 100).toFixed(0);

  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y, pageWidth - 2 * margin, 18, 'F');
  y += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Promedio: ${prom}`, margin + 5, y);
  doc.text(`Aprobados: ${aprobados}/${ev.numE} (${pctApr}%)`, margin + 60, y);
  doc.text(`Nota mínima: ${notaAprueba}`, margin + 120, y);
  y += 16;

  const colWidths = [12, 65, 25, 25, 25, 30];
  const headers = ['#', 'Estudiante', 'Aciertos', 'Errores', 'Nota', 'Estado'];
  const startX = margin;

  doc.setFillColor(30, 30, 30);
  doc.rect(startX, y, pageWidth - 2 * margin, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  let x = startX + 2;
  headers.forEach((h, i) => {
    doc.text(h, x + colWidths[i] / 2, y + 5.5, { align: 'center' });
    x += colWidths[i];
  });
  y += 8;

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  
  resultados.forEach((r, i) => {
    if (y > pageHeight - 25) {
      doc.addPage();
      y = margin;
    }

    const bgColor = i % 2 === 0 ? 255 : 245;
    doc.setFillColor(bgColor, bgColor, bgColor);
    doc.rect(startX, y, pageWidth - 2 * margin, 7, 'F');

    x = startX + 2;
    const estado = r.aprobado ? 'Aprobado' : 'Reprobado';
    const notaColor = r.nota >= notaAprueba ? [86, 211, 100] : r.nota >= notaAprueba - 1 ? [240, 192, 64] : [248, 81, 73];
    const estadoColor = r.aprobado ? [86, 211, 100] : [248, 81, 73];

    doc.setTextColor(100, 100, 100);
    doc.text(String(i + 1), x + colWidths[0] / 2, y + 5, { align: 'center' });
    x += colWidths[0];

    doc.setTextColor(0, 0, 0);
    const nombreMostrar = r.nombre.length > 28 ? r.nombre.substring(0, 25) + '...' : r.nombre;
    doc.text(nombreMostrar, x + 2, y + 5);
    x += colWidths[1];

    doc.setTextColor(86, 211, 100);
    doc.text(String(r.aciertos), x + colWidths[2] / 2, y + 5, { align: 'center' });
    x += colWidths[2];

    doc.setTextColor(248, 81, 73);
    const errores = ev.numP - r.aciertos;
    doc.text(String(errores), x + colWidths[3] / 2, y + 5, { align: 'center' });
    x += colWidths[3];

    doc.setTextColor(notaColor[0], notaColor[1], notaColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(r.nota.toFixed(1), x + colWidths[4] / 2, y + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    x += colWidths[4];

    doc.setTextColor(estadoColor[0], estadoColor[1], estadoColor[2]);
    doc.text(estado, x + colWidths[5] / 2, y + 5, { align: 'center' });

    y += 7;
  });

  y += 10;
  if (y > pageHeight - 40) {
    doc.addPage();
    y = margin;
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Análisis por Pregunta', margin, y);
  y += 7;

  doc.setFillColor(30, 30, 30);
  doc.rect(margin, y, pageWidth - 2 * margin, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Pregunta', margin + 5, y + 5);
  doc.text('Aciertos', margin + 35, y + 5);
  doc.text('%', margin + 55, y + 5);
  doc.text('Pregunta', margin + 75, y + 5);
  doc.text('Aciertos', margin + 105, y + 5);
  doc.text('%', margin + 125, y + 5);
  y += 7;

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  const half = Math.ceil(analisisPorPregunta.length / 2);
  for (let i = 0; i < half; i++) {
    if (y > pageHeight - 20) {
      doc.addPage();
      y = margin;
    }

    const left = analisisPorPregunta[i];
    const right = analisisPorPregunta[i + half];

    doc.text(String(left.pregunta), margin + 5, y + 4);
    doc.text(String(left.aciertos), margin + 35, y + 4);
    doc.text(left.porcentaje + '%', margin + 55, y + 4);

    if (right) {
      doc.text(String(right.pregunta), margin + 75, y + 4);
      doc.text(String(right.aciertos), margin + 105, y + 4);
      doc.text(right.porcentaje + '%', margin + 125, y + 4);
    }

    y += 6;
  }

  y += 12;
  if (y > pageHeight - 60) {
    doc.addPage();
    y = margin;
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Distribucion de Respuestas por Pregunta', pageWidth / 2, y, { align: 'center' });
  y += 10;

  const colors = {
    A: [86, 211, 100],
    B: [248, 81, 73],
    C: [240, 192, 64],
    D: [79, 195, 247]
  };
  const maxBarWidth = 55;
  const colWidth = (pageWidth - 2 * margin) / 2 - 5;
  const halfDist = Math.ceil(distribucionPorPregunta.length / 2);

  for (let i = 0; i < halfDist; i++) {
    if (y > pageHeight - 50) {
      doc.addPage();
      y = margin;
    }

    const left = distribucionPorPregunta[i];
    const right = distribucionPorPregunta[i + half];

    const drawDistrib = (d, xOffset) => {
      const maxVal = Math.max(d.A, d.B, d.C, d.D, 1);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`P${d.pregunta} (Clave: ${d.clave})`, xOffset, y);
      
      const barY = y + 4;
      const options = ['A', 'B', 'C', 'D'];
      const barHeight = 4;
      
      options.forEach((opt, idx) => {
        const count = d[opt];
        const pct = ((count / ev.numE) * 100).toFixed(0);
        const barWidth = (count / maxVal) * maxBarWidth;
        
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(colors[opt][0], colors[opt][1], colors[opt][2]);
        doc.text(opt, xOffset, barY + idx * 6 + 3);
        
        doc.setFillColor(230, 230, 230);
        doc.rect(xOffset + 6, barY + idx * 6, maxBarWidth, barHeight, 'F');
        
        doc.setFillColor(colors[opt][0], colors[opt][1], colors[opt][2]);
        doc.rect(xOffset + 6, barY + idx * 6, barWidth, barHeight, 'F');
        
        doc.setTextColor(100, 100, 100);
        doc.text(`${count} (${pct}%)`, xOffset + 6 + maxBarWidth + 3, barY + idx * 6 + 3);
      });
    };

    drawDistrib(left, margin);
    if (right) {
      drawDistrib(right, margin + colWidth + 10);
    }

    y += 28;
  }

  const safeName = ev.nombre.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ]/g, '_');
  doc.save(`${safeName}_resultados.pdf`);
  toast('PDF descargado correctamente');
}
