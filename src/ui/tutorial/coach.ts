/**
 * What the tutorial's coach asks for at each step, which moves count, and what
 * the board marks. Pure (strings come in as an argument), so it is tested
 * without a device. The steps themselves come from `src/game/tutorial.ts`.
 */
import { dominoId, dominoPips, type Pair, type Puzzle } from '@/core';
import type { GameAction, TutorialPlan, TutorialStep } from '@/game';
import type { Strings } from '@/i18n/strings';
import { NO_HINT_MARKS, type HintMarks } from '@/ui/board/hint-marks';

/** A step of the tutorial, or `done` once its board is solved. */
export type CoachStep = TutorialStep | 'done';

const samePair = (action: { a: number; b: number }, pair: Pair) =>
  (action.a === pair.a && action.b === pair.b) || (action.a === pair.b && action.b === pair.a);

/**
 * Whether a move on the board is the one the step asks for. Guided steps only
 * take their own move; while the hint step waits for "Hint", the board takes
 * none; the last step takes anything.
 */
export function isExpected(step: CoachStep, plan: TutorialPlan, action: GameAction): boolean {
  switch (step) {
    case 'place':
      return action.type === 'place' && samePair(action, plan.first);
    case 'remove':
      return (
        action.type === 'remove' && (action.cell === plan.duplicate.a || action.cell === plan.duplicate.b)
      );
    case 'wall':
      return action.type === 'addWall' && samePair(action, plan.duplicate);
    case 'hint':
    case 'done':
      return false;
    case 'finish':
      return true;
  }
}

export interface CoachMessage {
  /** What the card shows. */
  readonly text: string;
  /** The same for screen readers: the pair said as "1 y 2" rather than "1–2". */
  readonly spoken: string;
}

export interface CoachOptions {
  /** Playing with a screen reader: cells are picked, not swiped. */
  readonly pickMode: boolean;
  /** The player tried another move: say what the step needs instead. */
  readonly nudge: boolean;
}

export function coachMessage(
  step: CoachStep,
  plan: TutorialPlan,
  puzzle: Puzzle,
  t: Strings,
  { pickMode, nudge }: CoachOptions,
): CoachMessage {
  const [lo, hi] = dominoPips(
    dominoId(puzzle.cells[plan.first.a]!, puzzle.cells[plan.first.b]!, puzzle.order),
    puzzle.order,
  );
  const both = (make: (pair: string) => string): CoachMessage => ({
    text: make(`${lo}–${hi}`),
    spoken: make(t.a11y.pairSpoken(lo, hi)),
  });
  const plain = (text: string): CoachMessage => ({ text, spoken: text });
  const tt = t.tutorial;
  switch (step) {
    case 'place':
      return plain(nudge ? tt.nudgePlace : pickMode ? tt.placePick : tt.place);
    case 'remove':
      return nudge ? plain(tt.nudgeRemove) : both(pickMode ? tt.removePick : tt.remove);
    case 'wall':
      if (nudge) return plain(pickMode ? tt.nudgeWallPick : tt.nudgeWall);
      return both(pickMode ? tt.wallPick : tt.wall);
    case 'hint':
      return plain(nudge ? tt.nudgeHint : tt.hint);
    case 'finish':
      return plain(tt.finish);
    case 'done':
      return plain(tt.done);
  }
}

/** Cells the step points at: they pulse, like a hint's (the first domino's slot shows too). */
export function coachMarks(step: CoachStep, plan: TutorialPlan): HintMarks {
  switch (step) {
    case 'place':
      return { ...NO_HINT_MARKS, cells: [plan.first.a, plan.first.b], pulse: true, place: plan.first };
    case 'remove':
    case 'wall':
      return { ...NO_HINT_MARKS, cells: [plan.duplicate.a, plan.duplicate.b], pulse: true };
    default:
      return NO_HINT_MARKS;
  }
}

/** 1-based number of a step among this run's `steps`, for "Step 2 of 5"; null once done. */
export function stepNumber(step: CoachStep, steps: readonly TutorialStep[]): number | null {
  return step === 'done' ? null : steps.indexOf(step) + 1;
}
