import { dominoCount, dominoId } from './dominoes';
import { getTopology } from './topology';
import type { CellIndex, Puzzle } from './types';

export interface SolveResult {
  /** Number of solutions found, never above the requested limit. */
  readonly count: number;
  /** True when the search stopped because it reached the limit (there may be more). */
  readonly capped: boolean;
  /** First solution found, as a partner array, or null if there is none. */
  readonly first: CellIndex[] | null;
}

/**
 * Exhaustive search that counts solutions up to `limit`.
 *
 * Dominosa is an exact-cover problem: every cell must be covered once and every
 * domino used once. This is Algorithm X with the minimum-remaining-values
 * heuristic over both kinds of constraint, on flat typed arrays. It solves a
 * 10×11 board in a few milliseconds, which is what the generator's hill
 * climbing needs.
 */
export function countSolutions(puzzle: Puzzle, limit = 2): SolveResult {
  const { rows, cols, cells, order } = puzzle;
  const topo = getTopology(rows, cols);
  const { edgeA, edgeB, cellEdges, edgeCount, cellCount } = topo;
  const total = dominoCount(order);

  const edgeDomino = new Int32Array(edgeCount);
  const dominoEdges: number[][] = Array.from({ length: total }, () => []);
  for (let e = 0; e < edgeCount; e++) {
    const d = dominoId(cells[edgeA[e]!]!, cells[edgeB[e]!]!, order);
    edgeDomino[e] = d;
    dominoEdges[d]!.push(e);
  }

  const cellFree = new Uint8Array(cellCount).fill(1);
  const dominoFree = new Uint8Array(total).fill(1);
  const chosen = new Int32Array(total);
  let depth = 0;
  let count = 0;
  let first: CellIndex[] | null = null;

  const isLive = (e: number): boolean =>
    cellFree[edgeA[e]!] === 1 && cellFree[edgeB[e]!] === 1 && dominoFree[edgeDomino[e]!] === 1;

  const recordSolution = (): void => {
    const partner = new Array<CellIndex>(cellCount).fill(-1);
    for (let k = 0; k < total; k++) {
      const e = chosen[k]!;
      partner[edgeA[e]!] = edgeB[e]!;
      partner[edgeB[e]!] = edgeA[e]!;
    }
    first = partner;
  };

  /** Returns true when the search should stop. */
  const search = (): boolean => {
    if (depth === total) {
      count += 1;
      if (first === null) recordSolution();
      return count >= limit;
    }

    // Pick the most constrained cell or domino.
    let bestEdges: readonly number[] | null = null;
    let bestCount = Number.POSITIVE_INFINITY;

    for (let c = 0; c < cellCount && bestCount > 1; c++) {
      if (cellFree[c] !== 1) continue;
      const edges = cellEdges[c]!;
      let n = 0;
      for (let k = 0; k < edges.length; k++) if (isLive(edges[k]!)) n++;
      if (n === 0) return false;
      if (n < bestCount) {
        bestCount = n;
        bestEdges = edges;
      }
    }
    for (let d = 0; d < total && bestCount > 1; d++) {
      if (dominoFree[d] !== 1) continue;
      const edges = dominoEdges[d]!;
      let n = 0;
      for (let k = 0; k < edges.length; k++) if (isLive(edges[k]!)) n++;
      if (n === 0) return false;
      if (n < bestCount) {
        bestCount = n;
        bestEdges = edges;
      }
    }
    if (bestEdges === null) return false;

    for (let k = 0; k < bestEdges.length; k++) {
      const e = bestEdges[k]!;
      if (!isLive(e)) continue;
      const a = edgeA[e]!;
      const b = edgeB[e]!;
      const d = edgeDomino[e]!;
      cellFree[a] = 0;
      cellFree[b] = 0;
      dominoFree[d] = 0;
      chosen[depth++] = e;
      const stop = search();
      depth--;
      cellFree[a] = 1;
      cellFree[b] = 1;
      dominoFree[d] = 1;
      if (stop) return true;
    }
    return false;
  };

  const capped = search();
  return { count, capped, first };
}

/** Whether the puzzle has exactly one solution. */
export function hasUniqueSolution(puzzle: Puzzle): boolean {
  return countSolutions(puzzle, 2).count === 1;
}

/** Any solution of the puzzle, or null if it has none. */
export function solve(puzzle: Puzzle): CellIndex[] | null {
  return countSolutions(puzzle, 1).first;
}
