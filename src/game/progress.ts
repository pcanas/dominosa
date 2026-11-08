/** Per-level progress, kept on the device. */
export interface LevelProgress {
  /** Fastest solve, in milliseconds. */
  readonly bestMs: number;
  readonly timesSolved: number;
  /** ISO date of the first solve. */
  readonly firstSolvedAt: string;
  /** Solved at least once without asking for a hint. */
  readonly perfect: boolean;
}

export type ProgressMap = Readonly<Record<string, LevelProgress>>;

/** Version of the stored progress: 2 added `perfect`. */
export const PROGRESS_VERSION = 2;

/** Returns the progress map updated with a new solve, which used `hints` hints. */
export function recordSolve(
  progress: ProgressMap,
  levelId: string,
  elapsedMs: number,
  now: Date,
  hints = 0,
): ProgressMap {
  const ms = Math.max(0, Math.round(elapsedMs));
  const previous = progress[levelId];
  const perfect = hints === 0;
  const entry: LevelProgress = previous
    ? {
        bestMs: Math.min(previous.bestMs, ms),
        timesSolved: previous.timesSolved + 1,
        firstSolvedAt: previous.firstSolvedAt,
        perfect: previous.perfect || perfect,
      }
    : { bestMs: ms, timesSolved: 1, firstSolvedAt: now.toISOString(), perfect };
  return { ...progress, [levelId]: entry };
}

/**
 * Progress loaded from storage, written by this or an older version, with
 * malformed entries dropped. Solves stored before version 2 count as perfect:
 * there were no hints then.
 */
export function loadProgress(value: unknown, version: number): ProgressMap {
  if (!isRecord(value)) return {};
  const levels: Record<string, LevelProgress> = {};
  for (const [id, entry] of Object.entries(value)) {
    if (
      !isRecord(entry) ||
      !isCount(entry.bestMs) ||
      !isCount(entry.timesSolved) ||
      entry.timesSolved < 1 ||
      typeof entry.firstSolvedAt !== 'string'
    ) {
      continue;
    }
    const perfect = version < 2 ? true : entry.perfect === true;
    levels[id] = {
      bestMs: entry.bestMs,
      timesSolved: entry.timesSolved,
      firstSolvedAt: entry.firstSolvedAt,
      perfect,
    };
  }
  return levels;
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
