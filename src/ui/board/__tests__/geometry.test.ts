import { describe, expect, it } from 'vitest';

import {
  cellAtPoint,
  cellRect,
  computeMetrics,
  dragTarget,
  pairRect,
  tapTargetAt,
  wallRect,
  wallThickness,
  type TapContext,
} from '../geometry';

// 5 rows × 4 cols, cell 50, gap 6, padding 8 → width 8+4*50+3*6+8 = 234.
const m = computeMetrics(5, 4, 234, 1000, { gap: 6, padding: 8, maxCell: 50 });

describe('computeMetrics', () => {
  it('fits the limiting side', () => {
    expect(m.cell).toBe(50);
    expect(m.width).toBe(234);
    expect(m.height).toBe(8 + 5 * 50 + 4 * 6 + 8);
    // Height-limited.
    expect(computeMetrics(10, 9, 1000, 400, { gap: 6, padding: 8 }).cell).toBe(
      Math.floor((400 - 16 - 54) / 10),
    );
  });

  it('matches the plan: 9×10 on a 358-pt wide phone gives ~34-pt cells', () => {
    expect(computeMetrics(10, 9, 358, 2000, { gap: 6, padding: 0 }).cell).toBe(34);
  });

  it('never returns a negative size', () => {
    expect(computeMetrics(5, 4, 10, 10).cell).toBe(0);
  });
});

describe('cellRect / pairRect', () => {
  it('positions cells on the grid', () => {
    expect(cellRect(m, 0)).toEqual({ x: 8, y: 8, width: 50, height: 50 });
    expect(cellRect(m, 5)).toEqual({ x: 64, y: 64, width: 50, height: 50 });
  });

  it('spans both cells and the gap', () => {
    expect(pairRect(m, 1, 0)).toEqual({ x: 8, y: 8, width: 106, height: 50 });
    expect(pairRect(m, 0, 4)).toEqual({ x: 8, y: 8, width: 50, height: 106 });
  });
});

describe('cellAtPoint', () => {
  it('finds the cell under a point', () => {
    expect(cellAtPoint(m, 10, 10)).toBe(0);
    expect(cellAtPoint(m, 64 + 25, 64 + 25)).toBe(5);
  });

  it('snaps gap points to the nearest cell', () => {
    expect(cellAtPoint(m, 58 + 2, 20)).toBe(0); // left half of the gap
    expect(cellAtPoint(m, 58 + 4, 20)).toBe(1); // right half
  });

  it('returns -1 outside the grid', () => {
    expect(cellAtPoint(m, 0, 0)).toBe(-1);
    expect(cellAtPoint(m, 500, 20)).toBe(-1);
    expect(cellAtPoint(m, 20, 500)).toBe(-1);
  });
});

describe('dragTarget', () => {
  it('needs 35% of a cell before picking a neighbour', () => {
    expect(dragTarget(m, 5, 17, 0)).toBe(-1);
    expect(dragTarget(m, 5, 18, 0)).toBe(6);
  });

  it('follows the dominant axis', () => {
    expect(dragTarget(m, 5, 30, 20)).toBe(6);
    expect(dragTarget(m, 5, -10, 30)).toBe(9);
    expect(dragTarget(m, 5, 0, -30)).toBe(1);
    expect(dragTarget(m, 5, -30, 5)).toBe(4);
  });

  it('stays on the board', () => {
    expect(dragTarget(m, 3, 40, 0)).toBe(-1); // right edge
    expect(dragTarget(m, 4, -40, 0)).toBe(-1); // left edge, no wrap to cell 3
    expect(dragTarget(m, 1, 0, -40)).toBe(-1); // top edge
    expect(dragTarget(m, 17, 0, 40)).toBe(-1); // bottom edge
    expect(dragTarget(m, -1, 40, 0)).toBe(-1);
  });
});

describe('wallRect', () => {
  it('centres a bar in the gap between two cells, whatever their order', () => {
    // Cells 5 (64..114) and 6 (120..170) share the gap 114..120: centre 117.
    expect(wallRect(m, 5, 6, 4, 0.8)).toEqual({ x: 115, y: 69, width: 4, height: 40 });
    expect(wallRect(m, 6, 5, 4, 0.8)).toEqual(wallRect(m, 5, 6, 4, 0.8));
    // Cells 5 and 9 (one row down) share the gap y 114..120.
    expect(wallRect(m, 9, 5, 4, 0.8)).toEqual({ x: 69, y: 115, width: 40, height: 4 });
  });

  it('keeps the bar inside the gap', () => {
    expect(wallThickness(m)).toBe(4);
    expect(wallThickness(computeMetrics(10, 9, 358, 2000, { gap: 6, padding: 6 }))).toBeLessThanOrEqual(4);
    expect(wallThickness({ ...m, cell: 10 })).toBe(2);
  });
});

describe('tapTargetAt', () => {
  // Cell 5 spans 64..114 on both axes; cell 6 is to its right (120..170), cell 9 below it.
  const ctx = (walls: [number, number][], covered: number[] = []): TapContext => ({
    hasWall: (a, b) => walls.some(([x, y]) => (x === a && y === b) || (x === b && y === a)),
    isCovered: (cell) => covered.includes(cell),
  });

  it('hits the cell when there is no wall around', () => {
    expect(tapTargetAt(m, 80, 80, ctx([]))).toEqual({ kind: 'cell', cell: 5 });
    expect(tapTargetAt(m, 1, 1, ctx([]))).toBeNull();
  });

  it('hits a wall on the bar and in the gap, from either side', () => {
    const walls = ctx([[5, 6]]);
    expect(tapTargetAt(m, 117, 90, walls)).toEqual({ kind: 'wall', a: 5, b: 6 });
    expect(tapTargetAt(m, 115, 70, walls)).toEqual({ kind: 'wall', a: 5, b: 6 });
    expect(tapTargetAt(m, 119, 110, walls)).toEqual({ kind: 'wall', a: 5, b: 6 });
  });

  it('reaches a wall from anywhere in the nearer half of an empty cell', () => {
    const walls = ctx([[5, 6]]);
    expect(tapTargetAt(m, 90, 90, walls)).toEqual({ kind: 'wall', a: 5, b: 6 });
    expect(tapTargetAt(m, 88, 90, walls)).toEqual({ kind: 'cell', cell: 5 });
    expect(tapTargetAt(m, 140, 90, walls)).toEqual({ kind: 'wall', a: 5, b: 6 });
    expect(tapTargetAt(m, 165, 90, walls)).toEqual({ kind: 'cell', cell: 6 });
  });

  it('keeps most of a cell with a domino for the domino', () => {
    // 50-pt cell: the wall reaches min(10, 12.5) = 10 pt into it.
    const walls = ctx([[5, 6]], [5, 9]);
    expect(tapTargetAt(m, 106, 90, walls)).toEqual({ kind: 'wall', a: 5, b: 6 });
    expect(tapTargetAt(m, 100, 90, walls)).toEqual({ kind: 'cell', cell: 5 });
    expect(tapTargetAt(m, 80, 80, walls)).toEqual({ kind: 'cell', cell: 5 });
  });

  it('picks the nearest wall near a corner', () => {
    const walls = ctx([
      [5, 6],
      [5, 9],
    ]);
    expect(tapTargetAt(m, 110, 104, walls)).toEqual({ kind: 'wall', a: 5, b: 6 });
    expect(tapTargetAt(m, 104, 111, walls)).toEqual({ kind: 'wall', a: 5, b: 9 });
  });
});
