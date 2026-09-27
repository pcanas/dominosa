/** Per-level progress, kept on the device. */
export interface LevelProgress {
  /** Fastest solve, in milliseconds. */
  readonly bestMs: number;
  readonly timesSolved: number;
  /** ISO date of the first solve. */
  readonly firstSolvedAt: string;
}

export type ProgressMap = Readonly<Record<string, LevelProgress>>;

/** Returns the progress map updated with a new solve. */
export function recordSolve(
  progress: ProgressMap,
  levelId: string,
  elapsedMs: number,
  now: Date,
): ProgressMap {
  const ms = Math.max(0, Math.round(elapsedMs));
  const previous = progress[levelId];
  const entry: LevelProgress = previous
    ? {
        bestMs: Math.min(previous.bestMs, ms),
        timesSolved: previous.timesSolved + 1,
        firstSolvedAt: previous.firstSolvedAt,
      }
    : { bestMs: ms, timesSolved: 1, firstSolvedAt: now.toISOString() };
  return { ...progress, [levelId]: entry };
}
