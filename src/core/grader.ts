import { DeductionBoard, type Deduction, type TechniqueLevel } from './logic';
import type { Puzzle } from './types';

export interface GradeResult {
  /**
   * Deepest technique level the puzzle needs (1–3), or null when the logical
   * solver gets stuck (the puzzle would need guessing or a technique we do not
   * model yet).
   */
  readonly grade: TechniqueLevel | null;
  readonly solved: boolean;
  /** The full logical solve path, easiest step first at every point. */
  readonly steps: readonly Deduction[];
  /** How many steps were taken at each level: [level 1, level 2, level 3]. */
  readonly stepsByLevel: readonly [number, number, number];
}

/**
 * Grades a puzzle by solving it the way a person would: always use the easiest
 * technique that makes progress, and record the hardest one that was needed.
 *
 * Difficulty has two axes: board size and this deduction depth.
 */
export function gradePuzzle(puzzle: Puzzle): GradeResult {
  const board = DeductionBoard.fromPuzzle(puzzle);
  const steps: Deduction[] = [];
  const stepsByLevel: [number, number, number] = [0, 0, 0];
  let grade: TechniqueLevel = 1;

  while (!board.isSolved) {
    const step = board.next(3);
    if (!step) {
      return { grade: null, solved: false, steps, stepsByLevel };
    }
    board.apply(step);
    steps.push(step);
    stepsByLevel[step.level - 1] = (stepsByLevel[step.level - 1] ?? 0) + 1;
    if (step.level > grade) grade = step.level;
  }

  return { grade, solved: true, steps, stepsByLevel };
}
