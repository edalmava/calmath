import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parseSistemaCalif, pesoTotal, notaMinima, notaMaxima, calcNota, calcAciertos } from '../src/app/calification.js';
import { getState, setState, resetState } from '../src/app/state.js';

describe('parseSistemaCalif', () => {
  it('parses 1a5 correctly', () => {
    const result = parseSistemaCalif('1a5');
    expect(result.notaMaxima).toBe(5);
    expect(result.notaMinima).toBe(1);
    expect(result.empiezaEnCero).toBe(false);
  });

  it('parses 0a5 correctly', () => {
    const result = parseSistemaCalif('0a5');
    expect(result.notaMaxima).toBe(5);
    expect(result.notaMinima).toBe(0);
    expect(result.empiezaEnCero).toBe(true);
  });

  it('parses 1a10 correctly', () => {
    const result = parseSistemaCalif('1a10');
    expect(result.notaMaxima).toBe(10);
    expect(result.notaMinima).toBe(1);
    expect(result.empiezaEnCero).toBe(false);
  });

  it('parses 0a7 correctly', () => {
    const result = parseSistemaCalif('0a7');
    expect(result.notaMaxima).toBe(7);
    expect(result.notaMinima).toBe(0);
    expect(result.empiezaEnCero).toBe(true);
  });

  it('defaults to 1a5 for invalid input', () => {
    const result = parseSistemaCalif('invalid');
    expect(result.notaMaxima).toBe(5);
    expect(result.notaMinima).toBe(1);
  });

  it('handles undefined input', () => {
    const result = parseSistemaCalif(undefined);
    expect(result.notaMaxima).toBe(5);
    expect(result.notaMinima).toBe(1);
  });
});

describe('pesoTotal', () => {
  beforeEach(() => {
    resetState();
  });

  it('returns 4 for 1a5 system', () => {
    setState({ sistemaCalif: '1a5' });
    expect(pesoTotal()).toBe(4);
  });

  it('returns 5 for 0a5 system', () => {
    setState({ sistemaCalif: '0a5' });
    expect(pesoTotal()).toBe(5);
  });

  it('returns 9 for 1a10 system', () => {
    setState({ sistemaCalif: '1a10' });
    expect(pesoTotal()).toBe(9);
  });

  it('returns 7 for 0a7 system', () => {
    setState({ sistemaCalif: '0a7' });
    expect(pesoTotal()).toBe(7);
  });
});

describe('notaMinima', () => {
  beforeEach(() => {
    resetState();
  });

  it('returns 1 for 1aX systems', () => {
    setState({ sistemaCalif: '1a5' });
    expect(notaMinima()).toBe(1);
  });

  it('returns 0 for 0aX systems', () => {
    setState({ sistemaCalif: '0a5' });
    expect(notaMinima()).toBe(0);
  });
});

describe('notaMaxima', () => {
  beforeEach(() => {
    resetState();
  });

  it('returns 5 for 1a5 system', () => {
    setState({ sistemaCalif: '1a5' });
    expect(notaMaxima()).toBe(5);
  });

  it('returns 10 for 1a10 system', () => {
    setState({ sistemaCalif: '1a10' });
    expect(notaMaxima()).toBe(10);
  });
});

describe('calcNota', () => {
  beforeEach(() => {
    resetState();
  });

  it('calculates correct grade for 1a5 with all correct', () => {
    setState({
      sistemaCalif: '1a5',
      numP: 4,
      claveRespuestas: ['A', 'B', 'C', 'D'],
      pesosPreguntas: [1, 1, 1, 1],
    });
    const respuestas = ['A', 'B', 'C', 'D'];
    expect(calcNota(respuestas)).toBe(5);
  });

  it('calculates correct grade for 1a5 with none correct', () => {
    setState({
      sistemaCalif: '1a5',
      numP: 4,
      claveRespuestas: ['A', 'B', 'C', 'D'],
      pesosPreguntas: [1, 1, 1, 1],
    });
    const respuestas = ['D', 'C', 'B', 'A'];
    expect(calcNota(respuestas)).toBe(1);
  });

  it('calculates correct grade for 0a5 with all correct', () => {
    setState({
      sistemaCalif: '0a5',
      numP: 5,
      claveRespuestas: ['A', 'B', 'C', 'D', 'A'],
      pesosPreguntas: [1, 1, 1, 1, 1],
    });
    const respuestas = ['A', 'B', 'C', 'D', 'A'];
    expect(calcNota(respuestas)).toBe(5);
  });

  it('calculates correct grade for 0a5 with none correct', () => {
    setState({
      sistemaCalif: '0a5',
      numP: 5,
      claveRespuestas: ['A', 'B', 'C', 'D', 'A'],
      pesosPreguntas: [1, 1, 1, 1, 1],
    });
    const respuestas = ['D', 'C', 'B', 'A', 'B'];
    expect(calcNota(respuestas)).toBe(0);
  });

  it('handles partial correct answers for 1a5', () => {
    setState({
      sistemaCalif: '1a5',
      numP: 4,
      claveRespuestas: ['A', 'B', 'C', 'D'],
      pesosPreguntas: [1, 1, 1, 1],
    });
    const respuestas = ['A', 'B', 'D', 'A'];
    expect(calcNota(respuestas)).toBe(3);
  });

  it('caps at notaMaxima for 1a10 system', () => {
    setState({
      sistemaCalif: '1a10',
      numP: 20,
      claveRespuestas: new Array(20).fill('A'),
      pesosPreguntas: new Array(20).fill(0.5),
    });
    const respuestas = new Array(20).fill('A');
    expect(calcNota(respuestas)).toBe(10);
  });
});

describe('calcAciertos', () => {
  it('counts correct answers correctly', () => {
    const clave = ['A', 'B', 'C', 'D', 'A'];
    const respuestas = ['A', 'B', 'C', 'A', 'A'];
    expect(calcAciertos(respuestas, clave)).toBe(4);
  });

  it('returns 0 when all answers are wrong', () => {
    const clave = ['A', 'B', 'C', 'D'];
    const respuestas = ['D', 'C', 'B', 'A'];
    expect(calcAciertos(respuestas, clave)).toBe(0);
  });
});

describe('CSV Import grading systems', () => {
  beforeEach(() => {
    resetState();
    window.dbGuardar = vi.fn().mockResolvedValue(undefined);
    window.renderHistorial = vi.fn();
  });

  const createCSVContent = (opts = {}) => {
    const {
      sistemaCalif = '1a5',
      notaMaxima = 5,
      notaAprobacion = 3,
      pesoMode = 'igual',
      numP = 5,
      numE = 2,
      claveRespuestas = 'A,B,C,D,A',
      estudiantes = [
        { nombre: 'Juan Perez', respuestas: 'A|B|C|D|A', calificados: 'Si' },
        { nombre: 'Maria Lopez', respuestas: 'A|A|A|A|A', calificados: 'Si' },
      ],
    } = opts;

    const { notaMinima } = parseSistemaCalif(sistemaCalif);
    const pesoTotal = notaMaxima - notaMinima;
    const defaultPeso = pesoTotal / numP;
    const pesosPreguntas = Array(numP).fill(defaultPeso).map(p => p.toFixed(4)).join(',');

    return `# ===== METADATA (para importacion) =====
# Formato: EVALMATH_v1
nombre,Test Evaluation
fecha,2026-03-29
periodo,2026-1
numP,${numP}
numE,${numE}
sistemaCalif,${sistemaCalif}
notaMaxima,${notaMaxima}
notaAprobacion,${notaAprobacion}
pesoMode,${pesoMode}
pesosPreguntas,${pesosPreguntas}
claveRespuestas,${claveRespuestas}

# ===== ESTUDIANTES =====
#num,nombre,respuestas,calificado
${estudiantes.map((e, i) => `${i + 1}|${e.nombre}|${e.respuestas}|${e.calificados}`).join('\n')}

# ===== ANALISIS POR PREGUNTA =====
Pregunta,Clave,Aciertos,Porcentaje

# ===== DISTRIBUCION DE RESPUESTAS =====
Pregunta,Clave,A,B,C,D
`;
  };

  it('calculates correct grades for 1a5 system on import', async () => {
    const csv = createCSVContent({ sistemaCalif: '1a5', claveRespuestas: 'A,B,C,D,A' });
    const file = new File([csv], 'test.csv', { type: 'text/csv' });
    
    const { importarEvaluacion } = await import('../src/app/views.js');
    const result = await importarEvaluacion(file);

    expect(result.sistemaCalif).toBe('1a5');
    expect(result.notas[0].nota).toBe(5);
    expect(result.notas[1].nota).toBe(2.6);
  });

  it('calculates correct grades for 0a5 system on import', async () => {
    const csv = createCSVContent({ sistemaCalif: '0a5', claveRespuestas: 'A,B,C,D,A' });
    const file = new File([csv], 'test.csv', { type: 'text/csv' });
    
    const { importarEvaluacion } = await import('../src/app/views.js');
    const result = await importarEvaluacion(file);

    expect(result.sistemaCalif).toBe('0a5');
    expect(result.notas[0].nota).toBe(5);
    expect(result.notas[1].nota).toBe(2);
  });

  it('calculates correct grades for 1a10 system on import', async () => {
    const csv = createCSVContent({ sistemaCalif: '1a10', notaMaxima: 10, claveRespuestas: 'A,B,C,D,A' });
    const file = new File([csv], 'test.csv', { type: 'text/csv' });
    
    const { importarEvaluacion } = await import('../src/app/views.js');
    const result = await importarEvaluacion(file);

    expect(result.sistemaCalif).toBe('1a10');
    expect(result.notaMaxima).toBe(10);
    expect(result.notas[0].nota).toBe(10);
    expect(result.notas[1].nota).toBe(4.6);
  });

  it('calculates correct grades for 0a7 system on import', async () => {
    const csv = createCSVContent({ sistemaCalif: '0a7', notaMaxima: 7, claveRespuestas: 'A,B,C,D,A' });
    const file = new File([csv], 'test.csv', { type: 'text/csv' });
    
    const { importarEvaluacion } = await import('../src/app/views.js');
    const result = await importarEvaluacion(file);

    expect(result.sistemaCalif).toBe('0a7');
    expect(result.notaMaxima).toBe(7);
    expect(result.notas[0].nota).toBe(7);
    expect(result.notas[1].nota).toBe(2.8);
  });
});

describe('CSV Export', () => {
  beforeEach(() => {
    resetState();
    document.body.innerHTML = '';
  });

  it('exports CSV without error for 1a5 system', async () => {
    setState({
      currentResumen: {
        ev: {
          nombre: 'Test Exam',
          fecha: '2026-03-29',
          periodo: '2026-1',
          numP: 5,
          numE: 2,
          sistemaCalif: '1a5',
          notaMaxima: 5,
          notaAprobacion: 3,
          pesoMode: 'igual',
          pesosPreguntas: [1, 1, 1, 1, 1],
          claveRespuestas: ['A', 'B', 'C', 'D', 'A'],
          estudiantesNombres: ['Juan', 'Maria'],
          estudiantesRespuestas: [
            ['A', 'B', 'C', 'D', 'A'],
            ['A', 'A', 'A', 'A', 'A'],
          ],
          estudiantesCalificados: [true, true],
        },
        analisisPorPregunta: [
          { pregunta: 1, aciertos: 2, porcentaje: 100 },
          { pregunta: 2, aciertos: 1, porcentaje: 50 },
        ],
        distribucionPorPregunta: [
          { pregunta: 1, clave: 'A', A: 2, B: 0, C: 0, D: 0 },
          { pregunta: 2, clave: 'B', A: 1, B: 1, C: 0, D: 0 },
        ],
      },
    });

    const { exportarCSV } = await import('../src/app/views.js');
    expect(() => exportarCSV()).not.toThrow();
  });

  it('exports CSV without error for 0a10 system', async () => {
    setState({
      currentResumen: {
        ev: {
          nombre: 'Math Test',
          fecha: '2026-03-29',
          periodo: '2026-1',
          numP: 10,
          numE: 3,
          sistemaCalif: '0a10',
          notaMaxima: 10,
          notaAprobacion: 6,
          pesoMode: 'igual',
          pesosPreguntas: new Array(10).fill(1),
          claveRespuestas: ['A', 'B', 'C', 'D', 'A', 'B', 'C', 'D', 'A', 'B'],
          estudiantesNombres: ['Student1', 'Student2', 'Student3'],
          estudiantesRespuestas: [
            ['A', 'B', 'C', 'D', 'A', 'B', 'C', 'D', 'A', 'B'],
            ['A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A'],
            ['B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B'],
          ],
          estudiantesCalificados: [true, true, true],
        },
        analisisPorPregunta: [],
        distribucionPorPregunta: [],
      },
    });

    const { exportarCSV } = await import('../src/app/views.js');
    expect(() => exportarCSV()).not.toThrow();
  });

  it('handles missing currentResumen gracefully', async () => {
    setState({ currentResumen: null });

    const { exportarCSV } = await import('../src/app/views.js');
    expect(() => exportarCSV()).not.toThrow();
  });

  it('uses default peso when pesosPreguntas is missing', async () => {
    setState({
      currentResumen: {
        ev: {
          nombre: 'Test',
          fecha: '',
          periodo: '',
          numP: 5,
          numE: 1,
          sistemaCalif: '1a5',
          notaMaxima: 5,
          notaAprobacion: 3,
          pesoMode: 'igual',
          pesosPreguntas: null,
          claveRespuestas: ['A', 'B', 'C', 'D', 'A'],
          estudiantesNombres: ['Juan'],
          estudiantesRespuestas: [['A', 'B', 'C', 'D', 'A']],
          estudiantesCalificados: [true],
        },
        analisisPorPregunta: [],
        distribucionPorPregunta: [],
      },
    });

    const { exportarCSV } = await import('../src/app/views.js');
    expect(() => exportarCSV()).not.toThrow();
  });
});

describe('PDF Export', () => {
  beforeEach(() => {
    resetState();
    document.body.innerHTML = '';
  });

  it('handles missing data gracefully (no currentResumen, no numP)', async () => {
    setState({
      currentResumen: null,
      numP: null,
      numE: null,
    });

    const { exportarPDF } = await import('../src/app/views.js');
    expect(() => exportarPDF()).not.toThrow();
  });

  it('handles state data without currentResumen', async () => {
    setState({
      currentResumen: null,
      numP: 5,
      numE: 2,
      evalMeta: { nombre: 'Test', fecha: '2026-03-29', periodo: '2026-1' },
      sistemaCalif: '1a5',
      claveRespuestas: ['A', 'B', 'C', 'D', 'A'],
      pesosPreguntas: [1, 1, 1, 1, 1],
      estudiantesNombres: ['Juan', 'Maria'],
      estudiantesRespuestas: [
        ['A', 'B', 'C', 'D', 'A'],
        ['A', 'A', 'A', 'A', 'A'],
      ],
      appSettings: { notaMaxima: 5, notaAprobacion: 3 },
    });

    const { exportarPDF } = await import('../src/app/views.js');
    expect(() => exportarPDF()).not.toThrow();
  });
});
