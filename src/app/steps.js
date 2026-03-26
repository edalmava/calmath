import { getState, setState } from './state.js';
import { pesoTotal, notaAprobacion, notaMaxima } from './calification.js';
import { renderPesoSummary, buildStudentNav, loadStudent, renderDraftProgress } from './render.js';
import { escapeHtml } from './views.js';

export function setStep(n) {
  [1, 2, 3, 4].forEach(i => document.getElementById(`step${i}`).classList.toggle('hidden', i !== n));
  [1, 2, 3, 4].forEach(i => {
    const dot = document.getElementById(`dot${i}`);
    if (dot) {
      dot.className = 'step-dot' + (i < n ? ' done' : i === n ? ' active' : '');
    }
  });
}

export function metaHTML() {
  const { evalMeta, numP, numE, pesoMode, sistemaCalif } = getState();
  const fechaLocal = evalMeta.fecha
    ? new Date(evalMeta.fecha + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
    : '';
  const pesoInfo = pesoMode === 'igual'
    ? `Peso uniforme: <strong>${(pesoTotal() / numP).toFixed(4)}</strong>/pregunta`
    : '<span style="color:var(--accent2)">Pesos individuales</span>';
  const sc = sistemaCalif || '1a5';
  const califInfo = sc === '0a5'
    ? '<span style="color:var(--accent)">0-5</span>'
    : '<span style="color:var(--accent)">1-5</span>';
  return `
    <strong>${escapeHtml(evalMeta.nombre)}</strong>
    <span class="periodo-pill">Periodo ${escapeHtml(evalMeta.periodo)}</span>
    <span>${fechaLocal}</span>
    <span>${numP} preguntas</span>
    <span>${numE} estudiantes</span>
    <span>${pesoInfo}</span>
    <span>Escala: ${califInfo}</span>`;
}

export function irPaso2() {
  const nombre = document.getElementById('nombrePrueba').value.trim();
  const fecha = document.getElementById('fechaPrueba').value;
  const periodo = document.getElementById('periodoSel').value;
  const numP = parseInt(document.getElementById('numPreguntas').value);
  const numE = parseInt(document.getElementById('numEstudiantes').value);

  if (!nombre) {
    alert('Ingresa el nombre de la prueba.');
    return;
  }
  if (!fecha) {
    alert('Selecciona la fecha de la prueba.');
    return;
  }
  if (!periodo) {
    alert('Selecciona el periodo academico.');
    return;
  }
  if (!numP || numP < 1 || numP > 100) {
    alert('El numero de preguntas debe estar entre 1 y 100.');
    return;
  }
  if (!numE || numE < 1 || numE > 200) {
    alert('El numero de estudiantes debe estar entre 1 y 200.');
    return;
  }

  const { pesoMode, sistemaCalif } = getState();
  const valPregunta = pesoTotal() / numP;

  setState({
    evalMeta: { nombre, fecha, periodo, sistemaCalif },
    numP,
    numE,
    valPregunta,
    yaGuardada: false,
    evalId: null,
  });

  const pt = pesoTotal();
  const newPesos = new Array(numP).fill(parseFloat((pt / numP).toFixed(6)));
  const newClave = new Array(numP).fill(null);
  const newResp = Array.from({ length: numE }, () => new Array(numP).fill(null));
  const newNombres = Array.from({ length: numE }, (_, i) => `Estudiante ${i + 1}`);
  const newCalificados = new Array(numE).fill(false);
  const newFotos = new Array(numE).fill(null);

  setState({
    pesosPreguntas: newPesos,
    claveRespuestas: newClave,
    estudiantesRespuestas: newResp,
    estudiantesNombres: newNombres,
    estudiantesCalificados: newCalificados,
    estudiantesfotos: newFotos,
  });

  const grid = document.getElementById('claveGrid');
  grid.innerHTML = '';
  for (let i = 0; i < numP; i++) {
    const item = document.createElement('div');
    item.className = 'answer-item';
    item.id = 'clave_q' + i;
    const pesoDefault = (pt / numP).toFixed(4);
    const pesoField = pesoMode === 'diferente' ? `
      <div class="peso-field">
        <label style="font-size:0.63rem;margin-bottom:3px;">Valor (puntos)</label>
        <input type="number" class="peso-input" id="peso_q${i}"
          min="0" max="${pt}" step="0.0001"
          value="${pesoDefault}" />
      </div>` : '';
    item.innerHTML = `<div class="q-num">Pregunta ${i + 1}</div>
      <div class="options" id="clave_q${i}">
        ${['A', 'B', 'C', 'D'].map(o => '<button class="opt-btn">' + o + '</button>').join('')}
      </div>${pesoField}`;
    grid.appendChild(item);
  }

  document.getElementById('metaBanner2').innerHTML = metaHTML();
  renderPesoSummary();
  bindPaso2Events();
  setStep(2);
}

export function bindPaso2Events() {
  const claveGrid = document.getElementById('claveGrid');
  if (!claveGrid) return;
  claveGrid.querySelectorAll('.opt-btn').forEach(btn => {
    btn.onclick = () => {
      const match = btn.textContent.match(/^([A-D])$/);
      if (!match) return;
      const qi = parseInt(btn.closest('.answer-item').id.replace('clave_q', ''));
      window.selClave(qi, match[1], btn);
    };
  });
  claveGrid.querySelectorAll('.peso-input').forEach(inp => {
    inp.oninput = () => {
      const qi = parseInt(inp.id.replace('peso_q', ''));
      window.actualizarPeso(qi, inp);
    };
  });
}

export function selClave(qi, opt, btn) {
  document.getElementById('clave_q' + qi).querySelectorAll('.opt-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  const { claveRespuestas } = getState();
  const newClave = [...claveRespuestas];
  newClave[qi] = opt;
  setState({ claveRespuestas: newClave });
}

export function actualizarPeso(qi, input) {
  const val = parseFloat(input.value);
  const pt = pesoTotal();
  const defaultVal = parseFloat((pt / getState().numP).toFixed(6));
  const { pesosPreguntas } = getState();
  const newPesos = [...pesosPreguntas];
  if (isNaN(val) || val < 0) {
    newPesos[qi] = 0;
  } else {
    newPesos[qi] = val;
  }
  setState({ pesosPreguntas: newPesos });
  input.classList.toggle('peso-modified', Math.abs(val - defaultVal) > 0.00005);
  renderPesoSummary();
}

export function irPaso3() {
  const { claveRespuestas, pesoMode, pesosPreguntas } = getState();
  if (claveRespuestas.includes(null)) {
    alert('Debes seleccionar la respuesta correcta de TODAS las preguntas.');
    return;
  }
  if (pesoMode === 'diferente') {
    const pt = pesoTotal();
    const total = pesosPreguntas.reduce((s, p) => s + p, 0);
    if (Math.abs(total - pt) > 0.01) {
      alert(`Los pesos de las preguntas suman ${total.toFixed(4)}, pero deben sumar exactamente ${pt}.`);
      return;
    }
  }
  document.getElementById('metaBanner3').innerHTML = metaHTML();
  renderDraftProgress();
  buildStudentNav();
  loadStudent(0);
  setStep(3);
}

export function irPaso4() {
  const { numE, numP, estudiantesRespuestas, estudiantesNombres, pesosPreguntas, claveRespuestas, sistemaCalif } = getState();

  document.getElementById('metaBanner4').innerHTML = metaHTML();
  const tbody = document.getElementById('summaryBody');
  tbody.innerHTML = '';
  let totalNota = 0;
  let aprobados = 0;

  for (let i = 0; i < numE; i++) {
    const resp_i = estudiantesRespuestas[i] || [];
    let sumaPesos = 0;
    for (let j = 0; j < numP; j++) {
      if (resp_i[j] === claveRespuestas[j]) sumaPesos += pesosPreguntas[j];
    }
    const notaBruta = sistemaCalif === '0a5' ? sumaPesos : 1 + sumaPesos;
    const maxNota = notaMaxima();
    const nota = Math.min(maxNota, Math.max(sistemaCalif === '0a5' ? 0 : 1, notaBruta));
    const aciertos = resp_i.filter((r, j) => r === claveRespuestas[j]).length;
    const errores = numP - aciertos;
    const notaAprueba = notaAprobacion();
    const aprobado = nota >= notaAprueba;
    totalNota += nota;
    if (aprobado) aprobados++;
    const barColor = nota >= notaAprueba ? 'var(--green)' : nota >= notaAprueba - 1 ? 'var(--accent)' : 'var(--red)';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="color:var(--muted)">${i + 1}</td>
      <td>${estudiantesNombres[i]}</td>
      <td><span style="color:var(--green);font-weight:700;">${aciertos}</span></td>
      <td><span style="color:var(--red);font-weight:700;">${errores}</span></td>
      <td>
        <span style="color:${barColor};font-family:'Syne',sans-serif;font-weight:800;font-size:1.05rem;">${nota.toFixed(1)}</span>
        <div class="result-bar-wrap" style="margin-top:3px;width:90px;">
          <div class="result-bar" style="width:${((aciertos / numP) * 100).toFixed(0)}%;background:${barColor};"></div>
        </div>
      </td>
      <td><span class="tag ${aprobado ? 'tag-green' : 'tag-red'}">${aprobado ? 'Aprobo' : 'Reprobo'}</span></td>`;
    tbody.appendChild(tr);
  }

  const prom = (totalNota / numE).toFixed(2);
  const pctApr = ((aprobados / numE) * 100).toFixed(0);
  const promColor = prom >= 3 ? 'var(--green)' : prom >= 2 ? 'var(--accent)' : 'var(--red)';

  document.getElementById('statsBlock').innerHTML = `
    <div class="stat-chip">
      <div class="stat-chip-label">Promedio grupo</div>
      <div class="stat-chip-val" style="color:${promColor}">${prom}</div>
    </div>
    <div class="stat-chip">
      <div class="stat-chip-label">Aprobados</div>
      <div class="stat-chip-val" style="color:var(--green)">${aprobados}/${numE}</div>
    </div>
    <div class="stat-chip">
      <div class="stat-chip-label">% Aprobacion</div>
      <div class="stat-chip-val" style="color:var(--accent2)">${pctApr}%</div>
    </div>`;

  const btn = document.getElementById('step4SaveBtn');
  btn.textContent = 'Guardar evaluacion';
  btn.disabled = false;
  btn.style.opacity = '1';
  setState({ yaGuardada: false });

  setStep(4);
}

export function reiniciar() {
  const { estudiantesfotos } = getState();
  estudiantesfotos.forEach(f => {
    if (f?.objectURL) URL.revokeObjectURL(f.objectURL);
  });

  setState({
    claveRespuestas: [],
    estudiantesRespuestas: [],
    estudiantesNombres: [],
    estudiantesCalificados: [],
    estudiantesfotos: [],
    pesosPreguntas: [],
    evalId: null,
    pesoMode: 'igual',
    sistemaCalif: '1a5',
    evalMeta: { nombre: '', fecha: '', periodo: '' },
    yaGuardada: false,
  });

  window.dbEliminarBorrador?.()?.catch(() => {});
  document.getElementById('numPreguntas').value = '';
  document.getElementById('numEstudiantes').value = '';
  document.getElementById('nombrePrueba').value = '';
  document.getElementById('periodoSel').value = '';
  document.getElementById('fechaPrueba').value = new Date().toISOString().split('T')[0];
  document.getElementById('infoCalculo').classList.add('hidden');
  document.getElementById('btnPesoIgual').classList.add('pm-active');
  document.getElementById('btnPesoDif').classList.remove('pm-active');
  document.getElementById('pesoModeDesc').innerHTML =
    'Todas las preguntas valen lo mismo: <strong style="color:var(--accent2)">4 / N</strong> puntos cada una.';
  document.getElementById('btnCalif1a5').classList.add('pm-active');
  document.getElementById('btnCalif0a5').classList.remove('pm-active');
  document.getElementById('califDesc').innerHTML =
    'La nota minima es <strong style="color:var(--accent2)">1.0</strong> y la maxima es <strong style="color:var(--accent2)">5.0</strong>.';
  setStep(1);
}
