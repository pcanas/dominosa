import { dominoCount, dominoId } from './dominoes';
import { areAdjacent } from './topology';
import type { CellIndex, Pip, Puzzle, Solution } from './types';

/** Builds a puzzle, checking that its shape is consistent with its order. */
export function createPuzzle(order: number, rows: number, cols: number, cells: readonly Pip[]): Puzzle {
  if (!Number.isInteger(order) || order < 0) throw new RangeError(`Invalid order ${order}`);
  if (rows * cols !== cells.length) {
    throw new RangeError(`Expected ${rows * cols} cells, got ${cells.length}`);
  }
  if (rows * cols !== 2 * dominoCount(order)) {
    throw new RangeError(`A ${rows}x${cols} grid cannot hold the double-${order} set`);
  }
  for (const pip of cells) {
    if (!Number.isInteger(pip) || pip < 0 || pip > order) {
      throw new RangeError(`Pip ${pip} is out of range for order ${order}`);
    }
  }
  return { order, rows, cols, cells: [...cells] };
}

export type SolutionCheck =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'incomplete' | 'not-adjacent' | 'duplicate-domino' };

/** Checks that `solution` tiles the grid with every domino of the set exactly once. */
export function checkSolution(puzzle: Puzzle, solution: Solution): SolutionCheck {
  const { cols, cells, order } = puzzle;
  if (solution.length !== cells.length) return { ok: false, reason: 'incomplete' };
  const seen = new Uint8Array(dominoCount(order));
  for (let i = 0; i < solution.length; i++) {
    const j = solution[i]!;
    if (j < 0 || j >= cells.length || solution[j] !== i) return { ok: false, reason: 'incomplete' };
    if (!areAdjacent(i, j, cols)) return { ok: false, reason: 'not-adjacent' };
    if (i < j) {
      const d = dominoId(cells[i]!, cells[j]!, order);
      if (seen[d]) return { ok: false, reason: 'duplicate-domino' };
      seen[d] = 1;
    }
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Compact text encoding used by level files (~2 bytes per cell).
// ---------------------------------------------------------------------------

/** Encodes pips as a digit string, row-major. Supports orders up to 9. */
export function encodeCells(cells: readonly Pip[]): string {
  return cells
    .map((pip) => {
      if (pip < 0 || pip > 9) throw new RangeError(`Pip ${pip} cannot be encoded as a digit`);
      return String(pip);
    })
    .join('');
}

export function decodeCells(text: string): Pip[] {
  return Array.from(text, (ch) => {
    const pip = ch.charCodeAt(0) - 48;
    if (pip < 0 || pip > 9) throw new SyntaxError(`Invalid pip character "${ch}"`);
    return pip;
  });
}

/**
 * Encodes partners as one letter per cell pointing at its partner: R (right),
 * L (left), D (down), U (up), or `.` for a free cell. Used by level solutions
 * (never free) and saved boards.
 */
export function encodePartners(partner: readonly CellIndex[], cols: number): string {
  return partner
    .map((p, cell) => {
      if (p === -1) return '.';
      if (!areAdjacent(cell, p, cols)) throw new RangeError(`Cells ${cell} and ${p} are not adjacent`);
      if (p === cell + 1) return 'R';
      if (p === cell - 1) return 'L';
      return p > cell ? 'D' : 'U';
    })
    .join('');
}

/**
 * Partner array for encoded partners, without checking it: `.` is -1 and an
 * unknown letter is NaN. Callers validate the result their own way.
 */
export function decodePartners(text: string, cols: number): number[] {
  const offsets: Record<string, number> = { R: 1, L: -1, D: cols, U: -cols };
  return Array.from(text, (ch, cell) => {
    if (ch === '.') return -1;
    const offset = offsets[ch];
    return offset === undefined ? Number.NaN : cell + offset;
  });
}

/** Encodes a complete solution (every cell paired with a neighbour). */
export function encodeSolution(solution: Solution, cols: number): string {
  const free = solution.indexOf(-1);
  if (free >= 0) throw new RangeError(`Cell ${free} is not paired`);
  return encodePartners(solution, cols);
}

export function decodeSolution(text: string, cols: number): CellIndex[] {
  const invalid = Array.from(text).find((ch) => !'RLDU'.includes(ch));
  if (invalid !== undefined) throw new SyntaxError(`Invalid direction "${invalid}"`);
  const partner = decodePartners(text, cols);
  partner.forEach((p, cell) => {
    if (partner[p] !== cell || !areAdjacent(cell, p, cols)) {
      throw new SyntaxError(`Inconsistent solution at cell ${cell}`);
    }
  });
  return partner;
}
