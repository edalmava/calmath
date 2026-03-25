let numP, numE, valPregunta;
let pesoMode = 'igual';
let pesosPreguntas = [];
let claveRespuestas = [];
let estudiantesRespuestas = [];
let estudiantesNombres = [];
let estudiantesCalificados = [];
let estudiantesfotos = [];
let currentStudent = 0;
let evalMeta = { nombre: '', fecha: '', periodo: '' };
let evalId = null;
let pendingDeleteId = null;
let yaGuardada = false;
let autoguardando = false;
let sistemaCalif = '1a5';

const opts = ['A', 'B', 'C', 'D'];

export function getState() {
  return {
    numP, numE, valPregunta,
    pesoMode,
    pesosPreguntas,
    claveRespuestas,
    estudiantesRespuestas,
    estudiantesNombres,
    estudiantesCalificados,
    estudiantesfotos,
    currentStudent,
    evalMeta,
    evalId,
    pendingDeleteId,
    yaGuardada,
    autoguardando,
    sistemaCalif,
    opts,
  };
}

export function setState(newState) {
  if (newState.numP !== undefined) numP = newState.numP;
  if (newState.numE !== undefined) numE = newState.numE;
  if (newState.valPregunta !== undefined) valPregunta = newState.valPregunta;
  if (newState.pesoMode !== undefined) pesoMode = newState.pesoMode;
  if (newState.pesosPreguntas !== undefined) pesosPreguntas = newState.pesosPreguntas;
  if (newState.claveRespuestas !== undefined) claveRespuestas = newState.claveRespuestas;
  if (newState.estudiantesRespuestas !== undefined) estudiantesRespuestas = newState.estudiantesRespuestas;
  if (newState.estudiantesNombres !== undefined) estudiantesNombres = newState.estudiantesNombres;
  if (newState.estudiantesCalificados !== undefined) estudiantesCalificados = newState.estudiantesCalificados;
  if (newState.estudiantesfotos !== undefined) estudiantesfotos = newState.estudiantesfotos;
  if (newState.currentStudent !== undefined) currentStudent = newState.currentStudent;
  if (newState.evalMeta !== undefined) evalMeta = newState.evalMeta;
  if (newState.evalId !== undefined) evalId = newState.evalId;
  if (newState.pendingDeleteId !== undefined) pendingDeleteId = newState.pendingDeleteId;
  if (newState.yaGuardada !== undefined) yaGuardada = newState.yaGuardada;
  if (newState.autoguardando !== undefined) autoguardando = newState.autoguardando;
  if (newState.sistemaCalif !== undefined) sistemaCalif = newState.sistemaCalif;
}

export function resetState() {
  numP = undefined;
  numE = undefined;
  valPregunta = undefined;
  pesoMode = 'igual';
  pesosPreguntas = [];
  claveRespuestas = [];
  estudiantesRespuestas = [];
  estudiantesNombres = [];
  estudiantesCalificados = [];
  estudiantesfotos = [];
  currentStudent = 0;
  evalMeta = { nombre: '', fecha: '', periodo: '' };
  evalId = null;
  pendingDeleteId = null;
  yaGuardada = false;
  autoguardando = false;
  sistemaCalif = '1a5';
}

export {
  numP, numE, valPregunta,
  pesoMode,
  pesosPreguntas,
  claveRespuestas,
  estudiantesRespuestas,
  estudiantesNombres,
  estudiantesCalificados,
  estudiantesfotos,
  currentStudent,
  evalMeta,
  evalId,
  pendingDeleteId,
  yaGuardada,
  autoguardando,
  sistemaCalif,
  opts,
};
