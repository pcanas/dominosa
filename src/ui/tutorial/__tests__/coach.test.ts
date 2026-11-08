import { describe, expect, it } from 'vitest';

import { tutorialPlan, type GameAction } from '@/game';
import { STRINGS } from '@/i18n/strings';
import { TUTORIAL_LEVEL } from '@/levels';

import { coachMarks, coachMessage, isExpected, stepNumber, TUTORIAL_STEP_COUNT } from '../coach';

const t = STRINGS.es;
const { puzzle, solution } = TUTORIAL_LEVEL;
const plan = tutorialPlan(puzzle, solution)!;
const { first, duplicate } = plan;
const visual = { pickMode: false, nudge: false };

describe('isExpected', () => {
  const place = (a: number, b: number): GameAction => ({ type: 'place', a, b });

  it('takes only the move each guided step asks for, either way round', () => {
    expect(isExpected('place', plan, place(first.a, first.b))).toBe(true);
    expect(isExpected('place', plan, place(first.b, first.a))).toBe(true);
    expect(isExpected('place', plan, place(duplicate.a, duplicate.b))).toBe(false);

    expect(isExpected('remove', plan, { type: 'remove', cell: duplicate.b })).toBe(true);
    expect(isExpected('remove', plan, { type: 'remove', cell: first.a })).toBe(false);

    expect(isExpected('wall', plan, { type: 'addWall', a: duplicate.b, b: duplicate.a })).toBe(true);
    expect(isExpected('wall', plan, place(duplicate.a, duplicate.b))).toBe(false);
  });

  it('lets the board rest while the hint step waits for the button, and frees it at the end', () => {
    expect(isExpected('hint', plan, place(plan.hint.a, plan.hint.b))).toBe(false);
    expect(isExpected('finish', plan, { type: 'undo' })).toBe(true);
    expect(isExpected('done', plan, { type: 'undo' })).toBe(false);
  });
});

describe('coachMessage', () => {
  const pair = (() => {
    const [x, y] = [puzzle.cells[first.a]!, puzzle.cells[first.b]!].sort((p, q) => p - q);
    return { shown: `${x}–${y}`, spoken: t.a11y.pairSpoken(x!, y!) };
  })();

  it('names the repeated pair, shown and spoken', () => {
    expect(coachMessage('remove', plan, puzzle, t, visual)).toEqual({
      text: t.tutorial.remove(pair.shown),
      spoken: t.tutorial.remove(pair.spoken),
    });
  });

  it('switches to picking cells with a screen reader, and nudges after another move', () => {
    expect(coachMessage('place', plan, puzzle, t, { pickMode: true, nudge: false }).text).toBe(
      t.tutorial.placePick,
    );
    expect(coachMessage('wall', plan, puzzle, t, { pickMode: true, nudge: true }).text).toBe(
      t.tutorial.nudgeWallPick,
    );
    expect(coachMessage('hint', plan, puzzle, t, { pickMode: false, nudge: true }).text).toBe(
      t.tutorial.nudgeHint,
    );
    expect(coachMessage('done', plan, puzzle, t, visual).text).toBe(t.tutorial.done);
  });
});

describe('coachMarks and stepNumber', () => {
  it('points at the cells of each guided step', () => {
    expect(coachMarks('place', plan)).toMatchObject({ cells: [first.a, first.b], place: first });
    expect(coachMarks('remove', plan).cells).toEqual([duplicate.a, duplicate.b]);
    expect(coachMarks('wall', plan)).toMatchObject({ cells: [duplicate.a, duplicate.b], pulse: true });
    expect(coachMarks('finish', plan).cells).toEqual([]);
  });

  it('counts steps from one', () => {
    expect(stepNumber('place')).toBe(1);
    expect(stepNumber('finish')).toBe(TUTORIAL_STEP_COUNT);
    expect(stepNumber('done')).toBeNull();
  });
});
