/**
 * @deprecated Tests for the legacy vanilla JS version (src/legacy/app/).
 * These tests reference deprecated code that is no longer used in the React version.
 * Kept for historical reference only.
 */
import { describe, it, expect, beforeEach } from 'vitest';

describe('IndexedDB Helpers', () => {
  it('should generate correct fotoKey', () => {
    const fotoKey = (evalId, stuIdx) => `${evalId}_${stuIdx}`;
    
    expect(fotoKey(1, 0)).toBe('1_0');
    expect(fotoKey(5, 3)).toBe('5_3');
    expect(fotoKey(100, 50)).toBe('100_50');
  });
});

describe('State Management', () => {
  it('should merge state updates correctly', () => {
    const state = { numP: 10, numE: 20, sistemaCalif: '1a5' };
    const updates = { numP: 15 };
    
    const newState = { ...state, ...updates };
    
    expect(newState.numP).toBe(15);
    expect(newState.numE).toBe(20);
    expect(newState.sistemaCalif).toBe('1a5');
  });
});