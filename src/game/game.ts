/**
 * Game rules for a board being played: placing, replacing and removing
 * dominoes, undo and reset. Pure and serialisable, so it can be tested in
 * isolation, persisted as-is and driven by any UI.
 */
import { areAdjacent, dominoCount, dominoId, type CellIndex, type DominoId, type Puzzle } from '@/core';

export interface GameState {
  readonly puzzle: Puzzle;
  /** `partner[i]` is the other cell of the domino covering `i`, or -1 when `i` is empty. */
  readonly partner: readonly CellIndex[];
  /** Previous `partner` snapshots, most recent last. */
  readonly past: readonly (readonly CellIndex[])[];
}

export type GameAction =
  /** Place a domino on two adjacent cells, replacing any domino that overlaps them. */
  | { readonly type: 'place'; readonly a: CellIndex; readonly b: CellIndex }
  /** Remove the domino covering a cell. */
  | { readonly type: 'remove'; readonly cell: CellIndex }
  | { readonly type: 'undo' }
  | { readonly type: 'reset' };

export interface PlacedTile {
  /** Top/left cell. */
  readonly a: CellIndex;
  /** Bottom/right cell. */
  readonly b: CellIndex;
  readonly domino: DominoId;
  /** True when the same domino is placed more than once on the board. */
  readonly duplicate: boolean;
}

/** Undo history is capped to keep persisted state small. */
export const MAX_UNDO = 500;

export function createGame(puzzle: Puzzle): GameState {
  return { puzzle, partner: new Array<CellIndex>(puzzle.cells.length).fill(-1), past: [] };
}

/**
 * Applies an action. Returns the same object when nothing changes, so callers
 * can skip re-renders and haptics. A solved board is locked except for reset.
 */
export function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === 'reset') {
    return state.partner.every((p) => p === -1) ? state : commit(state, createGame(state.puzzle).partner);
  }
  if (isSolved(state)) return state;

  switch (action.type) {
    case 'place': {
      const { a, b } = action;
      const size = state.partner.length;
      if (a < 0 || b < 0 || a >= size || b >= size) return state;
      if (!areAdjacent(a, b, state.puzzle.cols)) return state;
      if (state.partner[a] === b) return state;
      const next = [...state.partner];
      for (const cell of [a, b]) {
        const other = next[cell]!;
        if (other >= 0) {
          next[other] = -1;
          next[cell] = -1;
        }
      }
      next[a] = b;
      next[b] = a;
      return commit(state, next);
    }
    case 'remove': {
      const other = state.partner[action.cell];
      if (other === undefined || other < 0) return state;
      const next = [...state.partner];
      next[action.cell] = -1;
      next[other] = -1;
      return commit(state, next);
    }
    case 'undo': {
      const previous = state.past[state.past.length - 1];
      if (!previous) return state;
      return { ...state, partner: previous, past: state.past.slice(0, -1) };
    }
  }
}

function commit(state: GameState, partner: readonly CellIndex[]): GameState {
  const past = [...state.past, state.partner];
  if (past.length > MAX_UNDO) past.shift();
  return { ...state, partner, past };
}

// --- Selectors ---------------------------------------------------------------

export function placedTiles(state: GameState): PlacedTile[] {
  const { puzzle, partner } = state;
  const tiles: { a: number; b: number; domino: number }[] = [];
  const uses = new Uint16Array(dominoCount(puzzle.order));
  partner.forEach((b, a) => {
    if (b > a) {
      const domino = dominoId(puzzle.cells[a]!, puzzle.cells[b]!, puzzle.order);
      uses[domino] = (uses[domino] ?? 0) + 1;
      tiles.push({ a, b, domino });
    }
  });
  return tiles.map((t) => ({ ...t, duplicate: uses[t.domino]! > 1 }));
}

export function coveredCellCount(state: GameState): number {
  return state.partner.reduce((n, p) => (p >= 0 ? n + 1 : n), 0);
}

/**
 * Solved when every cell is covered and no domino repeats. With the full set
 * and a full board this is exactly "each domino used once", so any such board
 * is a valid solution (and, for our levels, the unique one).
 */
export function isSolved(state: GameState): boolean {
  if (coveredCellCount(state) !== state.partner.length) return false;
  return placedTiles(state).every((t) => !t.duplicate);
}

export function canUndo(state: GameState): boolean {
  return state.past.length > 0 && !isSolved(state);
}
