import type { CellIndex, Puzzle, TechniqueLevel } from '@/core';

/** Difficulty label shown to the player. Order within the list is the difficulty ramp. */
export const DIFFICULTIES = ['tutorial', 'easy', 'medium', 'hard', 'expert'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/** A level as stored in a pack file (compact, JSON-friendly). */
export interface LevelRecord {
  readonly id: string;
  readonly difficulty: Difficulty;
  readonly order: number;
  readonly rows: number;
  readonly cols: number;
  /** Deduction depth needed to solve it (see `gradePuzzle`). */
  readonly grade: TechniqueLevel;
  /** Pips as a digit string, row-major. */
  readonly cells: string;
  /** Unique solution: one direction letter per cell (R, L, D, U) pointing at its partner. */
  readonly solution: string;
  /** Generator seed, kept for traceability. */
  readonly seed: string;
}

export interface LevelPackFile {
  readonly id: string;
  /** Bumped when the file format changes. */
  readonly formatVersion: 1;
  readonly levels: readonly LevelRecord[];
}

/** A level ready to play. */
export interface Level {
  readonly id: string;
  readonly packId: string;
  /** 1-based position within its pack. */
  readonly number: number;
  readonly difficulty: Difficulty;
  readonly grade: TechniqueLevel;
  readonly puzzle: Puzzle;
  readonly solution: readonly CellIndex[];
}
