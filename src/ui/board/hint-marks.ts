import type { CellIndex, Pair } from '@/core';
import type { PairSlots } from '@/game';

/** What the board shows for the hint on screen (see `describeHint`). */
export interface HintMarks {
  /** Cells to look at: ringed. */
  readonly cells: readonly CellIndex[];
  /** The rings pulse while the hint only says where to look; once it explains, they settle. */
  readonly pulse: boolean;
  /** Where the hinted domino goes: drawn as a dashed slot. */
  readonly place: Pair | null;
  /** Walls the hint would draw: drawn in terracotta. */
  readonly walls: readonly Pair[];
  /** A domino the hint points at as a mistake: drawn highlighted. */
  readonly wrongDomino: Pair | null;
  /** A wall the hint points at as a mistake: drawn in terracotta. */
  readonly wrongWall: Pair | null;
}

export const NO_HINT_MARKS: HintMarks = {
  cells: [],
  pulse: false,
  place: null,
  walls: [],
  wrongDomino: null,
  wrongWall: null,
};

/** A hint's domino slot and the wrong domino it points at, drawn like a pair picked in the tracker. */
export function hintHighlight(marks: HintMarks): PairSlots {
  return {
    placed: marks.wrongDomino ? [marks.wrongDomino] : [],
    open: marks.place ? [marks.place] : [],
  };
}
