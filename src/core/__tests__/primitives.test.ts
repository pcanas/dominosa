import { describe, expect, it } from 'vitest';

import { dominoCount, dominoId, dominoPips, gridShape } from '../dominoes';
import {
  checkSolution,
  createPuzzle,
  decodeCells,
  decodeSolution,
  encodeCells,
  encodeSolution,
  pairsToSolution,
  solutionToPairs,
} from '../puzzle';
import { createRng } from '../rng';
import { areAdjacent, getTopology } from '../topology';
import { ORDER1_UNIQUE, ORDER1_UNIQUE_SOLUTION } from './fixtures';

describe('dominoes', () => {
  it('counts the double-n set', () => {
    expect([0, 1, 3, 6, 9].map(dominoCount)).toEqual([1, 3, 10, 28, 55]);
  });

  it('uses a portrait (n+2) × (n+1) grid that holds exactly two cells per domino', () => {
    for (let n = 0; n <= 9; n++) {
      const { rows, cols } = gridShape(n);
      expect(rows).toBe(cols + 1);
      expect(rows * cols).toBe(2 * dominoCount(n));
    }
  });

  it('maps every pair of pips to a unique, order-independent id and back', () => {
    for (const order of [0, 3, 6, 9]) {
      const seen = new Set<number>();
      for (let x = 0; x <= order; x++) {
        for (let y = x; y <= order; y++) {
          const id = dominoId(x, y, order);
          expect(dominoId(y, x, order)).toBe(id);
          expect(dominoPips(id, order)).toEqual([x, y]);
          seen.add(id);
        }
      }
      expect([...seen].sort((a, b) => a - b)).toEqual([...Array(dominoCount(order)).keys()]);
    }
  });

  it('rejects out-of-range ids', () => {
    expect(() => dominoPips(10, 3)).toThrow(RangeError);
  });
});

describe('topology', () => {
  it('enumerates every slot of the grid once', () => {
    const topo = getTopology(4, 3);
    // 4 rows × 2 horizontal slots + 3 rows × 3 vertical slots
    expect(topo.edgeCount).toBe(4 * 2 + 3 * 3);
    for (let e = 0; e < topo.edgeCount; e++) {
      expect(topo.edgeBetween(topo.edgeA[e]!, topo.edgeB[e]!)).toBe(e);
      expect(topo.edgeBetween(topo.edgeB[e]!, topo.edgeA[e]!)).toBe(e);
    }
  });

  it('does not wrap around rows', () => {
    const topo = getTopology(4, 3);
    expect(topo.edgeBetween(2, 3)).toBe(-1);
    expect(areAdjacent(2, 3, 3)).toBe(false);
    expect(areAdjacent(0, 3, 3)).toBe(true);
    expect(areAdjacent(0, 4, 3)).toBe(false);
  });

  it('is memoised per shape', () => {
    expect(getTopology(5, 4)).toBe(getTopology(5, 4));
  });
});

describe('puzzle', () => {
  it('validates shape and pips', () => {
    expect(() => createPuzzle(1, 3, 2, [0, 0, 1, 1, 0])).toThrow(RangeError);
    expect(() => createPuzzle(1, 2, 2, [0, 0, 1, 1])).toThrow(RangeError);
    expect(() => createPuzzle(1, 3, 2, [0, 0, 1, 1, 0, 2])).toThrow(RangeError);
  });

  it('checks solutions', () => {
    expect(checkSolution(ORDER1_UNIQUE, ORDER1_UNIQUE_SOLUTION)).toEqual({ ok: true });
    // T1 on this grid uses 0-1 twice.
    expect(checkSolution(ORDER1_UNIQUE, [1, 0, 3, 2, 5, 4])).toEqual({
      ok: false,
      reason: 'duplicate-domino',
    });
    expect(checkSolution(ORDER1_UNIQUE, [1, 0, 3, 2, 5])).toEqual({ ok: false, reason: 'incomplete' });
    expect(checkSolution(ORDER1_UNIQUE, [3, 2, 1, 0, 5, 4])).toEqual({ ok: false, reason: 'not-adjacent' });
  });

  it('round-trips the compact level encoding', () => {
    const cells = [0, 1, 0, 1, 1, 0];
    expect(decodeCells(encodeCells(cells))).toEqual(cells);
    const text = encodeSolution(ORDER1_UNIQUE_SOLUTION, 2);
    expect(text).toBe('DDUURL');
    expect(decodeSolution(text, 2)).toEqual(ORDER1_UNIQUE_SOLUTION);
    expect(() => decodeSolution('DDUURR', 2)).toThrow(SyntaxError);
    // On a 2×3 grid, cell 2 (end of row 0) 'R' + cell 3 (start of row 1) 'L' would wrap around.
    expect(() => decodeSolution('RLRLRL', 3)).toThrow(SyntaxError);
    expect(() => decodeCells('01x')).toThrow(SyntaxError);
  });

  it('converts between pairs and partner arrays', () => {
    const pairs = solutionToPairs(ORDER1_UNIQUE_SOLUTION);
    expect(pairs).toEqual([
      { a: 0, b: 2 },
      { a: 1, b: 3 },
      { a: 4, b: 5 },
    ]);
    expect(pairsToSolution(pairs, 6)).toEqual(ORDER1_UNIQUE_SOLUTION);
  });
});

describe('rng', () => {
  it('is deterministic per seed', () => {
    const a = createRng('seed-1');
    const b = createRng('seed-1');
    const c = createRng('seed-2');
    const seqA = Array.from({ length: 5 }, () => a.next());
    expect(Array.from({ length: 5 }, () => b.next())).toEqual(seqA);
    expect(Array.from({ length: 5 }, () => c.next())).not.toEqual(seqA);
  });

  it('produces integers in range and valid permutations', () => {
    const rng = createRng(42);
    for (let i = 0; i < 1000; i++) {
      const v = rng.int(7);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(7);
    }
    expect(rng.shuffle([...Array(20).keys()]).sort((x, y) => x - y)).toEqual([...Array(20).keys()]);
  });
});
