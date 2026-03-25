import { getState } from './state.js';

export function pesoTotal() {
  const { sistemaCalif } = getState();
  return sistemaCalif === '0a5' ? 5 : 4;
}

export function notaAprobacion() {
  return 3;
}

export function notaMinima() {
  const { sistemaCalif } = getState();
  return sistemaCalif === '0a5' ? 0 : 1;
}

export function calcNota(respuestas) {
  const { numP, claveRespuestas, pesosPreguntas, sistemaCalif } = getState();
  let sumaPesos = 0;
  for (let i = 0; i < numP; i++) {
    if (respuestas[i] === claveRespuestas[i]) {
      sumaPesos += pesosPreguntas[i];
    }
  }
  const nota = sistemaCalif === '0a5' ? sumaPesos : 1 + sumaPesos;
  return Math.min(5, Math.max(notaMinima(), nota));
}

export function calcAciertos(respuestas) {
  const { claveRespuestas } = getState();
  return respuestas.filter((r, i) => r === claveRespuestas[i]).length;
}

export function calcNotaWithParams(respuestas, clave, pesos, numQuestions, sistema, notaMin) {
  let sumaPesos = 0;
  for (let i = 0; i < numQuestions; i++) {
    if (respuestas[i] === clave[i]) {
      sumaPesos += pesos[i];
    }
  }
  const nota = sistema === '0a5' ? sumaPesos : 1 + sumaPesos;
  return Math.min(5, Math.max(notaMin, nota));
}
