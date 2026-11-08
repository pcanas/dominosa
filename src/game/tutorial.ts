/**
 * The guided tutorial's script, worked out from its board, so the board can be
 * regenerated without rewriting the steps:
 *
 *  1. place    swipe a domino of the solution whose two numbers also sit side
 *              by side somewhere else on the board;
 *  2. remove   the coach puts the same domino in that other spot, where it shows
 *              as repeated: tap it away (each domino appears once);
 *  3. wall     that is why those two cells can never pair up: draw a wall there;
 *  4. hint     ask for a hint, which places the next domino;
 *  5. finish   complete the board alone.
 *
 * Pure: used by the tutorial screen, by the level generator to pick a board
 * the script works on, and by the tests.
 */
import { dominoId, getTopology, type CellIndex, type Pair, type Puzzle } from '@/core';

import { createGame, gameReducer, type GameState } from './game';
import { nextHint } from './hint';

export interface TutorialPlan {
  /** Step 1: a domino of the solution… */
  readonly first: Pair;
  /** …whose numbers also sit side by side here, away from it (steps 2 and 3). */
  readonly duplicate: Pair;
  /** Step 4: the domino the hint places once `first` is down and `duplicate` walled off. */
  readonly hint: Pair;
}

export type TutorialStep = 'place' | 'remove' | 'wall' | 'hint' | 'finish';
export const TUTORIAL_STEPS: readonly TutorialStep[] = ['place', 'remove', 'wall', 'hint', 'finish'];

/** The script for a board, or null when it cannot be taught on it. */
export function tutorialPlan(puzzle: Puzzle, solution: readonly CellIndex[]): TutorialPlan | null {
  const { cells, order } = puzzle;
  const topo = getTopology(puzzle.rows, puzzle.cols);
  const domino = (a: CellIndex, b: CellIndex) => dominoId(cells[a]!, cells[b]!, order);

  // The first domino of the solution, in board order, that has a twin slot away from it.
  for (let a = 0; a < solution.length; a++) {
    const b = solution[a]!;
    if (b < a) continue;
    const first = { a, b };
    let duplicate: Pair | null = null;
    for (let e = 0; e < topo.edgeCount && !duplicate; e++) {
      const x = topo.edgeA[e]!;
      const y = topo.edgeB[e]!;
      const apart = x !== a && x !== b && y !== a && y !== b;
      if (apart && domino(x, y) === domino(a, b)) duplicate = { a: x, b: y };
    }
    if (!duplicate) continue;

    const walled = gameReducer(gameReducer(createGame(puzzle), { type: 'place', ...first }), {
      type: 'addWall',
      ...duplicate,
    });
    const next = nextHint(walled, solution);
    if (next?.kind === 'step' && next.step.place) return { first, duplicate, hint: next.step.place };
  }
  return null;
}

/** The board at the start of a step, as the script leaves it. */
export function tutorialBoard(puzzle: Puzzle, plan: TutorialPlan, step: TutorialStep): GameState {
  let game = createGame(puzzle);
  const index = TUTORIAL_STEPS.indexOf(step);
  if (index >= 1) game = gameReducer(game, { type: 'place', ...plan.first });
  // The coach's repeated domino is on the board while the player is asked to remove it.
  if (index === 1) game = gameReducer(game, { type: 'place', ...plan.duplicate });
  if (index >= 3) game = gameReducer(game, { type: 'addWall', ...plan.duplicate });
  if (index >= 4) game = gameReducer(game, { type: 'place', ...plan.hint });
  // No history: undo cannot take the player back across steps.
  return { ...game, past: [] };
}
