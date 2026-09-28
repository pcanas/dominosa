/**
 * Game rules for a board being played: placing, replacing and removing
 * dominoes, wall marks, undo and reset. Pure and serialisable, so it can be
 * tested in isolation, persisted and driven by any UI.
 */
import {
  areAdjacent,
  dominoCount,
  dominoId,
  getTopology,
  type CellIndex,
  type DominoId,
  type Pair,
  type Puzzle,
} from '@/core';

/** Index of a domino slot (two adjacent cells) in the puzzle's {@link getTopology}. */
export type EdgeIndex = number;

export interface GameState {
  readonly puzzle: Puzzle;
  /** `partner[i]` is the other cell of the domino covering `i`, or -1 when `i` is empty. */
  readonly partner: readonly CellIndex[];
  /**
   * `walls[e]` is true when the player marked edge `e` as "these two cells
   * cannot be one domino". A walled edge never holds a domino.
   */
  readonly walls: readonly boolean[];
  /** Undo history: what each step changed, most recent last. */
  readonly past: readonly Change[];
}

/** What one step changed, enough to revert it. Small, so history is cheap to keep and save. */
export interface Change {
  /** Cells whose partner changed… */
  readonly cells: readonly CellIndex[];
  /** …and the partner each of them had before, in the same order. */
  readonly partners: readonly CellIndex[];
  /** Edges whose wall mark flipped. */
  readonly walls: readonly EdgeIndex[];
}

export type GameAction =
  /** Place a domino on two adjacent cells, replacing any domino that overlaps them. Blocked by a wall. */
  | { readonly type: 'place'; readonly a: CellIndex; readonly b: CellIndex }
  /** Remove the domino covering a cell. */
  | { readonly type: 'remove'; readonly cell: CellIndex }
  /** Mark or unmark the edge between two adjacent cells as a wall; a domino lying there is removed. */
  | { readonly type: 'toggleWall'; readonly a: CellIndex; readonly b: CellIndex }
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
  const { edgeCount } = getTopology(puzzle.rows, puzzle.cols);
  return {
    puzzle,
    partner: new Array<CellIndex>(puzzle.cells.length).fill(-1),
    walls: new Array<boolean>(edgeCount).fill(false),
    past: [],
  };
}

/**
 * Applies an action. Returns the same object when nothing changes, so callers
 * can skip re-renders and haptics.
 *
 * A solved board is locked; reset is the only way out and starts a brand-new
 * attempt with no history (so undo can never bring back a solved board).
 * Resetting an unsolved board clears dominoes and walls, and can be undone.
 */
export function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === 'reset') {
    if (isSolved(state)) return createGame(state.puzzle);
    const blank = createGame(state.puzzle);
    return commit(state, blank.partner, blank.walls);
  }
  if (isSolved(state)) return state;

  switch (action.type) {
    case 'place': {
      const { a, b } = action;
      const edge = edgeOf(state, a, b);
      if (edge < 0 || state.walls[edge] || state.partner[a] === b) return state;
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
      return commit(state, next, state.walls);
    }
    case 'remove': {
      const other = state.partner[action.cell];
      if (other === undefined || other < 0) return state;
      const next = [...state.partner];
      next[action.cell] = -1;
      next[other] = -1;
      return commit(state, next, state.walls);
    }
    case 'toggleWall': {
      const { a, b } = action;
      const edge = edgeOf(state, a, b);
      if (edge < 0) return state;
      const walls = [...state.walls];
      walls[edge] = !walls[edge];
      if (state.partner[a] !== b) return commit(state, state.partner, walls);
      const next = [...state.partner];
      next[a] = -1;
      next[b] = -1;
      return commit(state, next, walls);
    }
    case 'undo': {
      const change = state.past[state.past.length - 1];
      if (!change) return state;
      const { partner, walls } = revert(state.partner, state.walls, change);
      return { ...state, partner, walls, past: state.past.slice(0, -1) };
    }
  }
}

/** Edge between two cells of the game's grid, or -1 when they are not adjacent (or off the board). */
function edgeOf(state: GameState, a: CellIndex, b: CellIndex): EdgeIndex {
  const size = state.partner.length;
  if (a < 0 || b < 0 || a >= size || b >= size) return -1;
  if (!areAdjacent(a, b, state.puzzle.cols)) return -1;
  return getTopology(state.puzzle.rows, state.puzzle.cols).edgeBetween(a, b);
}

/** Records the step from `state` to (`partner`, `walls`); returns `state` itself when nothing differs. */
function commit(state: GameState, partner: readonly CellIndex[], walls: readonly boolean[]): GameState {
  const cells: CellIndex[] = [];
  const partners: CellIndex[] = [];
  state.partner.forEach((p, cell) => {
    if (partner[cell] !== p) {
      cells.push(cell);
      partners.push(p);
    }
  });
  const flipped: EdgeIndex[] = [];
  state.walls.forEach((w, edge) => {
    if (walls[edge] !== w) flipped.push(edge);
  });
  if (cells.length === 0 && flipped.length === 0) return state;

  const past = [...state.past, { cells, partners, walls: flipped }];
  if (past.length > MAX_UNDO) past.shift();
  return { ...state, partner, walls, past };
}

/** Board before `change` was applied. */
export function revert(
  partner: readonly CellIndex[],
  walls: readonly boolean[],
  change: Change,
): { partner: CellIndex[]; walls: boolean[] } {
  const nextPartner = [...partner];
  change.cells.forEach((cell, i) => {
    nextPartner[cell] = change.partners[i]!;
  });
  const nextWalls = [...walls];
  for (const edge of change.walls) nextWalls[edge] = !nextWalls[edge];
  return { partner: nextPartner, walls: nextWalls };
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

/** Walled edges as cell pairs (top/left cell first). */
export function wallPairs(state: GameState): Pair[] {
  const topo = getTopology(state.puzzle.rows, state.puzzle.cols);
  const pairs: Pair[] = [];
  state.walls.forEach((w, edge) => {
    if (w) pairs.push({ a: topo.edgeA[edge]!, b: topo.edgeB[edge]! });
  });
  return pairs;
}

/** Whether there is a wall between two cells. */
export function hasWall(state: GameState, a: CellIndex, b: CellIndex): boolean {
  const edge = edgeOf(state, a, b);
  return edge >= 0 && state.walls[edge] === true;
}

export function coveredCellCount(state: GameState): number {
  return state.partner.reduce((n, p) => (p >= 0 ? n + 1 : n), 0);
}

/** Nothing on the board: no dominoes and no walls (history may still exist). */
export function isBlank(state: GameState): boolean {
  return state.partner.every((p) => p === -1) && state.walls.every((w) => !w);
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
