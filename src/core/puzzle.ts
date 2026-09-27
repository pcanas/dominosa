import { dominoCount, dominoId } from './dominoes';
import { areAdjacent } from './topology';
import type { CellIndex, Pair, Pip, Puzzle, Solution } from './types';

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

/** Converts a partner array into the list of pairs (each pair once, sorted by first cell). */
export function solutionToPairs(solution: Solution): Pair[] {
  const pairs: Pair[] = [];
  solution.forEach((partner, cell) => {
    if (cell < partner) pairs.push({ a: cell, b: partner });
  });
  return pairs;
}

/** Converts pairs into a partner array. */
export function pairsToSolution(pairs: readonly Pair[], cellCount: number): CellIndex[] {
  const partner = new Array<CellIndex>(cellCount).fill(-1);
  for (const { a, b } of pairs) {
    partner[a] = b;
    partner[b] = a;
  }
  return partner;
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
 * Encodes a solution as one direction letter per cell, pointing at its partner:
 * R (right), L (left), D (down), U (up).
 */
export function encodeSolution(solution: Solution, cols: number): string {
  return solution
    .map((partner, cell) => {
      switch (partner - cell) {
        case 1:
          return 'R';
        case -1:
          return 'L';
        case cols:
          return 'D';
        case -cols:
          return 'U';
        default:
          throw new RangeError(`Cell ${cell} is not paired with a neighbour`);
      }
    })
    .join('');
}

export function decodeSolution(text: string, cols: number): CellIndex[] {
  const offsets: Record<string, number> = { R: 1, L: -1, D: cols, U: -cols };
  const partner = Array.from(text, (ch, cell) => {
    const offset = offsets[ch];
    if (offset === undefined) throw new SyntaxError(`Invalid direction "${ch}"`);
    return cell + offset;
  });
  partner.forEach((p, cell) => {
    if (partner[p] !== cell) throw new SyntaxError(`Inconsistent solution at cell ${cell}`);
  });
  return partner;
}
