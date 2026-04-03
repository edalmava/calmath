import { create } from 'zustand';
import { pesoTotal, calcNota, parseSistemaCalif } from '../utils/calification';
import { openDB } from 'idb';

const DB_NAME = 'EvalMathDB';
const DB_VER = 1;

const defaultSettings = {
  sistemaCalif: '1a5',
  notaMaxima: 5,
  notaAprobacion: 3,
};

const defaultState = {
  step: 1,
  numP: 0,
  numE: 0,
  valPregunta: 0,
  pesoMode: 'igual',
  pesosPreguntas: [],
  claveRespuestas: [],
  estudiantesRespuestas: [],
  estudiantesNombres: [],
  estudiantesCalificados: [],
  estudiantesfotos: [],
  currentStudent: 0,
  evalMeta: { nombre: '', fecha: '', periodo: '' },
  evalId: null,
  yaGuardada: false,
  autoguardando: false,
  sistemaCalif: '1a5',
  appSettings: { ...defaultSettings },
  currentView: 'nueva',
  currentResumen: null,
  toast: null,
};

async function getDB() {
  return openDB(DB_NAME, DB_VER, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('evaluaciones')) {
        db.createObjectStore('evaluaciones', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('borrador')) {
        db.createObjectStore('borrador', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('fotos')) {
        db.createObjectStore('fotos', { keyPath: ['evalId', 'studentIdx'] });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }
    },
  });
}

export const useAppStore = create((set, get) => ({
  ...defaultState,

  setStep: (step) => set({ step }),

  setEvalMeta: (meta) => set((state) => ({
    evalMeta: { ...state.evalMeta, ...meta },
  })),

  setNumP: (numP) => {
    const pt = pesoTotal(get().sistemaCalif);
    set({
      numP,
      valPregunta: numP > 0 ? pt / numP : 0,
      pesosPreguntas: new Array(numP).fill(numP > 0 ? pt / numP : 0),
      claveRespuestas: new Array(numP).fill(null),
    });
  },

  setNumE: (numE) => set({
    numE,
    estudiantesRespuestas: new Array(numE).fill(null).map(() => []),
    estudiantesNombres: new Array(numE).fill(null).map((_, i) => `Estudiante ${i + 1}`),
    estudiantesCalificados: new Array(numE).fill(false),
    estudiantesfotos: new Array(numE).fill(null),
  }),

  setPesoMode: (pesoMode) => {
    const state = get();
    const pt = pesoTotal(state.sistemaCalif);
    if (pesoMode === 'igual') {
      const vp = state.numP > 0 ? pt / state.numP : 0;
      set({
        pesoMode,
        pesosPreguntas: new Array(state.numP).fill(vp),
      });
    } else {
      set({ pesoMode });
    }
  },

  setClaveRespuesta: (idx, valor) => set((state) => {
    const newClave = [...state.claveRespuestas];
    newClave[idx] = valor;
    return { claveRespuestas: newClave };
  }),

  setPeso: (idx, valor) => set((state) => {
    const newPesos = [...state.pesosPreguntas];
    newPesos[idx] = parseFloat(valor) || 0;
    return { pesosPreguntas: newPesos };
  }),

  resetPesos: () => set((state) => {
    const pt = pesoTotal(state.sistemaCalif);
    const vp = state.numP > 0 ? pt / state.numP : 0;
    return { pesosPreguntas: new Array(state.numP).fill(vp) };
  }),

  setEstudianteNombre: (idx, nombre) => set((state) => {
    const newNombres = [...state.estudiantesNombres];
    newNombres[idx] = nombre;
    return { estudiantesNombres: newNombres };
  }),

  setEstudianteRespuesta: (estuIdx, pregIdx, valor) => set((state) => {
    const newRespuestas = [...state.estudiantesRespuestas];
    if (!newRespuestas[estuIdx]) newRespuestas[estuIdx] = [];
    newRespuestas[estuIdx] = [...newRespuestas[estuIdx]];
    newRespuestas[estuIdx][pregIdx] = valor;
    return { estudiantesRespuestas: newRespuestas };
  }),

  setEstudianteCalificado: (idx, calif) => set((state) => {
    const newCalif = [...state.estudiantesCalificados];
    newCalif[idx] = calif;
    return { estudiantesCalificados: newCalif };
  }),

  setEstudianteFoto: (idx, foto) => set((state) => {
    const newFotos = [...state.estudiantesfotos];
    newFotos[idx] = foto;
    return { estudiantesfotos: newFotos };
  }),

  importarEstudiantes: (nombresArray) => set((state) => {
    const newNombres = [...state.estudiantesNombres];
    nombresArray.forEach((nombre, i) => {
      if (i < newNombres.length && nombre.trim()) {
        newNombres[i] = nombre.trim();
      }
    });
    return { estudiantesNombres: newNombres };
  }),

  setCurrentStudent: (currentStudent) => set({ currentStudent }),

  setSistemaCalif: (sistemaCalif) => {
    const pt = pesoTotal(sistemaCalif);
    set((state) => ({
      sistemaCalif,
      valPregunta: state.numP > 0 ? pt / state.numP : 0,
    }));
  },

  setAppSettings: (settings) => set((state) => ({
    appSettings: { ...state.appSettings, ...settings },
  })),

  setCurrentView: (currentView) => set({ currentView }),
  setCurrentResumen: (currentResumen) => set({ currentResumen }),
  setToast: (toast) => set({ toast }),

  initFromSettings: async () => {
    try {
      const db = await getDB();
      const settings = await db.get('settings', 'default');
      if (settings) {
        set({
          sistemaCalif: settings.sistemaCalif || '1a5',
          appSettings: {
            sistemaCalif: settings.sistemaCalif || '1a5',
            notaMaxima: settings.notaMaxima ?? 5,
            notaAprobacion: settings.notaAprobacion ?? 3,
          },
        });
      }
    } catch (e) {
      console.error('Error loading settings:', e);
    }
  },

  saveSettings: async () => {
    try {
      const state = get();
      const db = await getDB();
      const { notaMaxima, notaAprobacion } = state.appSettings;
      
      const inicio = (state.sistemaCalif?.startsWith('0') || state.appSettings.sistemaCalif?.startsWith('0')) ? '0' : '1';
      const sistemaCalif = `${inicio}a${notaMaxima}`;
      
      await db.put('settings', {
        id: 'default',
        sistemaCalif,
        notaMaxima,
        notaAprobacion,
      });
    } catch (e) {
      console.error('Error saving settings:', e);
    }
  },

  getNota: (estuIdx) => {
    const state = get();
    const resp = state.estudiantesRespuestas[estuIdx];
    if (!resp) return 0;
    return calcNota(resp, state.claveRespuestas, state.pesosPreguntas, state.sistemaCalif);
  },

  getPesoSum: () => {
    const state = get();
    return state.pesosPreguntas.reduce((sum, p) => sum + (parseFloat(p) || 0), 0);
  },

  getAciertos: (estuIdx) => {
    const state = get();
    const resp = state.estudiantesRespuestas[estuIdx];
    const clave = state.claveRespuestas;
    if (!resp || !clave) return 0;
    return resp.filter((r, i) => r === clave[i]).length;
  },

  resetState: () => set((state) => ({
    ...defaultState,
    sistemaCalif: state.sistemaCalif,
    appSettings: state.appSettings,
    currentView: state.currentView,
    toast: null,
  })),

  saveEvaluacion: async () => {
    const state = get();
    if (state.yaGuardada) return { success: false, msg: 'Ya fue guardada' };

    const notas = Array.from({ length: state.numE }, (_, i) => {
      const resp_i = state.estudiantesRespuestas[i];
      const aciertos = resp_i?.filter((r, j) => r === state.claveRespuestas[j]).length || 0;
      return { nombre: state.estudiantesNombres[i], aciertos, nota: calcNota(resp_i, state.claveRespuestas, state.pesosPreguntas, state.sistemaCalif) };
    });

    const registro = {
      ...state.evalMeta,
      numP: state.numP,
      numE: state.numE,
      valPregunta: state.valPregunta,
      pesoMode: state.pesoMode,
      pesosPreguntas: [...state.pesosPreguntas],
      sistemaCalif: state.sistemaCalif,
      notaMaxima: state.appSettings.notaMaxima,
      notaAprobacion: state.appSettings.notaAprobacion,
      claveRespuestas: [...state.claveRespuestas],
      estudiantesRespuestas: state.estudiantesRespuestas.map(r => [...r]),
      estudiantesNombres: [...state.estudiantesNombres],
      estudiantesCalificados: [...state.estudiantesCalificados],
      fotosMeta: state.estudiantesfotos.map(f => f ? { nombre: f.nombre, type: f.type } : null),
      notas,
      guardadoEn: new Date().toISOString(),
    };

    try {
      const db = await getDB();
      const newId = await db.add('evaluaciones', registro);
      
      const fotoPromises = state.estudiantesfotos.map((f, i) =>
        f ? db.put('fotos', { evalId: newId, studentIdx: i, blob: f.blob, nombre: f.nombre }) : Promise.resolve(),
      );
      await Promise.all(fotoPromises);

      set({ evalId: newId, yaGuardada: true });
      return { success: true, id: newId };
    } catch (e) {
      return { success: false, msg: e.message };
    }
  },

  listEvaluaciones: async () => {
    try {
      const db = await getDB();
      return await db.getAll('evaluaciones');
    } catch (e) {
      console.error('Error listing:', e);
      return [];
    }
  },

  getEvaluacion: async (id) => {
    try {
      const db = await getDB();
      return await db.get('evaluaciones', id);
    } catch (e) {
      console.error('Error getting:', e);
      return null;
    }
  },

  deleteEvaluacion: async (id) => {
    try {
      const db = await getDB();
      await db.delete('evaluaciones', id);
      await db.delete('fotos', id);
      return true;
    } catch (e) {
      console.error('Error deleting:', e);
      return false;
    }
  },

  saveDraft: async () => {
    const state = get();
    if (state.autoguardando) return;
    set({ autoguardando: true });

    try {
      const db = await getDB();
      const snapshot = {
        id: 'current',
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
      await db.put('borrador', snapshot);
    } catch (e) {
      console.error('Error saving draft:', e);
    }

    set({ autoguardando: false });
  },

  getDraft: async () => {
    try {
      const db = await getDB();
      return await db.get('borrador', 'current');
    } catch {
      return null;
    }
  },

  deleteDraft: async () => {
    try {
      const db = await getDB();
      await db.delete('borrador', 'current');
    } catch (e) {
      console.error('Error deleting draft:', e);
    }
  },

  recoverDraft: async () => {
    const draft = await get().getDraft();
    if (!draft || !draft.numP) return false;

    set({
      evalMeta: draft.evalMeta || {},
      numP: draft.numP,
      numE: draft.numE,
      valPregunta: draft.valPregunta,
      pesoMode: draft.pesoMode || 'igual',
      pesosPreguntas: draft.pesosPreguntas || [],
      sistemaCalif: draft.sistemaCalif || draft.evalMeta?.sistemaCalif || '1a5',
      claveRespuestas: draft.claveRespuestas || [],
      estudiantesRespuestas: draft.estudiantesRespuestas || [],
      estudiantesNombres: draft.estudiantesNombres || [],
      estudiantesCalificados: draft.estudiantesCalificados || [],
      estudiantesfotos: new Array(draft.numE).fill(null),
      step: 3,
    });

    return true;
  },

  importarEvaluacion: async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const texto = e.target.result;
          const lineas = texto.split('\n').filter(l => l.trim());
          
          const metadata = parsearMetadataCSV(lineas);
          const claveRespuestas = parsearClaveCSV(lineas);
          const pesosPreguntas = parsearPesosCSV(lineas, metadata.numP);
          
          const sistemaCalifLine = lineas.find(l => l.startsWith('sistemaCalif,'));
          const sistemaCalif = sistemaCalifLine ? sistemaCalifLine.split(',')[1]?.trim() : '1a5';
          
          const notaMaximaLine = lineas.find(l => l.startsWith('notaMaxima,'));
          const notaMaxima = notaMaximaLine ? parseInt(notaMaximaLine.split(',')[1]) : parseSistemaCalif(sistemaCalif).notaMaxima;
          
          const notaAprobacionLine = lineas.find(l => l.startsWith('notaAprobacion,'));
          const notaAprobacion = notaAprobacionLine ? parseFloat(notaAprobacionLine.split(',')[1]) : 3;
          
          const estudiantesData = lineas
            .filter(l => l.match(/^\d+\|/) || (l.includes('|') && !l.startsWith('#')))
            .slice(0, metadata.numE)
            .map(line => parsearEstudianteCSV(line, metadata.numP));
          
          validarImportacion(metadata, estudiantesData, claveRespuestas);
          
          const evaluacion = construirEvaluacion(metadata, claveRespuestas, pesosPreguntas, estudiantesData, sistemaCalif, notaMaxima, notaAprobacion);
          
          const db = await getDB();
          const newId = await db.add('evaluaciones', evaluacion);
          
          resolve({ ...evaluacion, id: newId });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsText(file);
    });
  },
}));

function parsearMetadataCSV(lineas) {
  const linea = lineas.find(l => l.startsWith('# ===== METADATA'));
  if (!linea) throw new Error('No se encontró metadata en el archivo');
  
  const nombreLine = lineas.find(l => l.startsWith('nombre,'));
  const fechaLine = lineas.find(l => l.startsWith('fecha,'));
  const periodoLine = lineas.find(l => l.startsWith('periodo,'));
  const numPLine = lineas.find(l => l.startsWith('numP,'));
  const numELine = lineas.find(l => l.startsWith('numE,'));
  
  if (!nombreLine || !numPLine || !numELine) {
    throw new Error('Formato de metadata inválido');
  }
  
  return {
    nombre: nombreLine.split(',')[1]?.trim() || '',
    fecha: fechaLine?.split(',')[1]?.trim() || '',
    periodo: parseInt(periodoLine?.split(',')[1]) || 1,
    numP: parseInt(numPLine.split(',')[1]) || 0,
    numE: parseInt(numELine.split(',')[1]) || 0,
  };
}

function parsearClaveCSV(lineas) {
  const linea = lineas.find(l => l.startsWith('claveRespuestas,'));
  if (!linea) return [];
  const valores = linea.split(',').slice(1).map(v => v.trim());
  return valores;
}

function parsearPesosCSV(lineas, numP) {
  const linea = lineas.find(l => l.startsWith('pesosPreguntas,'));
  if (!linea) {
    const { notaMaxima, notaMinima } = parseSistemaCalif('1a5');
    const pt = notaMaxima - notaMinima;
    return new Array(numP).fill(pt / numP);
  }
  const valores = linea.split(',').slice(1).map(v => parseFloat(v.trim()) || 0);
  return valores;
}

function parsearEstudianteCSV(linea, numP) {
  // Formato: 1|María López|A|B|C|D|...
  const partes = linea.split('|').map(p => p.trim());
  const respuestas = partes.slice(2, 2 + numP).map(r => r === '-' ? null : r);
  return {
    nombre: partes[1] || partes[0],
    respuestas: respuestas,
  };
}

function validarImportacion(metadata, estudiantesData, claveRespuestas) {
  if (!metadata || !metadata.numP || !metadata.numE) {
    throw new Error('Metadata inválida o incompleta');
  }
  if (estudiantesData.length !== metadata.numE) {
    throw new Error(`Número de estudiantes incorrecto: esperado ${metadata.numE}, encontrado ${estudiantesData.length}`);
  }
  if (claveRespuestas.length !== metadata.numP) {
    throw new Error(`Número de respuestas en clave incorrecto: esperado ${metadata.numP}`);
  }
}

function construirEvaluacion(metadata, claveRespuestas, pesosPreguntas, estudiantesData, sistemaCalif, notaMaxima, notaAprobacion) {
  const { notaMinima } = parseSistemaCalif(sistemaCalif);
  const estudiantesNombres = estudiantesData.map(e => e.nombre);
  const estudiantesRespuestas = estudiantesData.map(e => e.respuestas);
  
  const notas = estudiantesRespuestas.map((resp, i) => {
    const aciertos = resp.filter((r, j) => r === claveRespuestas[j]).length;
    const sumaPesos = resp.reduce((sum, r, j) => {
      if (r === claveRespuestas[j]) {
        return sum + (pesosPreguntas[j] || 0);
      }
      return sum;
    }, 0);
    const nota = Math.min(notaMaxima, Math.max(notaMinima, notaMinima + sumaPesos));
    return { nombre: estudiantesNombres[i], aciertos, nota };
  });
  
  const valPregunta = pesosPreguntas.reduce((a, b) => a + b, 0) / metadata.numP;
  
  return {
    nombre: metadata.nombre,
    fecha: metadata.fecha,
    periodo: metadata.periodo,
    numP: metadata.numP,
    numE: metadata.numE,
    valPregunta,
    pesoMode: pesosPreguntas.every(p => p === pesosPreguntas[0]) ? 'igual' : 'diferente',
    pesosPreguntas,
    sistemaCalif,
    notaMaxima,
    notaAprobacion,
    claveRespuestas,
    estudiantesRespuestas,
    estudiantesNombres,
    estudiantesCalificados: new Array(metadata.numE).fill(true),
    estudiantesfotos: new Array(metadata.numE).fill(null),
    notas,
    guardadoEn: new Date().toISOString(),
  };
}
