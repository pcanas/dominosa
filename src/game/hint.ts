/**
 * Hints: what to show a player who asks for help on the board they have now.
 *
 *  1. Mistakes first: a domino that is not in the solution, or a wall between
 *     two cells the solution joins. While one is on the board, no logical step
 *     can be trusted, so the hint points at it (the most recent one first).
 *  2. Otherwise, the easiest logical step from the player's position, found by
 *     the deduction engine that grades the levels: the player's dominoes are
 *     placed and their walls ruled out first, so the step builds on their work.
 *  3. If no step is found (it never happens on the bundled levels, the tests
 *     check it), a domino of the solution is revealed.
 *
 * Pure: hints are worked out from the game and the level's stored solution.
 */
import {
  DeductionBoard,
  dominoId,
  getTopology,
  type CellIndex,
  type Deduction,
  type DominoId,
  type Pair,
  type TechniqueLevel,
} from '@/core';

import { isSolved, type GameAction, type GameState } from './game';

/** Something on the board that the solution does not have. */
export type Mistake =
  /** A domino on two cells the solution does not join. */
  | { readonly kind: 'domino'; readonly pair: Pair; readonly domino: DominoId }
  /** A wall between two cells the solution joins. */
  | { readonly kind: 'wall'; readonly pair: Pair; readonly domino: DominoId };

export type Hint =
  | {
      readonly kind: 'mistake';
      readonly mistake: Mistake;
      /** Mistakes on the board, this one included. */
      readonly count: number;
    }
  | { readonly kind: 'step'; readonly step: Deduction }
  | { readonly kind: 'reveal'; readonly pair: Pair; readonly domino: DominoId };

/**
 * The hint for the board as it is, or null once it is solved.
 * `maxLevel` caps the techniques used (the tests use it to reach the fallback).
 */
export function nextHint(
  game: GameState,
  solution: readonly CellIndex[],
  maxLevel: TechniqueLevel = 3,
): Hint | null {
  if (isSolved(game)) return null;

  const mistakes = findMistakes(game, solution);
  if (mistakes.length > 0) return { kind: 'mistake', mistake: mistakes[0]!, count: mistakes.length };

  const { puzzle, partner, walls } = game;
  const topo = getTopology(puzzle.rows, puzzle.cols);
  const board = DeductionBoard.fromPuzzle(puzzle);
  partner.forEach((b, a) => {
    if (b > a) board.place({ a, b });
  });
  walls.forEach((wall, edge) => {
    if (wall) board.eliminate({ a: topo.edgeA[edge]!, b: topo.edgeB[edge]! });
  });
  const step = board.next(maxLevel);
  if (step) return { kind: 'step', step };

  // Safety net: show where a domino of the solution goes, the first one still missing.
  const a = solution.findIndex((b, cell) => b > cell && partner[cell] !== b);
  if (a < 0) return null;
  const pair = { a, b: solution[a]! };
  return { kind: 'reveal', pair, domino: dominoOn(game, pair) };
}

/**
 * Every mistake on the board, the most recently made first (by the undo
 * history; mistakes older than the history follow in board order).
 */
export function findMistakes(game: GameState, solution: readonly CellIndex[]): Mistake[] {
  const { puzzle, partner, walls, past } = game;
  const topo = getTopology(puzzle.rows, puzzle.cols);

  // When each cell and each edge last changed (higher is more recent, -1 before the history).
  const cellChanged = new Array<number>(partner.length).fill(-1);
  const edgeChanged = new Array<number>(walls.length).fill(-1);
  past.forEach((change, step) => {
    for (const cell of change.cells) cellChanged[cell] = step;
    for (const edge of change.walls) edgeChanged[edge] = step;
  });

  const found: { mistake: Mistake; changed: number }[] = [];
  partner.forEach((b, a) => {
    if (b > a && solution[a] !== b) {
      const pair = { a, b };
      found.push({
        mistake: { kind: 'domino', pair, domino: dominoOn(game, pair) },
        changed: Math.max(cellChanged[a]!, cellChanged[b]!),
      });
    }
  });
  walls.forEach((wall, edge) => {
    const a = topo.edgeA[edge]!;
    const b = topo.edgeB[edge]!;
    if (wall && solution[a] === b) {
      const pair = { a, b };
      found.push({
        mistake: { kind: 'wall', pair, domino: dominoOn(game, pair) },
        changed: edgeChanged[edge]!,
      });
    }
  });
  return found
    .sort((x, y) => y.changed - x.changed || x.mistake.pair.a - y.mistake.pair.a)
    .map(({ mistake }) => mistake);
}

/**
 * What "Do it" does for a hint, as one move (one step to undo): remove the
 * mistake, place the domino, or draw walls on every slot the step rules out.
 */
export function hintAction(hint: Hint): GameAction {
  switch (hint.kind) {
    case 'mistake':
      return hint.mistake.kind === 'domino'
        ? { type: 'remove', cell: hint.mistake.pair.a }
        : { type: 'removeWall', a: hint.mistake.pair.a, b: hint.mistake.pair.b };
    case 'reveal':
      return { type: 'place', a: hint.pair.a, b: hint.pair.b };
    case 'step':
      return hint.step.place
        ? { type: 'place', a: hint.step.place.a, b: hint.step.place.b }
        : { type: 'addWalls', pairs: hint.step.eliminate };
  }
}

/** Cells a hint points at first ("Look here"). A mistake is only located on the second tap. */
export function hintFocus(hint: Hint): readonly CellIndex[] {
  switch (hint.kind) {
    case 'mistake':
      return [hint.mistake.pair.a, hint.mistake.pair.b];
    case 'reveal':
      return [hint.pair.a, hint.pair.b];
    case 'step':
      return hint.step.focus;
  }
}

function dominoOn(game: GameState, { a, b }: Pair): DominoId {
  const { cells, order } = game.puzzle;
  return dominoId(cells[a]!, cells[b]!, order);
}
