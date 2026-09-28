/**
 * The pair tracker: every domino of the set, how many times it is on the
 * board, and where it could still go.
 */
import { dominoCount, dominoId, dominoPips, getTopology, type DominoId, type Pair, type Pip } from '@/core';

import type { GameState } from './game';

export interface TrackedPair {
  readonly domino: DominoId;
  /** Lower pip first. */
  readonly pips: readonly [Pip, Pip];
  /** Times it is on the board: 0 still to place, 1 placed, more is an error. */
  readonly placed: number;
}

/** Every domino of the set, in set order (0-0, 0-1, …, n-n). */
export function trackPairs(state: GameState): TrackedPair[] {
  const { puzzle, partner } = state;
  const uses = new Array<number>(dominoCount(puzzle.order)).fill(0);
  partner.forEach((b, a) => {
    if (b > a) uses[dominoId(puzzle.cells[a]!, puzzle.cells[b]!, puzzle.order)]! += 1;
  });
  return uses.map((placed, domino) => ({ domino, pips: dominoPips(domino, puzzle.order), placed }));
}

export interface PairSlots {
  /** Where this domino is on the board now. */
  readonly placed: readonly Pair[];
  /** Slots showing its two numbers that are still free: both cells empty and no wall between them. */
  readonly open: readonly Pair[];
}

/** Where a domino is, and where it could still go on the current board. */
export function pairSlots(state: GameState, domino: DominoId): PairSlots {
  const { puzzle, partner, walls } = state;
  const topo = getTopology(puzzle.rows, puzzle.cols);
  const placed: Pair[] = [];
  const open: Pair[] = [];
  for (let e = 0; e < topo.edgeCount; e++) {
    const a = topo.edgeA[e]!;
    const b = topo.edgeB[e]!;
    if (dominoId(puzzle.cells[a]!, puzzle.cells[b]!, puzzle.order) !== domino) continue;
    if (partner[a] === b) placed.push({ a, b });
    else if (!walls[e] && partner[a] === -1 && partner[b] === -1) open.push({ a, b });
  }
  return { placed, open };
}
