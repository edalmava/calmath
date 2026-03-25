import { getState, setState } from './state.js';
import { reiniciar } from './steps.js';

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
      lista.innerHTML = `<div class="hist-empty">
        <div class="hist-icon">📂</div>
        Aun no hay evaluaciones guardadas.
      </div>`;
      return;
    }
    evals.sort((a, b) => new Date(b.guardadoEn) - new Date(a.guardadoEn));
    lista.innerHTML = '';
    evals.forEach(ev => {
      const promNota = (ev.notas.reduce((s, n) => s + n.nota, 0) / ev.notas.length).toFixed(2);
      const aprobados = ev.notas.filter(n => n.nota >= 3).length;
      const promColor = promNota >= 3 ? 'var(--green)' : promNota >= 2 ? 'var(--accent)' : 'var(--red)';
      const fechaLocal = ev.fecha
        ? new Date(ev.fecha + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
        : '-';

      const card = document.createElement('div');
      card.className = 'eval-card';
      card.innerHTML = `
        <div class="eval-card-info">
          <div class="eval-card-title">
            ${ev.nombre}
            <span class="periodo-pill">Periodo ${ev.periodo}</span>
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
          <button class="btn btn-secondary" style="padding:7px 14px;font-size:0.75rem;" onclick="mostrarResumen(${ev.id})">Resumen</button>
          <button class="btn-ghost" style="padding:7px 14px;font-size:0.75rem;border-color:var(--accent2);color:var(--accent2);" onclick="abrirModalDet(${ev.id})">Respuestas</button>
          <button class="btn btn-danger" style="padding:7px 14px;font-size:0.75rem;" onclick="pedirBorrar(${ev.id},'${ev.nombre.replace(/'/g, "\\'")}')">🗑</button>
        </div>`;
      lista.appendChild(card);
    });
  } catch (e) {
    lista.innerHTML = `<div style="color:var(--red);padding:16px 0;">Error al cargar historial: ${e.message}</div>`;
  }
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
      const nota = Math.min(5, Math.max(evNotaMin, notaBruta));
      const aciertos = resp.filter((r, j) => r === ev.claveRespuestas[j]).length;
      return { nombre: ev.estudiantesNombres[i], aciertos, nota, aprobado: nota >= 3 };
    });

    const totalNota = resultados.reduce((s, r) => s + r.nota, 0);
    const aprobados = resultados.filter(r => r.aprobado).length;
    const prom = (totalNota / ev.numE).toFixed(2);
    const pctApr = ((aprobados / ev.numE) * 100).toFixed(0);
    const promColor = prom >= 3 ? 'var(--green)' : prom >= 2 ? 'var(--accent)' : 'var(--red)';
    const evPesoTotal = evCalif === '0a5' ? 5 : 4;
    const pesoLabel = evPesoMode === 'diferente'
      ? '<span style="color:var(--accent2)">Pesos individuales</span>'
      : `Peso uniforme: <strong>${(evPesoTotal / ev.numP).toFixed(4)}</strong>/pregunta`;
    const califLabel = evCalif === '0a5'
      ? '<span style="color:var(--accent)">Escala 0-5</span>'
      : '<span style="color:var(--accent)">Escala 1-5</span>';

    document.getElementById('rsmHeader').innerHTML = `
      <div class="rsm-title">${ev.nombre}</div>
      <div style="display:flex;gap:14px;flex-wrap:wrap;font-size:0.76rem;color:var(--muted);margin-top:6px;">
        <span class="periodo-pill">Periodo ${ev.periodo}</span>
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

    const tbody = document.getElementById('rsmBody');
    tbody.innerHTML = '';
    resultados.forEach((r, i) => {
      const barColor = r.nota >= 3 ? 'var(--green)' : r.nota >= 2 ? 'var(--accent)' : 'var(--red)';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="color:var(--muted)">${i + 1}</td>
        <td>${r.nombre}</td>
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
