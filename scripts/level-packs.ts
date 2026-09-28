import type { TechniqueLevel } from '@/core';
import type { Difficulty } from '@/levels/types';

/** A run of levels of the same size and deduction depth inside a pack. */
export interface LevelGroup {
  /** Highest pip value: the grid is (order + 2) × (order + 1). */
  readonly order: number;
  /** Required deduction depth. */
  readonly grade: TechniqueLevel;
  readonly count: number;
  /**
   * `first` (default): the first matching seeds.
   * `hardest`: the `count` hardest of a pool three times as large (longest
   * chains of deductions at the required depth).
   */
  readonly pick?: 'first' | 'hardest';
}

export interface PackSpec {
  /**
   * Permanent: level ids are `<pack id>-<nn>` and progress and saved games are
   * keyed by them. Never rename a published pack or reorder its groups; add a
   * new pack instead.
   */
  readonly id: string;
  /** Label shown on every level of the pack. */
  readonly difficulty: Difficulty;
  /** Output path, relative to the repo root. */
  readonly output: string;
  /** In play order. Inside a group, levels are sorted from easiest to hardest. */
  readonly groups: readonly LevelGroup[];
}

/**
 * Hito 1: five packs of twelve on a size-and-depth ramp. Each pack introduces
 * a board size; a new size starts at a gentler depth before the deeper ones.
 * The expert pack is the 9×10 board; switch its order to 7 to cap phones at 8×9.
 */
export const PACKS: readonly PackSpec[] = [
  {
    id: 'intro',
    difficulty: 'tutorial',
    output: 'src/levels/packs/intro.json',
    groups: [
      { order: 3, grade: 1, count: 6 },
      { order: 4, grade: 1, count: 6 },
    ],
  },
  {
    id: 'easy',
    difficulty: 'easy',
    output: 'src/levels/packs/easy.json',
    groups: [
      { order: 4, grade: 2, count: 4 },
      { order: 5, grade: 1, count: 3 },
      { order: 5, grade: 2, count: 5 },
    ],
  },
  {
    id: 'medium',
    difficulty: 'medium',
    output: 'src/levels/packs/medium.json',
    groups: [
      { order: 6, grade: 2, count: 8 },
      { order: 6, grade: 3, count: 4 },
    ],
  },
  {
    id: 'hard',
    difficulty: 'hard',
    output: 'src/levels/packs/hard.json',
    groups: [
      { order: 7, grade: 2, count: 4 },
      { order: 7, grade: 3, count: 8 },
    ],
  },
  {
    id: 'expert',
    difficulty: 'expert',
    output: 'src/levels/packs/expert.json',
    groups: [{ order: 8, grade: 3, count: 12, pick: 'hardest' }],
  },
];
