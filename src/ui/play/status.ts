/**
 * The line of text above the board: what to do next, warnings, the solve, or
 * where the pair picked in the tracker can go. Pure, so it is tested without a device.
 */
import { dominoPips, type DominoId } from '@/core';
import type { BoardStatus, PairSlots } from '@/game';
import { formatDuration } from '@/i18n/format';
import type { Strings } from '@/i18n/strings';
import type { WallMode } from '@/ui/board/wall-mode';

export type StatusTone = 'secondary' | 'accent' | 'success';
export type StatusIcon =
  'alert-circle' | 'checkmark-circle' | 'ban-outline' | 'lock-closed-outline' | 'search';

export interface StatusMessage {
  readonly text: string;
  readonly tone: StatusTone;
  readonly icon: StatusIcon | null;
}

/** The pair picked in the tracker and where it can go. */
export interface SelectedPair {
  readonly label: string;
  readonly slots: PairSlots;
}

export interface StatusInput {
  readonly status: BoardStatus;
  readonly wallMode: WallMode;
  /** Playing with a screen reader: cells are picked, not swiped. */
  readonly pickMode: boolean;
  /** Null when no pair is picked, and always once the board is solved. */
  readonly pair: SelectedPair | null;
  readonly solvedInMs: number | null;
}

/** "3–5" for a domino. */
export function pairLabel(domino: DominoId, order: number): string {
  const [lo, hi] = dominoPips(domino, order);
  return `${lo}–${hi}`;
}

/** Where a picked pair can go: already placed, nowhere left, or how many free slots. */
export function pairStatus({ label, slots }: SelectedPair, t: Strings): StatusMessage {
  if (slots.placed.length > 0) return { text: t.status.pairPlaced(label), tone: 'success', icon: 'search' };
  if (slots.open.length === 0)
    return { text: t.status.pairNone(label), tone: 'accent', icon: 'alert-circle' };
  return { text: t.status.pairOpen(label, slots.open.length), tone: 'secondary', icon: 'search' };
}

export function describeStatus(
  { status, wallMode, pickMode, pair, solvedInMs }: StatusInput,
  t: Strings,
): StatusMessage {
  // A pair picked in the tracker: say where it can go (the board shows it too).
  if (pair) return pairStatus(pair, t);
  // Wall mode is worth a reminder, but never hides a warning or the solve.
  if (wallMode !== 'off' && (status.kind === 'empty' || status.kind === 'progress')) {
    const icon = wallMode === 'locked' ? 'lock-closed-outline' : 'ban-outline';
    const text = pickMode
      ? t.status.wallPick
      : wallMode === 'locked'
        ? t.status.wallLocked
        : t.status.wallOnce;
    return { text, tone: 'secondary', icon };
  }
  switch (status.kind) {
    case 'empty':
      return { text: pickMode ? t.status.startPick : t.status.start, tone: 'secondary', icon: null };
    case 'progress':
      return { text: t.status.progress(status.placed, status.total), tone: 'secondary', icon: null };
    case 'duplicates':
      return {
        text: status.full ? t.status.fullWithDuplicates : t.status.duplicates,
        tone: 'accent',
        icon: 'alert-circle',
      };
    case 'solved':
      return {
        text: t.status.solved(formatDuration(solvedInMs ?? 0)),
        tone: 'success',
        icon: 'checkmark-circle',
      };
  }
}

/** What the card shown after a solve says. */
export interface SolveSummary {
  /** "Solved in 1:23!" */
  readonly title: string;
  /** How it compares with the best time so far; null on a first solve. */
  readonly detail: string | null;
  readonly newBest: boolean;
}

export function describeSolve(solvedInMs: number, bestBeforeMs: number | null, t: Strings): SolveSummary {
  const title = t.status.solved(formatDuration(solvedInMs));
  if (bestBeforeMs === null) return { title, detail: null, newBest: false };
  if (solvedInMs < bestBeforeMs) return { title, detail: t.solved.newBest, newBest: true };
  return { title, detail: t.solved.best(formatDuration(bestBeforeMs)), newBest: false };
}
