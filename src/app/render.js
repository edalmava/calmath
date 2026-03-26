import { getState, setState } from './state.js';
import { calcNota, calcAciertos, notaAprobacion } from './calification.js';

export function buildStudentNav() {
  const { numE, estudiantesCalificados, estudiantesNombres } = getState();
  const nav = document.getElementById('studentNav');
  if (!nav) return;
  nav.innerHTML = '';
  for (let i = 0; i < numE; i++) {
    const btn = document.createElement('button');
    const isActive = false;
    const isGraded = estudiantesCalificados[i];
    btn.className = `stu-tab${isActive ? ' active' : ''}${isGraded ? ' graded' : ''}`;
    btn.id = `stuTab_${i}`;
    btn.textContent = `E${i + 1}`;
    btn.title = estudiantesNombres[i];
    btn.onclick = () => loadStudent(i);
    nav.appendChild(btn);
  }
}

export function loadStudent(idx) {
  const state = getState();
  const { numP, numE, opts, claveRespuestas } = state;

  setState({ currentStudent: idx });

  const current = getState();
  document.querySelectorAll('.stu-tab').forEach((b, i) => {
    const isActive = i === idx;
    const isGraded = current.estudiantesCalificados[i];
    b.className = 'stu-tab' + (isActive ? ' active' : '') + (isGraded ? ' graded' : '');
  });

  const panel = document.getElementById('studentPanel');
  const cal = current.estudiantesCalificados[idx];

  let html = `
    <div style="display:flex;gap:18px;flex-wrap:wrap;margin-bottom:16px;">
      <div style="flex:1;min-width:200px;">
        <label>Nombre del estudiante</label>
        <input type="text" id="stuName" value="${current.estudiantesNombres[idx].replace(/"/g, '&quot;')}" />
      </div>
      <div style="flex:1;min-width:200px;">
        <div class="foto-section-title">Foto del examen</div>
        <div id="fotoContainer_${idx}">${renderFotoZoneHTML(idx)}</div>
      </div>
    </div>
    <div class="answer-grid" id="stuGrid" tabindex="0" onkeydown="handleStudentKey(event)">`;

  for (let i = 0; i < numP; i++) {
    const resp = current.estudiantesRespuestas[idx][i];
    const correcta = claveRespuestas[i];
    html += `<div class="answer-item">
      <div class="q-num">Pregunta ${i + 1}</div>
      <div class="options" id="stu_q${i}">
        ${opts.map(o => {
    let cls = 'opt-btn';
    if (cal) {
      if (o === resp && o === correcta) cls += ' correct-sel';
      else if (o === resp && o !== correcta) cls += ' wrong-sel';
      else if (o === correcta) cls += ' show-correct';
    } else {
      if (o === resp) cls += ' selected';
    }
    return '<button class="' + cls + '">' + o + '</button>';
  }).join('')}
      </div>
    </div>`;
  }
  html += '</div>';

  if (cal) {
    const resp_idx = current.estudiantesRespuestas[idx];
    const aciertos = calcAciertos(resp_idx);
    const nota = calcNota(resp_idx);
    const pct = ((aciertos / numP) * 100).toFixed(0);
    const notaAprueba = notaAprobacion();
    const barColor = nota >= notaAprueba ? 'var(--green)' : nota >= notaAprueba - 1 ? 'var(--accent)' : 'var(--red)';
    html += `<hr class="divider">
    <div class="result-card">
      <div class="result-left">
        <div style="font-size:0.7rem;color:var(--muted);margin-bottom:7px;text-transform:uppercase;">Nota final</div>
        <div class="nota-badge" style="color:${barColor}">${nota.toFixed(1)}</div>
        <div style="font-size:0.7rem;color:var(--muted);margin-top:7px;">${aciertos} / ${numP} correctas</div>
        <div class="result-bar-wrap" style="margin-top:12px;">
          <div class="result-bar" style="width:${pct}%;background:${barColor};"></div>
        </div>
        <div style="font-size:0.68rem;color:var(--muted);">${pct}% de acierto</div>
      </div>
      <div class="result-right">
        <div class="result-legend">
          <div><span class="legend-dot" style="background:var(--green)"></span>Correcto</div>
          <div><span class="legend-dot" style="background:var(--red)"></span>Incorrecto</div>
          <div><span class="legend-dot" style="background:rgba(86,211,100,0.4)"></span>Correcta no marcada</div>
        </div>
        <div style="font-size:0.77rem;color:var(--muted);line-height:2;">
          ${buildDetalleTexto(idx)}
        </div>
      </div>
    </div>`;
  }

  html += '<div class="actions-row">';
  if (!cal) html += '<button class="btn btn-success" id="calificarBtn">Calificar</button>';
  if (idx < numE - 1) html += '<button class="btn btn-secondary" id="siguienteBtn">Siguiente</button>';
  if (current.estudiantesCalificados.every(Boolean)) html += '<button class="btn btn-primary" id="resumenBtn">Ver resumen</button>';
  html += '</div>';

  panel.innerHTML = html;
  bindFotoZone(idx);
  bindStuNameInput(idx);
  bindPaso3Events(idx);
  setTimeout(() => {
    const grid = document.getElementById('stuGrid');
    if (grid) grid.focus();
  }, 10);
}

export function bindPaso3Events(idx) {
  const panel = document.getElementById('studentPanel');
  if (!panel) return;

  const grid = panel.querySelector('#stuGrid');
  if (grid) {
    grid.querySelectorAll('.answer-item').forEach(item => {
      const qi = parseInt(item.querySelector('.options').id.replace('stu_q', ''));
      item.querySelectorAll('.opt-btn').forEach(btn => {
        btn.onclick = () => {
          const opt = btn.textContent;
          window.selRespEstu(qi, opt, btn);
        };
      });
    });
  }

  const calificarBtn = document.getElementById('calificarBtn');
  if (calificarBtn) calificarBtn.onclick = () => calificarEstudiante();

  const siguienteBtn = document.getElementById('siguienteBtn');
  if (siguienteBtn) siguienteBtn.onclick = () => loadStudent(idx + 1);

  const resumenBtn = document.getElementById('resumenBtn');
  if (resumenBtn) resumenBtn.onclick = () => window.irPaso4();

  const fotoThumb = document.getElementById('fotoThumb_' + idx);
  if (fotoThumb) {
    const { estudiantesfotos } = getState();
    const foto = estudiantesfotos[idx];
    if (foto) {
      fotoThumb.onclick = () => abrirLightbox(foto.objectURL, foto.nombre);
    }
  }

  const fotoDel = document.getElementById('fotoDel_' + idx);
  if (fotoDel) {
    fotoDel.onclick = (e) => {
      e.stopPropagation();
      eliminarFoto(idx, e);
    };
  }
}

export function renderFotoZoneHTML(idx) {
  const { estudiantesfotos } = getState();
  const foto = estudiantesfotos[idx];
  if (foto) {
    return '<div class="foto-thumb-wrap" id="fotoThumb_' + idx + '">' +
      '<img class="foto-thumb" src="' + foto.objectURL + '" alt="Examen" />' +
      '<div class="foto-thumb-badge">' +
      '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:120px;">' + foto.nombre + '</span>' +
      '<button class="foto-del-btn" id="fotoDel_' + idx + '">x</button>' +
      '</div>' +
      '</div>';
  }
  return '<div class="foto-zone" id="fotoZone_' + idx + '">' +
    '<input type="file" id="fotoInput_' + idx + '" accept="image/*" />' +
    '<div class="foto-zone-label">' +
    '<div class="foto-zone-icon">📋</div>' +
    '<div>Arrastra o haz clic para subir la foto del examen</div>' +
    '<div style="font-size:0.68rem;margin-top:4px;color:var(--border)">JPG, PNG, WEBP</div>' +
    '</div>' +
    '</div>';
}

export function bindFotoZone(idx) {
  const input = document.getElementById('fotoInput_' + idx);
  if (!input) return;
  input.addEventListener('change', e => {
    if (e.target.files[0]) procesarFoto(idx, e.target.files[0]);
  });
  const zone = document.getElementById('fotoZone_' + idx);
  if (!zone) return;
  zone.addEventListener('dragover', e => {
    e.preventDefault();
    zone.classList.add('dragover');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) procesarFoto(idx, file);
    else window.toast('Solo se aceptan archivos de imagen', true);
  });
}

export function bindStuNameInput(idx) {
  const input = document.getElementById('stuName');
  if (!input) return;
  input.addEventListener('change', e => {
    const nombre = e.target.value;
    const state = getState();
    const newNombres = [...state.estudiantesNombres];
    newNombres[idx] = nombre;
    setState({ estudiantesNombres: newNombres });
    const tab = document.getElementById('stuTab_' + idx);
    if (tab) tab.title = nombre;
  });
}

export function procesarFoto(idx, file) {
  const state = getState();
  if (state.estudiantesfotos[idx]?.objectURL) {
    URL.revokeObjectURL(state.estudiantesfotos[idx].objectURL);
  }
  const objectURL = URL.createObjectURL(file);
  const newFotos = [...state.estudiantesfotos];
  newFotos[idx] = { blob: file, nombre: file.name, objectURL };
  setState({ estudiantesfotos: newFotos });
  const container = document.getElementById(`fotoContainer_${idx}`);
  if (container) {
    container.innerHTML = renderFotoZoneHTML(idx);
  }
  window.toast('Foto cargada');
}

export function eliminarFoto(idx, e) {
  e.stopPropagation();
  const state = getState();
  if (state.estudiantesfotos[idx]?.objectURL) {
    URL.revokeObjectURL(state.estudiantesfotos[idx].objectURL);
  }
  const newFotos = [...state.estudiantesfotos];
  newFotos[idx] = null;
  setState({ estudiantesfotos: newFotos });
  const container = document.getElementById(`fotoContainer_${idx}`);
  if (container) {
    container.innerHTML = renderFotoZoneHTML(idx);
    bindFotoZone(idx);
  }
}

export function buildDetalleTexto(idx) {
  const { numP, claveRespuestas, estudiantesRespuestas, pesoMode, pesosPreguntas } = getState();
  return Array.from({ length: numP }, (_, i) => {
    const r = estudiantesRespuestas[idx][i];
    const c = claveRespuestas[i];
    const pesoTag = pesoMode === 'diferente'
      ? ` <span style="color:var(--border)">(${pesosPreguntas[i].toFixed(3)})</span>` : '';
    return r === c
      ? `<span style="color:var(--green)">P${i + 1}${pesoTag}: ${r}</span>`
      : `<span style="color:var(--red)">P${i + 1}${pesoTag}: ${r || '-'}->${c}</span>`;
  }).join(' &nbsp; ');
}

export function abrirLightbox(src, nombre) {
  const lb = document.createElement('div');
  lb.className = 'lightbox-bg';
  lb.id = 'lightboxBg';
  lb.onclick = e => {
    if (e.target === lb) cerrarLightbox();
  };
  lb.innerHTML = '<button class="lightbox-close" id="lightboxClose">x</button>' +
    '<img class="lightbox-img" src="' + src + '" alt="' + nombre + '" />' +
    '<div class="lightbox-caption">' + nombre + '</div>';
  document.body.appendChild(lb);
  document.body.style.overflow = 'hidden';
  document.getElementById('lightboxClose').onclick = () => cerrarLightbox();
}

export function cerrarLightbox() {
  document.getElementById('lightboxBg')?.remove();
  document.body.style.overflow = '';
}

export function selRespEstu(qi, opt, btn) {
  const { currentStudent, estudiantesCalificados, estudiantesRespuestas } = getState();
  if (estudiantesCalificados[currentStudent]) return;
  document.getElementById(`stu_q${qi}`).querySelectorAll('.opt-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  const newResp = [...estudiantesRespuestas];
  newResp[currentStudent] = [...newResp[currentStudent]];
  newResp[currentStudent][qi] = opt;
  setState({ estudiantesRespuestas: newResp });
}

export function calificarEstudiante() {
  const { currentStudent, estudiantesNombres, estudiantesCalificados } = getState();
  const nombre = document.getElementById('stuName').value.trim();
  if (nombre) {
    const newNombres = [...estudiantesNombres];
    newNombres[currentStudent] = nombre;
    setState({ estudiantesNombres: newNombres });
  }
  const newCalificados = [...estudiantesCalificados];
  newCalificados[currentStudent] = true;
  setState({ estudiantesCalificados: newCalificados });
  buildStudentNav();
  loadStudent(currentStudent);
  renderDraftProgress();
  window.autoguardarBorrador();
}

export function renderDraftProgress() {
  const { numE, estudiantesCalificados } = getState();
  const el = document.getElementById('draftProgressBar');
  if (!el) return;
  const calificados = estudiantesCalificados.filter(Boolean).length;
  const pct = numE > 0 ? Math.round((calificados / numE) * 100) : 0;
  el.innerHTML = `
    <div class="draft-banner">
      <div class="draft-banner-icon">💾</div>
      <div class="draft-banner-text">
        <strong>Autoguardado activo</strong>
        <div class="draft-save-indicator">
          <div class="draft-save-dot"></div>
          <span id="draftSaveTime">Esperando...</span>
        </div>
      </div>
    </div>
    <div class="draft-progress">
      <span style="white-space:nowrap;color:var(--green);font-weight:700;">${calificados}/${numE}</span>
      <div class="draft-progress-bar-wrap">
        <div class="draft-progress-bar" style="width:${pct}%"></div>
      </div>
      <span style="white-space:nowrap;">${pct}% calificados</span>
    </div>`;
}

export function renderPesoSummary() {
  const { pesoMode, pesosPreguntas } = getState();
  let el = document.getElementById('pesoSummaryBar');
  if (pesoMode === 'igual') {
    if (el) el.remove();
    return;
  }
  const pt = 4;
  const total = pesosPreguntas.reduce((s, p) => s + p, 0);
  const totalRounded = Math.round(total * 10000) / 10000;
  const isOk = Math.abs(totalRounded - pt) < 0.005;
  const cls = isOk ? 'peso-sum-ok' : Math.abs(totalRounded - pt) < 0.1 ? 'peso-sum-warn' : 'peso-sum-err';
  const msg = isOk
    ? `Los pesos suman exactamente ${pt} puntos`
    : `Los pesos suman ${totalRounded.toFixed(4)} - deben sumar ${pt}`;

  if (!el) {
    el = document.createElement('div');
    el.id = 'pesoSummaryBar';
    el.className = 'peso-summary';
    const actRow = document.querySelector('#step2 .actions-row');
    actRow.parentNode.insertBefore(el, actRow);
  }
  el.innerHTML = '<span class="' + cls + '">' + msg + '</span>' +
    '<span style="color:var(--muted)">Suma actual: <strong style="color:var(--text)">' + totalRounded.toFixed(4) + '</strong></span>' +
    '<button style="margin-left:auto;padding:5px 14px;font-size:0.72rem;" class="btn-ghost" id="pesoResetBtn">Restablecer</button>';
  document.getElementById('pesoResetBtn').onclick = () => distribuirPesosIgual();
}

export function distribuirPesosIgual() {
  const { numP } = getState();
  const pt = 4;
  const base = parseFloat((pt / numP).toFixed(6));
  const newPesos = new Array(numP).fill(base);
  setState({ pesosPreguntas: newPesos });
  for (let i = 0; i < numP; i++) {
    const inp = document.getElementById(`peso_q${i}`);
    if (inp) {
      inp.value = (pt / numP).toFixed(4);
      inp.classList.remove('peso-modified');
    }
  }
  renderPesoSummary();
  window.toast('Pesos restablecidos');
}

export function handleStudentKey(e) {
  const key = e.key.toUpperCase();
  const opts = ['A', 'B', 'C', 'D'];
  const { currentStudent, numE, numP, estudiantesCalificados } = getState();

  if (estudiantesCalificados[currentStudent]) return;

  if (key === 'ARROWLEFT' || key === 'PAGEUP') {
    if (currentStudent > 0) {
      loadStudent(currentStudent - 1);
    }
    e.preventDefault();
  } else if (key === 'ARROWRIGHT' || key === 'PAGEDOWN') {
    if (currentStudent < numE - 1) {
      loadStudent(currentStudent + 1);
    }
    e.preventDefault();
  } else if (opts.includes(key)) {
    const grid = document.getElementById('stuGrid');
    const firstUnanswered = Array.from(grid.querySelectorAll('.answer-item')).findIndex(item => {
      const optsDiv = item.querySelector('.options');
      return !optsDiv.querySelector('.selected');
    });
    if (firstUnanswered >= 0) {
      const btn = document.getElementById('stu_q' + firstUnanswered)?.querySelector('.opt-btn:nth-of-type(' + (opts.indexOf(key) + 1) + ')');
      if (btn) selRespEstu(firstUnanswered, key, btn);
    } else {
      const lastItem = document.getElementById('stu_q' + (numP - 1));
      const btn = lastItem?.querySelector('.opt-btn:nth-of-type(' + (opts.indexOf(key) + 1) + ')');
      if (btn) selRespEstu(numP - 1, key, btn);
    }
    e.preventDefault();
  } else if (key === 'ENTER') {
    calificarEstudiante();
    if (currentStudent < numE - 1) {
      loadStudent(currentStudent + 1);
    }
    e.preventDefault();
  } else if (key === 'HOME') {
    loadStudent(0);
    e.preventDefault();
  } else if (key === 'END') {
    loadStudent(numE - 1);
    e.preventDefault();
  }
}
