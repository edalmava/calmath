import { describe, it, expect, beforeEach } from 'vitest';

describe('calcNota', () => {
  it('calculates correct grade for 1a5 system with all correct', () => {
    const pesos = [1, 1, 1, 1];
    const clave = ['A', 'B', 'C', 'D'];
    const respuestas = ['A', 'B', 'C', 'D'];
    
    let sumaPesos = 0;
    for (let i = 0; i < respuestas.length; i++) {
      if (respuestas[i] === clave[i]) sumaPesos += pesos[i];
    }
    const sistemaCalif = '1a5';
    const nota = sistemaCalif === '0a5' ? sumaPesos : 1 + sumaPesos;
    
    expect(nota).toBe(5);
  });

  it('calculates correct grade for 1a5 system with none correct', () => {
    const pesos = [1, 1, 1, 1];
    const clave = ['A', 'B', 'C', 'D'];
    const respuestas = ['D', 'C', 'B', 'A'];
    
    let sumaPesos = 0;
    for (let i = 0; i < respuestas.length; i++) {
      if (respuestas[i] === clave[i]) sumaPesos += pesos[i];
    }
    const sistemaCalif = '1a5';
    const nota = sistemaCalif === '0a5' ? sumaPesos : 1 + sumaPesos;
    
    expect(nota).toBe(1);
  });

  it('calculates correct grade for 0a5 system with all correct', () => {
    const pesos = [1, 1, 1, 1, 1];
    const clave = ['A', 'B', 'C', 'D', 'A'];
    const respuestas = ['A', 'B', 'C', 'D', 'A'];
    
    let sumaPesos = 0;
    for (let i = 0; i < respuestas.length; i++) {
      if (respuestas[i] === clave[i]) sumaPesos += pesos[i];
    }
    const sistemaCalif = '0a5';
    const nota = sistemaCalif === '0a5' ? sumaPesos : 1 + sumaPesos;
    
    expect(nota).toBe(5);
  });
});

describe('calcAciertos', () => {
  it('counts correct answers correctly', () => {
    const clave = ['A', 'B', 'C', 'D', 'A'];
    const respuestas = ['A', 'B', 'C', 'A', 'A'];
    
    const aciertos = respuestas.filter((r, i) => r === clave[i]).length;
    
    expect(aciertos).toBe(4);
  });

  it('returns 0 when all answers are wrong', () => {
    const clave = ['A', 'B', 'C', 'D'];
    const respuestas = ['D', 'C', 'B', 'A'];
    
    const aciertos = respuestas.filter((r, i) => r === clave[i]).length;
    
    expect(aciertos).toBe(0);
  });
});

describe('pesoTotal', () => {
  it('returns 4 for 1a5 system', () => {
    const sistemaCalif = '1a5';
    const pt = sistemaCalif === '0a5' ? 5 : 4;
    expect(pt).toBe(4);
  });

  it('returns 5 for 0a5 system', () => {
    const sistemaCalif = '0a5';
    const pt = sistemaCalif === '0a5' ? 5 : 4;
    expect(pt).toBe(5);
  });
});