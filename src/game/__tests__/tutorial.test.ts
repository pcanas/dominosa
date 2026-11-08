import { describe, expect, it } from 'vitest';

import { dominoId, type Pair } from '@/core';
import { TUTORIAL_LEVEL } from '@/levels';

import { gameReducer, hasWall, isSolved, placedTiles } from '../game';
import { hintAction, nextHint } from '../hint';
import { TUTORIAL_STEPS, tutorialBoard, tutorialPlan, tutorialSteps } from '../tutorial';

const { puzzle, solution } = TUTORIAL_LEVEL;
const plan = tutorialPlan(puzzle, solution)!;
const inSolution = ({ a, b }: Pair) => solution[a] === b;
const domino = ({ a, b }: Pair) => dominoId(puzzle.cells[a]!, puzzle.cells[b]!, puzzle.order);

describe('tutorialPlan', () => {
  it('picks a solution domino, a twin slot for it, and the next domino a hint places', () => {
    expect(inSolution(plan.first)).toBe(true);
    expect(inSolution(plan.duplicate)).toBe(false);
    expect(domino(plan.duplicate)).toBe(domino(plan.first));
    expect([plan.duplicate.a, plan.duplicate.b]).not.toContain(plan.first.a);
    expect([plan.duplicate.a, plan.duplicate.b]).not.toContain(plan.first.b);
    expect(inSolution(plan.hint)).toBe(true);
  });
});

describe('tutorialBoard', () => {
  it('sets up each step as the script leaves it, with nothing to undo', () => {
    const boards = Object.fromEntries(
      TUTORIAL_STEPS.map((step) => [step, tutorialBoard(puzzle, plan, step)]),
    );
    expect(placedTiles(boards.place!)).toEqual([]);

    // The coach's copy shows as repeated, next to the original.
    const remove = placedTiles(boards.remove!);
    expect(remove).toHaveLength(2);
    expect(remove.every((tile) => tile.duplicate)).toBe(true);

    expect(placedTiles(boards.wall!)).toHaveLength(1);
    expect(hasWall(boards.hint!, plan.duplicate.a, plan.duplicate.b)).toBe(true);
    expect(placedTiles(boards.finish!)).toHaveLength(2);
    for (const step of TUTORIAL_STEPS) expect(boards[step]!.past).toEqual([]);
  });

  it('gives the hint step the domino the script expects', () => {
    const hint = nextHint(tutorialBoard(puzzle, plan, 'hint'), solution)!;
    expect(hintAction(hint)).toEqual({ type: 'place', ...plan.hint });
  });

  it('can be finished from the last step, with or without the hint step', () => {
    for (const hints of [true, false]) {
      let game = tutorialBoard(puzzle, plan, 'finish', hints);
      expect(placedTiles(game)).toHaveLength(hints ? 2 : 1);
      for (let i = 0; i < 10 && !isSolved(game); i++)
        game = gameReducer(game, hintAction(nextHint(game, solution)!));
      expect(isSolved(game)).toBe(true);
    }
  });

  it('leaves the hint step out when hints are off', () => {
    expect(tutorialSteps(true)).toEqual(TUTORIAL_STEPS);
    expect(tutorialSteps(false)).toEqual(['place', 'remove', 'wall', 'finish']);
  });
});
