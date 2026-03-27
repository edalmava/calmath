import { abrirDB, dbGuardar, dbListar, dbEliminar, dbObtenerSettings, dbGuardarSettings } from '../db/indexedDB.js';
import { dbGuardarBorrador, dbObtenerBorrador, dbEliminarBorrador } from '../db/draft.js';
import { dbGuardarFoto, dbObtenerFoto, dbEliminarFotosByEval } from '../db/photos.js';
import { getState, setState } from './state.js';
import { pesoTotal, calcNota, notaMinima, notaMaxima, notaAprobacion } from './calification.js';
import { irPaso2, selClave, actualizarPeso, bindPaso2Events, irPaso3, irPaso4, setStep, metaHTML, reiniciar, importarEstudiantes } from './steps.js';
import { buildStudentNav, loadStudent, renderFotoZoneHTML, bindFotoZone, bindStuNameInput, bindPaso3Events, procesarFoto, eliminarFoto, abrirLightbox, cerrarLightbox, selRespEstu, calificarEstudiante, renderDraftProgress, renderPesoSummary, distribuirPesosIgual, handleStudentKey } from './render.js';
import { showView, toast, renderHistorial, mostrarResumen, pedirBorrar, cerrarModal, confirmarBorrar, abrirModalSettings, cerrarModalSettings, guardarSettings, cargarSettings, exportarCSV, escapeHtml, importarEvaluacion } from './views.js';
import { bindHtmlEvents } from './bindHtmlEvents.js';

window.abrirDB = abrirDB;
window.dbGuardar = dbGuardar;
window.dbListar = dbListar;
window.dbEliminar = dbEliminar;
window.dbObtenerSettings = dbObtenerSettings;
window.dbGuardarSettings = dbGuardarSettings;
window.dbGuardarFoto = dbGuardarFoto;
window.dbObtenerFoto = dbObtenerFoto;
window.dbEliminarFotosByEval = dbEliminarFotosByEval;
window.dbGuardarBorrador = dbGuardarBorrador;
window.dbObtenerBorrador = dbObtenerBorrador;
window.dbEliminarBorrador = dbEliminarBorrador;

window.getState = getState;
window.setState = setState;

window.irPaso2 = irPaso2;
window.selClave = selClave;
window.actualizarPeso = actualizarPeso;
window.bindPaso2Events = bindPaso2Events;
window.actualizarPeso = actualizarPeso;
window.irPaso3 = irPaso3;
window.irPaso4 = irPaso4;
window.setStep = setStep;
window.metaHTML = metaHTML;
window.reiniciar = reiniciar;
window.importarEstudiantes = importarEstudiantes;

window.buildStudentNav = buildStudentNav;
window.loadStudent = loadStudent;
window.renderFotoZoneHTML = renderFotoZoneHTML;
window.bindFotoZone = bindFotoZone;
window.bindStuNameInput = bindStuNameInput;
window.bindPaso3Events = bindPaso3Events;
window.procesarFoto = procesarFoto;
window.eliminarFoto = eliminarFoto;
window.abrirLightbox = abrirLightbox;
window.cerrarLightbox = cerrarLightbox;
window.selRespEstu = selRespEstu;
window.calificarEstudiante = calificarEstudiante;
window.renderDraftProgress = renderDraftProgress;
window.renderPesoSummary = renderPesoSummary;
window.distribuirPesosIgual = distribuirPesosIgual;
window.handleStudentKey = handleStudentKey;

window.showView = showView;
window.toast = toast;
window.renderHistorial = renderHistorial;
window.mostrarResumen = mostrarResumen;
window.pedirBorrar = pedirBorrar;
window.cerrarModal = cerrarModal;
window.confirmarBorrar = confirmarBorrar;

window.calcNota = calcNota;
window.pesoTotal = pesoTotal;
window.notaMinima = notaMinima;
window.notaMaxima = notaMaxima;
window.notaAprobacion = notaAprobacion;

window.abrirModalSettings = abrirModalSettings;
window.cerrarModalSettings = cerrarModalSettings;
window.guardarSettings = guardarSettings;
window.exportarCSV = exportarCSV;
window.escapeHtml = escapeHtml;
window.importarEvaluacion = importarEvaluacion;

window.setPesoMode = function(mode) {
  setState({ pesoMode: mode });
  document.getElementById('btnPesoIgual').classList.toggle('pm-active', mode === 'igual');
  document.getElementById('btnPesoDif').classList.toggle('pm-active', mode === 'diferente');
  const np = parseInt(document.getElementById('numPreguntas').value) || 0;
  const pt = pesoTotal();
  const vp = np > 0 ? (pt / np).toFixed(4) : '-';
  document.getElementById('pesoModeDesc').innerHTML = mode === 'igual'
    ? `Todas las preguntas valen lo mismo: <strong style="color:var(--accent2)">${vp} puntos</strong> cada una (suma total: ${pt}).`
    : `Podras asignar un valor individual a cada pregunta. Valor por defecto: <strong style="color:var(--accent2)">${vp} puntos</strong> (suma total debe ser ${pt}).`;
  actualizarInfo();
};

window.setSistemaCalif = function(sistema) {
  setState({ sistemaCalif: sistema });
  document.getElementById('btnCalif1a5').classList.toggle('pm-active', sistema === '1a5');
  document.getElementById('btnCalif0a5').classList.toggle('pm-active', sistema === '0a5');
  document.getElementById('califDesc').innerHTML = sistema === '1a5'
    ? 'Nota minima <strong style="color:var(--accent2)">1.0</strong>, maxima <strong style="color:var(--accent2)">5.0</strong>. Formula: <strong>1 + Σ(aciertos × peso)</strong>'
    : 'Nota minima <strong style="color:var(--accent2)">0.0</strong>, maxima <strong style="color:var(--accent2)">5.0</strong>. Formula: <strong>Σ(aciertos × peso)</strong>';
  window.setPesoMode(getState().pesoMode);
};

function actualizarInfo() {
  const np = parseInt(document.getElementById('numPreguntas').value);
  const pt = pesoTotal();
  if (np > 0) {
    document.getElementById('valorPregunta').textContent = (pt / np).toFixed(4);
    document.getElementById('notaMinLabel').textContent = getState().sistemaCalif === '1a5' ? '1.0' : '0.0';
    document.getElementById('infoCalculo').classList.remove('hidden');
  } else {
    document.getElementById('infoCalculo').classList.add('hidden');
  }
}

window.actualizarInfo = actualizarInfo;

document.getElementById('numPreguntas').addEventListener('input', () => {
  actualizarInfo();
  window.setPesoMode(getState().pesoMode);
});
document.getElementById('numEstudiantes').addEventListener('input', actualizarInfo);
document.getElementById('fechaPrueba').value = new Date().toISOString().split('T')[0];

window.cerrarModalDet = function(e) {
  if (e && e.target !== document.getElementById('modalDet')) return;
  document.getElementById('modalDet').classList.add('hidden');
  document.body.style.overflow = '';
  const fs = document.getElementById('detFotoSection');
  if (fs) fs.remove();
  window.detEval = null;
};

window.detEval = null;
window.detIdx = 0;
window.detFotoURLs = {};

window.abrirModalDet = async function(id) {
  try {
    const evals = await dbListar();
    const ev = evals.find(e => e.id === id);
    if (!ev) return;
    window.detEval = ev;
    window.detIdx = 0;
    Object.values(window.detFotoURLs).forEach(u => URL.revokeObjectURL(u));
    window.detFotoURLs = {};
    document.getElementById('detEvalNombre').textContent =
      `${ev.nombre}  ·  Periodo ${ev.periodo}  ·  ${ev.fecha ? new Date(ev.fecha + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }) : ''}`;
    window.renderDetNav();
    await window.renderDetEstudiante(0);
    document.getElementById('modalDet').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  } catch (e) {
    toast('Error al abrir detalle: ' + e.message, true);
  }
};

window.renderDetEstudiante = async function(idx) {
  const ev = window.detEval;
  const resp = ev.estudiantesRespuestas[idx];
  const clave = ev.claveRespuestas;
  const nombre = ev.estudiantesNombres[idx];
  const pesos = ev.pesosPreguntas || new Array(ev.numP).fill((ev.sistemaCalif === '0a5' ? 5 : 4) / ev.numP);
  const evPesoMode = ev.pesoMode || 'igual';
  const evCalif = ev.sistemaCalif || ev.evalMeta?.sistemaCalif || '1a5';
  const evNotaMin = evCalif === '0a5' ? 0 : 1;

  let sumaPesos = 0;
  for (let i = 0; i < ev.numP; i++) {
    if (resp[i] === clave[i]) sumaPesos += pesos[i];
  }
  const notaBruta = evCalif === '0a5' ? sumaPesos : 1 + sumaPesos;
  const evMaxNota = ev.notaMaxima || 5;
  const nota = Math.min(evMaxNota, Math.max(evNotaMin, notaBruta));
  const aciertos = resp.filter((r, i) => r === clave[i]).length;
  const pct = ((aciertos / ev.numP) * 100).toFixed(0);
  const notaAprueba = ev.notaAprobacion || 3;
  const barColor = nota >= notaAprueba ? 'var(--green)' : nota >= notaAprueba - 1 ? 'var(--accent)' : 'var(--red)';

  document.getElementById('detNombre').textContent = nombre;
  document.getElementById('detMeta').innerHTML = `
    <span>Aciertos: <strong style="color:var(--green)">${aciertos}</strong></span>
    <span>Errores: <strong style="color:var(--red)">${ev.numP - aciertos}</strong></span>
    <span>${pct}% de acierto</span>
    <span>Preguntas: ${ev.numP}</span>
    ${evPesoMode === 'diferente' ? '<span style="color:var(--accent2)">Pesos individuales</span>' : ''}`;

  document.getElementById('detNotaBox').innerHTML = `
    <div class="modal-det-nota-val" style="color:${barColor}">${nota.toFixed(1)}</div>
    <div class="result-bar-wrap" style="width:80px;margin:8px auto 4px;">
      <div class="result-bar" style="width:${pct}%;background:${barColor};"></div>
    </div>
    <div class="modal-det-nota-sub">${nota >= notaAprueba ? 'Aprobo' : 'Reprobo'}</div>`;

  const grid = document.getElementById('detRespGrid');
  grid.innerHTML = '';
  for (let i = 0; i < ev.numP; i++) {
    const r = resp[i], c = clave[i], ok = r === c;
    const item = document.createElement('div');
    item.className = `resp-item ${ok ? 'resp-ok' : 'resp-err'}`;
    let pipsHtml = '';
    ['A', 'B', 'C', 'D'].forEach(o => {
      let cls = 'resp-pip';
      if (o === r && o === c) cls += ' pip-correct';
      else if (o === r && o !== c) cls += ' pip-wrong';
      else if (o === c) cls += ' pip-show';
      pipsHtml += `<div class="${cls}">${o}</div>`;
    });
    const pesoTag = evPesoMode === 'diferente'
      ? `<span style="color:var(--border);float:right;font-size:0.62rem;">${pesos[i].toFixed(3)} pts</span>` : '';
    item.innerHTML = `
      <div class="resp-item-num">${ok ? '✓' : '✗'} Pregunta ${i + 1} ${pesoTag}</div>
      <div class="resp-item-opts">${pipsHtml}</div>
      ${!ok ? `<div style="font-size:0.65rem;color:var(--muted);margin-top:6px;">Marcado: <strong style="color:var(--red)">${r || '-'}</strong> - Correcta: <strong style="color:var(--green)">${c}</strong></div>` : ''}`;
    grid.appendChild(item);
  }

  const hasFotoMeta = ev.fotosMeta && ev.fotosMeta[idx];
  let fotoHTML = '';
  if (hasFotoMeta) {
    if (!window.detFotoURLs[idx]) {
      try {
        const fotoReg = await dbObtenerFoto(ev.id, idx);
        if (fotoReg?.blob) window.detFotoURLs[idx] = URL.createObjectURL(fotoReg.blob);
      } catch (_) { }
    }
    if (window.detFotoURLs[idx]) {
      fotoHTML = `<div class="det-foto-wrap">
        <div class="det-foto-title">Foto del examen</div>
        <img class="det-foto-img" src="${window.detFotoURLs[idx]}"
          alt="Examen de ${nombre}"/>
        <div style="font-size:0.68rem;color:var(--muted);margin-top:6px;">
          ${hasFotoMeta.nombre}
        </div>
      </div>`;
    } else {
      fotoHTML = '<div class="det-foto-wrap"><div class="det-foto-none">Foto registrada pero no encontrada.</div></div>';
    }
  } else {
    fotoHTML = '<div class="det-foto-wrap"><div class="det-foto-none">Sin foto adjunta.</div></div>';
  }

  let fotoEl = document.getElementById('detFotoSection');
  if (!fotoEl) {
    fotoEl = document.createElement('div');
    fotoEl.id = 'detFotoSection';
    grid.parentNode.insertBefore(fotoEl, grid.nextSibling);
  }
  fotoEl.innerHTML = fotoHTML;
};

window.renderDetNav = function() {
  const ev = window.detEval;
  const nav = document.getElementById('detStuNav');
  nav.innerHTML = '';
  const pesos = ev.pesosPreguntas || new Array(ev.numP).fill((ev.sistemaCalif === '0a5' ? 5 : 4) / ev.numP);
  const evCalif = ev.sistemaCalif || ev.evalMeta?.sistemaCalif || '1a5';
  const evNotaMin = evCalif === '0a5' ? 0 : 1;
  ev.estudiantesNombres.forEach((nombre, i) => {
    const resp = ev.estudiantesRespuestas[i];
    const clave = ev.claveRespuestas;
    let suma = 0;
    for (let j = 0; j < ev.numP; j++) {
      if (resp[j] === clave[j]) suma += pesos[j];
    }
    const notaBruta = evCalif === '0a5' ? suma : 1 + suma;
    const evMaxNota = ev.notaMaxima || 5;
    const nota = Math.min(evMaxNota, Math.max(evNotaMin, notaBruta));
    const notaAprueba = ev.notaAprobacion || 3;
    const aprobado = nota >= notaAprueba;
    const hasFoto = ev.fotosMeta && ev.fotosMeta[i];
    const btn = document.createElement('button');
    btn.className = `det-stu-btn ${aprobado ? 'det-aprobado' : 'det-reprobado'}${i === window.detIdx ? ' det-active' : ''}`;
    btn.title = nombre;
    btn.textContent = (hasFoto ? '📷 ' : '') + (nombre.length > 13 ? nombre.slice(0, 12) + '...' : nombre);
    btn.onclick = () => { window.detIdx = i; window.renderDetNav(); window.renderDetEstudiante(i); };
    nav.appendChild(btn);
  });
};

async function autoguardarBorrador() {
  const state = getState();
  if (state.autoguardando) return;
  setState({ autoguardando: true });
  try {
    const snapshot = {
      evalMeta: { ...state.evalMeta },
      numP: state.numP,
      numE: state.numE,
      valPregunta: state.valPregunta,
      pesoMode: state.pesoMode,
      pesosPreguntas: [...state.pesosPreguntas],
      sistemaCalif: state.sistemaCalif,
      claveRespuestas: [...state.claveRespuestas],
      estudiantesRespuestas: state.estudiantesRespuestas.map(r => [...(r || [])]),
      estudiantesNombres: [...state.estudiantesNombres],
      estudiantesCalificados: [...state.estudiantesCalificados],
      fotosMeta: state.estudiantesfotos.map(f => f ? { nombre: f.nombre, type: f.type } : null),
      savedAt: new Date().toISOString(),
    };
    await dbGuardarBorrador(snapshot);
    actualizarIndicadorGuardado();
  } catch (e) {
    console.error('Error al guardar borrador:', e);
  }
  setState({ autoguardando: false });
}

window.autoguardarBorrador = autoguardarBorrador;

function actualizarIndicadorGuardado() {
  const el = document.getElementById('draftSaveTime');
  if (el) {
    const now = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    el.textContent = `Autoguardado a las ${now}`;
  }
}

window.verificarBorrador = async function() {
  try {
    const draft = await dbObtenerBorrador();
    if (!draft || !draft.numP) return;
    const fechaLocal = draft.evalMeta?.fecha
      ? new Date(draft.evalMeta.fecha + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
      : '-';
    const calificados = (draft.estudiantesCalificados || []).filter(Boolean).length;
    const savedAt = new Date(draft.savedAt).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    document.getElementById('recoveryMeta').innerHTML = `
      <span><strong>${escapeHtml(draft.evalMeta?.nombre) || '-'}</strong></span>
      <span class="periodo-pill">Periodo ${escapeHtml(draft.evalMeta?.periodo) || '-'}</span>
      <span>${fechaLocal}</span>
      <span>${draft.numP} preguntas</span>
      <span>${draft.numE} estudiantes</span>
      <span style="color:var(--green)">${calificados}/${draft.numE} calificados</span>
      <span style="color:var(--border)">Guardado: ${savedAt}</span>`;
    document.getElementById('modalRecovery').classList.remove('hidden');
  } catch (e) {
    console.error('Error al verificar borrador:', e);
  }
};

window.recuperarBorrador = async function() {
  try {
    const draft = await dbObtenerBorrador();
    if (!draft) return;
    document.getElementById('modalRecovery').classList.add('hidden');

    setState({
      evalMeta: draft.evalMeta || {},
      numP: draft.numP,
      numE: draft.numE,
      valPregunta: draft.valPregunta,
      pesoMode: draft.pesoMode || 'igual',
      pesosPreguntas: draft.pesosPreguntas || new Array(draft.numP).fill(pesoTotal() / draft.numP),
      sistemaCalif: draft.sistemaCalif || draft.evalMeta?.sistemaCalif || '1a5',
      claveRespuestas: draft.claveRespuestas,
      estudiantesRespuestas: draft.estudiantesRespuestas,
      estudiantesNombres: draft.estudiantesNombres,
      estudiantesCalificados: draft.estudiantesCalificados,
      estudiantesfotos: new Array(draft.numE).fill(null),
      yaGuardada: false,
    });

    document.getElementById('metaBanner3').innerHTML = metaHTML();
    renderDraftProgress();
    buildStudentNav();
    const primeroPendiente = getState().estudiantesCalificados.findIndex(c => !c);
    loadStudent(primeroPendiente >= 0 ? primeroPendiente : 0);
    setStep(3);
    toast('Borrador recuperado');
  } catch (e) {
    alert('Error al recuperar borrador: ' + e.message);
  }
};

window.descartarBorrador = function() {
  document.getElementById('modalRecovery').classList.add('hidden');
  dbEliminarBorrador().catch(() => { });
};

window.guardarEvaluacion = async function() {
  const { yaGuardada, evalMeta, numP, numE, valPregunta, pesoMode, pesosPreguntas, sistemaCalif, claveRespuestas, estudiantesRespuestas, estudiantesNombres, estudiantesCalificados, estudiantesfotos } = getState();
  if (yaGuardada) {
    toast('Ya fue guardada anteriormente');
    return;
  }

  const notas = Array.from({ length: numE }, (_, i) => {
    const resp_i = estudiantesRespuestas[i];
    const aciertos = resp_i.filter((r, j) => r === claveRespuestas[j]).length;
    return { nombre: estudiantesNombres[i], aciertos, nota: calcNota(resp_i) };
  });
  const fotosMeta = estudiantesfotos.map(f => f ? { nombre: f.nombre, type: f.type } : null);

  const registro = {
    ...evalMeta,
    numP,
    numE,
    valPregunta,
    pesoMode,
    pesosPreguntas: [...pesosPreguntas],
    sistemaCalif,
    claveRespuestas: [...claveRespuestas],
    estudiantesRespuestas: estudiantesRespuestas.map(r => [...r]),
    estudiantesNombres: [...estudiantesNombres],
    estudiantesCalificados: [...estudiantesCalificados],
    fotosMeta,
    notas,
    guardadoEn: new Date().toISOString(),
  };

  try {
    const newId = await dbGuardar(registro);
    setState({ evalId: newId });
    const fotoPromises = estudiantesfotos.map((f, i) =>
      f ? dbGuardarFoto(newId, i, f.blob, f.nombre) : Promise.resolve(),
    );
    await Promise.all(fotoPromises);
    await dbEliminarBorrador().catch(() => { });
    setState({ yaGuardada: true });
    const btn = document.getElementById('step4SaveBtn');
    btn.textContent = 'Guardada';
    btn.disabled = true;
    btn.style.opacity = '0.6';
    const conFotos = estudiantesfotos.filter(Boolean).length;
    toast('Evaluacion guardada' + (conFotos ? ' · ' + conFotos + ' foto(s) incluida(s)' : ''));
  } catch (e) {
    toast('Error al guardar: ' + e.message, true);
  }
};

abrirDB()
  .then(async () => {
    bindHtmlEvents();
    await cargarSettings();
    window.verificarBorrador();
  })
  .catch(e => toast('No se pudo inicializar la base de datos: ' + e.message, true));
