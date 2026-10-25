import type { ProgressMap, SavedGames } from '@/game';
import type { LevelPack } from '@/levels';

export interface PackSummary {
  readonly total: number;
  readonly solved: number;
  /** Levels with a saved, unsolved game. */
  readonly inProgress: number;
  /** Board sizes in the pack, smallest first, as [cols, rows]. */
  readonly sizes: readonly (readonly [number, number])[];
  /** Deepest deduction level in the pack. */
  readonly maxGrade: number;
}

export function packSummary(pack: LevelPack, progress: ProgressMap, saved: SavedGames): PackSummary {
  const sizes: [number, number][] = [];
  for (const { puzzle } of pack.levels) {
    if (!sizes.some(([c, r]) => c === puzzle.cols && r === puzzle.rows))
      sizes.push([puzzle.cols, puzzle.rows]);
  }
  sizes.sort((x, y) => x[0] * x[1] - y[0] * y[1]);
  return {
    total: pack.levels.length,
    solved: pack.levels.filter((l) => progress[l.id] !== undefined).length,
    inProgress: pack.levels.filter((l) => saved[l.id] !== undefined).length,
    sizes,
    maxGrade: Math.max(...pack.levels.map((l) => l.grade)),
  };
}
