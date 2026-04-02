import { getState } from '../state.js';
import { parseSistemaCalif, calcNotaWithParams } from '../calification.js';
import { jsPDF } from 'jspdf';
import { toast } from './ui.js';
import { renderHistorial } from './historial.js';

// ─────────────────────────────────────────────
// CSV EXPORT
// ─────────────────────────────────────────────

/**
 * Construye la sección de metadata del CSV.
 * @param {Object} ev
 * @param {string} evCalif
 * @param {number} evMaxNota
 * @param {number} notaMinima
 * @param {Array} pesos
 * @returns {string}
 */
function construirMetadataCSV(ev, evCalif, evMaxNota, notaMinima, pesos) {
  const notaAprueba = ev.notaAprobacion || 3;
  const evPesoMode = ev.pesoMode || 'igual';
  const claveHeader = ev.claveRespuestas.join(',');
  const pesosHeader = pesos.map(p => p.toFixed(4)).join(',');

  return [
    '# ===== METADATA (para importacion) =====',
    '# Formato: EVALMATH_v1',
    `nombre,${ev.nombre}`,
    `fecha,${ev.fecha || ''}`,
    `periodo,${ev.periodo}`,
    `numP,${ev.numP}`,
    `numE,${ev.numE}`,
    `sistemaCalif,${evCalif}`,
    `notaMaxima,${evMaxNota}`,
    `notaAprobacion,${notaAprueba}`,
    `pesoMode,${evPesoMode}`,
    `pesosPreguntas,${pesosHeader}`,
    `claveRespuestas,${claveHeader}`,
  ].join('\n');
}

/**
 * Construye la sección de estudiantes del CSV.
 * @param {Object} ev
 * @returns {string}
 */
function construirEstudiantesCSV(ev) {
  const filas = ev.estudiantesRespuestas.map((resp, i) => {
    const nombre = (ev.estudiantesNombres[i] || '').replace(/"/g, '""');
    const respuestas = resp.map(rp => rp || '-').join('|');
    const calif = ev.estudiantesCalificados[i] ? 'Si' : 'No';
    return `${i + 1}|${nombre}|${respuestas}|${calif}`;
  });

  return [
    '\n# ===== ESTUDIANTES =====',
    '#num,nombre,respuestas,calificado',
    ...filas,
  ].join('\n');
}

/**
 * Construye las secciones de análisis del CSV.
 * @param {Array} analisisPorPregunta
 * @param {Array} distribucionPorPregunta
 * @param {Object} ev
 * @returns {string}
 */
function construirAnalisisCSV(analisisPorPregunta, distribucionPorPregunta, ev) {
  const analisisFilas = analisisPorPregunta.map(a =>
    `${a.pregunta},${ev.claveRespuestas[a.pregunta - 1]},${a.aciertos},${a.porcentaje}%`,
  );
  const distribFilas = distribucionPorPregunta.map(d =>
    `${d.pregunta},${d.clave},${d.A},${d.B},${d.C},${d.D}`,
  );

  return [
    '\n# ===== ANALISIS POR PREGUNTA =====',
    'Pregunta,Clave,Aciertos,Porcentaje',
    ...analisisFilas,
    '\n# ===== DISTRIBUCION DE RESPUESTAS =====',
    'Pregunta,Clave,A,B,C,D',
    ...distribFilas,
  ].join('\n');
}

/**
 * Exporta el resumen actual a un archivo CSV descargable.
 */
export function exportarCSV() {
  const { currentResumen } = getState();
  if (!currentResumen) {
    toast('No hay datos de resumen para exportar', true);
    return;
  }

  const { ev, analisisPorPregunta, distribucionPorPregunta } = currentResumen;
  const evCalif = ev.sistemaCalif || ev.evalMeta?.sistemaCalif || '1a5';
  const { notaMaxima: evMaxNota, notaMinima } = parseSistemaCalif(evCalif);
  const defaultPeso = (evMaxNota - notaMinima) / ev.numP;
  const pesos = ev.pesosPreguntas || new Array(ev.numP).fill(defaultPeso);

  const csv = [
    construirMetadataCSV(ev, evCalif, evMaxNota, notaMinima, pesos),
    construirEstudiantesCSV(ev),
    construirAnalisisCSV(analisisPorPregunta, distribucionPorPregunta, ev),
  ].join('');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = ev.nombre.replace(/[^a-zA-Z0-9]/g, '_') + '_resultados.csv';
  link.click();
  URL.revokeObjectURL(url);
  toast('CSV exportado');
}

// ─────────────────────────────────────────────
// CSV IMPORT
// ─────────────────────────────────────────────

const CLAVES_VALIDAS = ['A', 'B', 'C', 'D'];

/**
 * Parsea el contenido de un CSV al formato de metadata y estudiantes.
 * @param {string} content
 * @returns {{metadata: Object, estudiantesData: Array}}
 */
function parsearCSV(content) {
  const lines = content.split('\n').map(l => l.trim()).filter(l => l);
  const metadata = {};
  const estudiantesData = [];
  let inMetadata = false;
  let inEstudiantes = false;

  const KEYS_METADATA = new Set([
    'nombre', 'fecha', 'periodo', 'numP', 'numE',
    'sistemaCalif', 'notaMaxima', 'notaAprobacion',
    'pesoMode', 'pesosPreguntas', 'claveRespuestas',
  ]);
  const KEYS_INT = new Set(['numP', 'numE', 'notaMaxima', 'notaAprobacion']);
  const KEYS_ARRAY = new Set(['pesosPreguntas', 'claveRespuestas']);

  for (const line of lines) {
    if (line.startsWith('# =====')) {
      if (line.includes('METADATA')) { inMetadata = true; inEstudiantes = false; }
      else if (line.includes('ESTUDIANTES')) { inMetadata = false; inEstudiantes = true; }
      else { inMetadata = false; inEstudiantes = false; }
      continue;
    }
    if (line.startsWith('#')) continue;

    if (inMetadata) {
      const commaIdx = line.indexOf(',');
      if (commaIdx === -1) continue;
      const key = line.substring(0, commaIdx);
      const value = line.substring(commaIdx + 1);
      if (!KEYS_METADATA.has(key)) continue;
      if (KEYS_INT.has(key)) metadata[key] = parseFloat(value);
      else if (KEYS_ARRAY.has(key)) metadata[key] = value.split(',');
      else metadata[key] = value;
      continue;
    }

    if (inEstudiantes) {
      const isCalifSi = line.endsWith('|Si');
      const isCalifNo = line.endsWith('|No');
      if (!isCalifSi && !isCalifNo) continue;

      const calif = isCalifSi ? 'Si' : 'No';
      const lineWithoutCalif = line.slice(0, -(calif.length + 1));
      const pipes = lineWithoutCalif.split('|');
      if (pipes.length < 2) continue;

      const num = parseInt(pipes[0], 10);
      if (isNaN(num)) continue;

      const numP = metadata.numP || 5;
      const nombreEnd = pipes.length - numP;
      if (nombreEnd < 1) continue;

      estudiantesData.push({
        nombre: pipes.slice(1, nombreEnd).join('|'),
        respuestas: pipes.slice(nombreEnd),
        calificados: calif === 'Si',
      });
    }
  }

  return { metadata, estudiantesData };
}

/**
 * Valida la metadata y los datos de estudiantes del CSV.
 * @param {Object} metadata
 * @param {Array} estudiantesData
 * @throws {Error} con mensaje descriptivo si hay problema
 */
function validarDatosCSV(metadata, estudiantesData) {
  if (!metadata.nombre || !metadata.numP || !metadata.claveRespuestas) {
    throw new Error('El archivo CSV no tiene el formato esperado. Falta metadata (nombre, numP o claveRespuestas).');
  }

  const numP = metadata.numP;
  const numE = metadata.numE;

  if (!Number.isInteger(numP) || numP < 1 || numP > 100) {
    throw new Error(`El número de preguntas debe estar entre 1 y 100. Se encontró: ${numP}`);
  }
  if (!Number.isInteger(numE) || numE < 1 || numE > 200) {
    throw new Error(`El número de estudiantes debe estar entre 1 y 200. Se encontró: ${numE}`);
  }
  if (estudiantesData.length > numE) {
    throw new Error(`El archivo tiene ${estudiantesData.length} estudiantes pero numE indica ${numE}.`);
  }

  metadata.claveRespuestas.forEach((clave, i) => {
    if (!CLAVES_VALIDAS.includes(clave)) {
      throw new Error(`Clave de respuesta inválida en pregunta ${i + 1}: "${clave}". Debe ser A, B, C o D.`);
    }
  });

  if (metadata.pesosPreguntas && metadata.pesosPreguntas.length !== numP) {
    throw new Error(`El número de pesos (${metadata.pesosPreguntas.length}) no coincide con el número de preguntas (${numP}).`);
  }

  estudiantesData.forEach(est => {
    if (est.respuestas.length !== numP) {
      throw new Error(`El estudiante "${est.nombre}" tiene ${est.respuestas.length} respuestas pero deberían ser ${numP}.`);
    }
    est.respuestas.forEach((resp, j) => {
      if (resp && !CLAVES_VALIDAS.includes(resp)) {
        throw new Error(`Respuesta inválida en pregunta ${j + 1} para "${est.nombre}": "${resp}". Debe ser A, B, C, D o vacío.`);
      }
    });
  });
}

/**
 * Construye el objeto evaluación a partir de metadata y estudiantes parseados.
 * @param {Object} metadata
 * @param {Array} estudiantesData
 * @returns {Object}
 */
function construirEvaluacion(metadata, estudiantesData) {
  const evCalif = metadata.sistemaCalif || '1a5';
  const { notaMaxima, notaMinima } = parseSistemaCalif(evCalif);
  const pesos = metadata.pesosPreguntas
    ? metadata.pesosPreguntas.map(p => parseFloat(p))
    : new Array(metadata.numP).fill((notaMaxima - notaMinima) / metadata.numP);
  const notaAprueba = metadata.notaAprobacion || 3;
  const evMaxNota = metadata.notaMaxima || notaMaxima;
  const numE = metadata.numE || estudiantesData.length;

  const notas = estudiantesData.map((est) => {
    const resp = est.respuestas;
    const nota = calcNotaWithParams(
      resp,
      metadata.claveRespuestas,
      pesos,
      metadata.numP,
      evCalif,
      notaAprueba,
      evMaxNota,
    );
    const aciertos = resp.filter((r, j) => r === metadata.claveRespuestas[j]).length;
    return { nombre: est.nombre, aciertos, nota };
  });

  return {
    evalMeta: {
      nombre: metadata.nombre,
      fecha: metadata.fecha || '',
      periodo: metadata.periodo || '',
    },
    nombre: metadata.nombre,
    fecha: metadata.fecha || '',
    periodo: metadata.periodo || '',
    numP: metadata.numP,
    numE,
    sistemaCalif: evCalif,
    notaMaxima: evMaxNota,
    notaAprobacion: notaAprueba,
    pesoMode: metadata.pesoMode || 'igual',
    pesosPreguntas: pesos,
    claveRespuestas: metadata.claveRespuestas,
    estudiantesNombres: estudiantesData.map(e => e.nombre),
    estudiantesRespuestas: estudiantesData.map(e => e.respuestas),
    estudiantesCalificados: estudiantesData.map(e => e.calificados),
    fotosMeta: new Array(estudiantesData.length).fill(null),
    notas,
    guardadoEn: new Date().toISOString(),
  };
}

/**
 * Importa una evaluación desde un archivo CSV.
 * @param {File} file
 * @returns {Promise<Object>} La evaluación importada
 */
export function importarEvaluacion(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const { metadata, estudiantesData } = parsearCSV(e.target.result);
        validarDatosCSV(metadata, estudiantesData);
        const evaluacion = construirEvaluacion(metadata, estudiantesData);

        await window.dbGuardar(evaluacion);
        renderHistorial();
        toast('Evaluacion importada correctamente');
        resolve(evaluacion);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error('Error al leer el archivo. Verifica que sea un archivo CSV válido.'));
    reader.readAsText(file);
  });
}

// ─────────────────────────────────────────────
// PDF EXPORT
// ─────────────────────────────────────────────

/**
 * Obtiene o construye el resumen para exportar a PDF.
 * Si no hay currentResumen activo, lo construye desde el estado.
 * @returns {Object|null}
 */
function obtenerResumenParaPDF() {
  const { currentResumen } = getState();
  if (currentResumen) return currentResumen;

  const {
    numP, numE, evalMeta, estudiantesRespuestas, estudiantesNombres,
    claveRespuestas, pesosPreguntas, sistemaCalif, appSettings,
  } = getState();

  if (!numP || !numE) return null;

  const evMaxNota = appSettings?.notaMaxima ?? 5;
  const notaAprueba = appSettings?.notaAprobacion ?? 3;
  const evCalif = sistemaCalif || '1a5';

  const resultados = estudiantesRespuestas.map((resp, i) => {
    resp = resp || [];
    const nota = calcNotaWithParams(
      resp, claveRespuestas, pesosPreguntas,
      numP, evCalif, notaAprueba, evMaxNota,
    );
    const aciertos = resp.filter((r, j) => r === claveRespuestas[j]).length;
    return { nombre: estudiantesNombres[i], aciertos, nota, aprobado: nota >= notaAprueba };
  });

  const analisisPorPregunta = [];
  const distribucionPorPregunta = [];
  for (let j = 0; j < numP; j++) {
    let aciertosPregunta = 0;
    const conteo = { A: 0, B: 0, C: 0, D: 0 };
    for (let i = 0; i < numE; i++) {
      const resp = (estudiantesRespuestas[i] || [])[j];
      if (resp === claveRespuestas[j]) aciertosPregunta++;
      if (resp && conteo[resp] !== undefined) conteo[resp]++;
    }
    const pct = ((aciertosPregunta / numE) * 100).toFixed(1);
    analisisPorPregunta.push({ pregunta: j + 1, aciertos: aciertosPregunta, porcentaje: pct });
    distribucionPorPregunta.push({ pregunta: j + 1, clave: claveRespuestas[j], ...conteo });
  }

  return {
    ev: {
      nombre: evalMeta.nombre, fecha: evalMeta.fecha, periodo: evalMeta.periodo,
      numP, numE, notaMaxima: evMaxNota, notaAprobacion: notaAprueba,
    },
    resultados,
    analisisPorPregunta,
    distribucionPorPregunta,
  };
}

/**
 * Exporta el resumen actual a PDF.
 */
export function exportarPDF() {
  const resumen = obtenerResumenParaPDF();
  if (!resumen) {
    toast('No hay datos para exportar', true);
    return;
  }

  const { ev, resultados, analisisPorPregunta, distribucionPorPregunta } = resumen;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  // ── Encabezado ──
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Resultados de Evaluación', pageWidth / 2, y, { align: 'center' });
  y += 10;

  doc.setFontSize(12);
  doc.text(ev.nombre, pageWidth / 2, y, { align: 'center' });
  y += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const fechaLocal = ev.fecha
    ? new Date(ev.fecha + 'T12:00:00').toLocaleDateString('es-CO', {
      day: '2-digit', month: 'long', year: 'numeric',
    })
    : '-';
  doc.text(
    `Periodo ${ev.periodo} | ${fechaLocal} | ${ev.numP} preguntas | ${ev.numE} estudiantes`,
    pageWidth / 2, y, { align: 'center' },
  );
  y += 12;

  // ── Stats generales ──
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

  // ── Tabla de resultados ──
  const colWidths = [12, 65, 25, 25, 25, 30];
  const headers = ['#', 'Estudiante', 'Aciertos', 'Errores', 'Nota', 'Estado'];

  doc.setFillColor(30, 30, 30);
  doc.rect(margin, y, pageWidth - 2 * margin, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  let x = margin + 2;
  headers.forEach((h, i) => {
    doc.text(h, x + colWidths[i] / 2, y + 5.5, { align: 'center' });
    x += colWidths[i];
  });
  y += 8;

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  resultados.forEach((r, i) => {
    if (y > pageHeight - 25) { doc.addPage(); y = margin; }

    const bgColor = i % 2 === 0 ? 255 : 245;
    doc.setFillColor(bgColor, bgColor, bgColor);
    doc.rect(margin, y, pageWidth - 2 * margin, 7, 'F');

    const notaColor = r.nota >= notaAprueba
      ? [86, 211, 100]
      : r.nota >= notaAprueba - 1 ? [240, 192, 64] : [248, 81, 73];
    const estadoColor = r.aprobado ? [86, 211, 100] : [248, 81, 73];

    x = margin + 2;
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
    doc.text(String(ev.numP - r.aciertos), x + colWidths[3] / 2, y + 5, { align: 'center' });
    x += colWidths[3];

    doc.setTextColor(...notaColor);
    doc.setFont('helvetica', 'bold');
    doc.text(r.nota.toFixed(1), x + colWidths[4] / 2, y + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    x += colWidths[4];

    doc.setTextColor(...estadoColor);
    doc.text(r.aprobado ? 'Aprobado' : 'Reprobado', x + colWidths[5] / 2, y + 5, { align: 'center' });
    y += 7;
  });

  // ── Análisis por pregunta ──
  y += 10;
  if (y > pageHeight - 40) { doc.addPage(); y = margin; }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
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
    if (y > pageHeight - 20) { doc.addPage(); y = margin; }
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

  // ── Distribución de respuestas ──
  y += 12;
  if (y > pageHeight - 60) { doc.addPage(); y = margin; }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Distribucion de Respuestas por Pregunta', pageWidth / 2, y, { align: 'center' });
  y += 10;

  const colors = { A: [86, 211, 100], B: [248, 81, 73], C: [240, 192, 64], D: [79, 195, 247] };
  const maxBarWidth = 55;
  const colWidth = (pageWidth - 2 * margin) / 2 - 5;
  const halfDist = Math.ceil(distribucionPorPregunta.length / 2);

  for (let i = 0; i < halfDist; i++) {
    if (y > pageHeight - 50) { doc.addPage(); y = margin; }

    const drawDistrib = (d, xOffset) => {
      const maxVal = Math.max(d.A, d.B, d.C, d.D, 1);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`P${d.pregunta} (Clave: ${d.clave})`, xOffset, y);

      const barY = y + 4;
      ['A', 'B', 'C', 'D'].forEach((opt, idx) => {
        const count = d[opt];
        const pct = ((count / ev.numE) * 100).toFixed(0);
        const barWidth = (count / maxVal) * maxBarWidth;

        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colors[opt]);
        doc.text(opt, xOffset, barY + idx * 6 + 3);

        doc.setFillColor(230, 230, 230);
        doc.rect(xOffset + 6, barY + idx * 6, maxBarWidth, 4, 'F');

        doc.setFillColor(...colors[opt]);
        doc.rect(xOffset + 6, barY + idx * 6, barWidth, 4, 'F');

        doc.setTextColor(100, 100, 100);
        doc.text(`${count} (${pct}%)`, xOffset + 6 + maxBarWidth + 3, barY + idx * 6 + 3);
      });
    };

    drawDistrib(distribucionPorPregunta[i], margin);
    if (distribucionPorPregunta[i + half]) {
      drawDistrib(distribucionPorPregunta[i + half], margin + colWidth + 10);
    }
    y += 28;
  }

  const safeName = ev.nombre.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ]/g, '_');
  doc.save(`${safeName}_resultados.pdf`);
  toast('PDF descargado correctamente');
}
