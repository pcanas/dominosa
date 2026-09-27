import type { TechniqueLevel } from '@/core';
import type { Difficulty } from '@/levels/types';

/** What we want from a level; the generator searches seeds until it finds a match. */
export interface LevelSpec {
  readonly id: string;
  readonly difficulty: Difficulty;
  /** Highest pip value: the grid is (order + 2) × (order + 1). */
  readonly order: number;
  /** Required deduction depth. */
  readonly grade: TechniqueLevel;
  /**
   * `first`: take the first matching seed.
   * `hardest`: among several matches, take the one with the most steps at the
   * required level (a longer chain of hard deductions).
   */
  readonly pick?: 'first' | 'hardest';
}

export interface PackSpec {
  readonly id: string;
  /** Output path, relative to the repo root. */
  readonly output: string;
  readonly levels: readonly LevelSpec[];
}

/**
 * Hito 0: five levels on a size-and-depth ramp. The two largest boards (8×9 and
 * 9×10) are here on purpose, to validate the maximum size on a phone.
 */
export const PACKS: readonly PackSpec[] = [
  {
    id: 'hito0',
    output: 'src/levels/packs/hito0.json',
    levels: [
      { id: 'hito0-1', difficulty: 'tutorial', order: 3, grade: 1 },
      { id: 'hito0-2', difficulty: 'easy', order: 4, grade: 2 },
      { id: 'hito0-3', difficulty: 'medium', order: 6, grade: 2, pick: 'hardest' },
      { id: 'hito0-4', difficulty: 'hard', order: 7, grade: 3 },
      { id: 'hito0-5', difficulty: 'expert', order: 8, grade: 3, pick: 'hardest' },
    ],
  },
];
