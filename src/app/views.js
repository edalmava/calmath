import { getState, setState } from './state.js';
import { reiniciar } from './steps.js';

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
    const evals = await window.dbListar();
    if (!evals.length) {
      lista.innerHTML = '<div class="hist-empty">' +
        '<div class="hist-icon">📂</div>' +
        'Aun no hay evaluaciones guardadas.' +
        '</div>';
      return;
    }
    evals.sort((a, b) => new Date(b.guardadoEn) - new Date(a.guardadoEn));
    lista.innerHTML = '';
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
  } catch (e) {
    lista.innerHTML = '<div style="color:var(--red);padding:16px 0;">Error al cargar historial: ' + e.message + '</div>';
  }
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
    return '<div style="margin-bottom:12px;padding:8px;background:var(--bg-alt);border-radius:6px;">' +
            '<div style="font-size:0.75rem;font-weight:600;margin-bottom:6px;">Pregunta ' + d.pregunta + ' (clave: <span style="color:var(--green);font-weight:700;">' + d.clave + '</span>)</div>' +
            '<div style="display:flex;gap:16px;font-size:0.7rem;">' +
            '<span><span style="color:var(--green);font-weight:700;">A</span>: ' + d.A + ' (' + pctA + '%)</span>' +
            '<span><span style="color:var(--red);font-weight:700;">B</span>: ' + d.B + ' (' + pctB + '%)</span>' +
            '<span><span style="color:var(--accent);font-weight:700;">C</span>: ' + d.C + ' (' + pctC + '%)</span>' +
            '<span><span style="color:var(--accent2);font-weight:700;">D</span>: ' + d.D + ' (' + pctD + '%)</span>' +
            '</div></div>';
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

          if (inMetadata && line.startsWith('nombre,') ||
              line.startsWith('fecha,') ||
              line.startsWith('periodo,') ||
              line.startsWith('numP,') ||
              line.startsWith('numE,') ||
              line.startsWith('sistemaCalif,') ||
              line.startsWith('notaMaxima,') ||
              line.startsWith('notaAprobacion,') ||
              line.startsWith('pesoMode,') ||
              line.startsWith('pesosPreguntas,') ||
              line.startsWith('claveRespuestas,')) {
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

          if (inEstudiantes && line.startsWith('#')) {
            const parts = line.substring(1).split('|');
            const num = parseInt(parts[0], 10);
            if (!isNaN(num) && parts.length >= 4) {
              const nombre = parts[1] || '';
              const respuestasStr = parts[2] || '';
              const respuestas = respuestasStr.split('|').map(r => r && r !== '-' ? r : '');
              const calif = parts[3]?.trim() === 'Si';
              estudiantesData.push({ nombre, respuestas, calificados: calif });
            }
          }
        }

        if (!metadata.nombre || !metadata.numP || !metadata.claveRespuestas) {
          throw new Error('El archivo CSV no tiene el formato esperado. Falta metadata.');
        }

        const evaluacion = {
          nombre: metadata.nombre,
          fecha: metadata.fecha || '',
          periodo: metadata.periodo || '',
          numP: metadata.numP,
          numE: metadata.numE || estudiantesData.length,
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
