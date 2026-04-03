import { getState } from './state.js';

export function parseSistemaCalif(sistemaCalif) {
  const sistema = sistemaCalif || '1a5';
  const empiezaEnCero = sistema.startsWith('0');
  const match = sistema.match(/a(\d+)/);
  const notaMaxima = match ? parseInt(match[1], 10) : 5;
  const notaMinima = empiezaEnCero ? 0 : 1;
  return { notaMaxima, notaMinima, empiezaEnCero };
}

export function pesoTotal() {
  const { sistemaCalif } = getState();
  const { notaMaxima, notaMinima } = parseSistemaCalif(sistemaCalif);
  return notaMaxima - notaMinima;
}

export function notaAprobacion() {
  const { appSettings } = getState();
  return appSettings?.notaAprobacion ?? 3;
}

export function notaMinima() {
  const { sistemaCalif } = getState();
  const { notaMinima } = parseSistemaCalif(sistemaCalif);
  return notaMinima;
}

export function notaMaxima() {
  const { sistemaCalif } = getState();
  const { notaMaxima } = parseSistemaCalif(sistemaCalif);
  return notaMaxima;
}

export function calcNota(respuestas) {
  const { numP, claveRespuestas, pesosPreguntas, sistemaCalif } = getState();
  const { notaMaxima, notaMinima } = parseSistemaCalif(sistemaCalif);
  let sumaPesos = 0;
  for (let i = 0; i < numP; i++) {
    if (respuestas[i] === claveRespuestas[i]) {
      sumaPesos += pesosPreguntas[i];
    }
  }
  const nota = notaMinima + sumaPesos;
  return Math.min(notaMaxima, Math.max(notaMinima, nota));
}

export function calcAciertos(respuestas, clave) {
  const claveRespuestas = clave || getState().claveRespuestas;
  return respuestas.filter((r, i) => r === claveRespuestas[i]).length;
}

export function calcNotaWithParams(respuestas, clave, pesos, numQuestions, sistemaCalif, notaAprob, maxNotaOverride) {
  const { notaMaxima, notaMinima } = maxNotaOverride 
    ? { notaMaxima: maxNotaOverride, notaMinima: parseSistemaCalif(sistemaCalif).notaMinima }
    : parseSistemaCalif(sistemaCalif);
  let sumaPesos = 0;
  for (let i = 0; i < numQuestions; i++) {
    if (respuestas[i] === clave[i]) {
      sumaPesos += pesos[i];
    }
  }
  const nota = notaMinima + sumaPesos;
  return Math.min(notaMaxima, Math.max(notaMinima, nota));
}
