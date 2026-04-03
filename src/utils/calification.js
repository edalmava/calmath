export function parseSistemaCalif(sistemaCalif) {
  const sistema = sistemaCalif || '1a5';
  const empiezaEnCero = sistema.startsWith('0');
  const match = sistema.match(/a(\d+)/);
  const notaMaxima = match ? parseInt(match[1], 10) : 5;
  const notaMinima = empiezaEnCero ? 0 : 1;
  return { notaMaxima, notaMinima, empiezaEnCero };
}

export function pesoTotal(sistemaCalif) {
  const { notaMaxima, notaMinima } = parseSistemaCalif(sistemaCalif);
  return notaMaxima - notaMinima;
}

export function notaAprobacion(appSettings) {
  return appSettings?.notaAprobacion ?? 3;
}

export function notaMinima(sistemaCalif) {
  return parseSistemaCalif(sistemaCalif).notaMinima;
}

export function notaMaxima(sistemaCalif) {
  return parseSistemaCalif(sistemaCalif).notaMaxima;
}

export function calcNota(respuestas, claveRespuestas, pesosPreguntas, sistemaCalif) {
  if (!respuestas || !claveRespuestas || !pesosPreguntas) return 0;
  
  const { notaMaxima, notaMinima } = parseSistemaCalif(sistemaCalif);
  let sumaPesos = 0;
  for (let i = 0; i < respuestas.length; i++) {
    if (respuestas[i] === claveRespuestas[i]) {
      sumaPesos += pesosPreguntas[i] || 0;
    }
  }
  const nota = notaMinima + sumaPesos;
  return Math.min(notaMaxima, Math.max(notaMinima, nota));
}

export function calcAciertos(respuestas, claveRespuestas) {
  if (!respuestas || !claveRespuestas) return 0;
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
