/**
 * What the hint sheet says at each tap, and what the board marks with it:
 *
 *   stage 1  "Look at the marked cells"            or "There is a mistake on the board"
 *   stage 2  why that step works (with its numbers) or where the mistake is
 *   then     "Do it" / "Remove it" applies the hint (see `hintAction`)
 *
 * Pure (strings come in as an argument), so it is tested without a device.
 */
import { dominoId, dominoPips, getTopology, type CellIndex, type DominoId, type Pair } from '@/core';
import { hasWall, hintFocus, placedTiles, type GameState, type Hint } from '@/game';
import type { Strings, UsedNeighbour } from '@/i18n/strings';
import { NO_HINT_MARKS, type HintMarks } from '@/ui/board/hint-marks';

export type HintStage = 1 | 2;

export interface HintView {
  /** What the sheet shows. */
  readonly text: string;
  /** The same for screen readers: pairs are said as "3 y 5" rather than "3–5". */
  readonly spoken: string;
  /** Label of the button that moves on: "Why?", "Do it", "Where?", "Remove it". */
  readonly next: string;
  readonly marks: HintMarks;
}

export interface HintTextOptions {
  /** Playing with a screen reader: the cells to look at are named, since the pulse cannot be seen. */
  readonly pickMode: boolean;
}

export function describeHint(
  hint: Hint,
  stage: HintStage,
  game: GameState,
  t: Strings,
  { pickMode }: HintTextOptions,
): HintView {
  const { cells, order, cols } = game.puzzle;
  /** Builds both versions of a text: shown (pairs as "3–5") and spoken (pairs as "3 y 5"). */
  const both = (make: (pair: (domino: DominoId) => string) => string) => ({
    text: make((domino) => {
      const [lo, hi] = dominoPips(domino, order);
      return `${lo}–${hi}`;
    }),
    spoken: make((domino) => t.a11y.pairSpoken(...dominoPips(domino, order))),
  });
  const named = (focus: readonly CellIndex[]) =>
    focus.map((cell) => t.a11y.cell(Math.floor(cell / cols) + 1, (cell % cols) + 1, cells[cell]!)).join('; ');

  if (stage === 1) {
    if (hint.kind === 'mistake') {
      const text = hint.count === 1 ? t.hint.mistake : t.hint.mistakes(hint.count);
      return { text, spoken: text, next: t.hint.where, marks: NO_HINT_MARKS };
    }
    const focus = hintFocus(hint);
    const text = pickMode ? t.hint.lookAt(named(focus)) : t.hint.look;
    return { text, spoken: text, next: t.hint.why, marks: { ...NO_HINT_MARKS, cells: focus, pulse: true } };
  }

  switch (hint.kind) {
    case 'mistake': {
      const { mistake } = hint;
      const marks = { ...NO_HINT_MARKS, cells: [mistake.pair.a, mistake.pair.b] };
      if (mistake.kind === 'domino') {
        return {
          ...both((pair) => t.hint.wrongDomino(pair(mistake.domino))),
          next: t.hint.removeDomino,
          marks: { ...marks, wrongDomino: mistake.pair },
        };
      }
      return {
        text: t.hint.wrongWall,
        spoken: t.hint.wrongWall,
        next: t.hint.removeWall,
        marks: { ...marks, wrongWall: mistake.pair },
      };
    }
    case 'reveal':
      return {
        ...both((pair) => t.hint.reveal(pair(hint.domino))),
        next: t.hint.doIt,
        marks: { ...NO_HINT_MARKS, cells: [hint.pair.a, hint.pair.b], place: hint.pair },
      };
    case 'step': {
      const { step } = hint;
      const marks: HintMarks = {
        ...NO_HINT_MARKS,
        cells: step.focus,
        place: step.place,
        walls: step.place ? [] : step.eliminate,
      };
      const explain = (pair: (domino: DominoId) => string): string => {
        switch (step.technique) {
          case 'cell-single': {
            const cell = step.focus[0]!;
            const other = partnerIn(step.place!, cell);
            const reasons = ruledOut(game, cell, other, pair, t);
            return reasons.length === 0
              ? t.hint.cellSingle(cells[cell]!, cells[other]!)
              : t.hint.cellSingleBecause(cells[cell]!, cells[other]!, reasons);
          }
          case 'domino-single':
            return t.hint.dominoSingle(pair(step.domino));
          case 'domino-shared-cell':
            return t.hint.sharedCell(pair(step.domino), cells[step.focus[0]!]!);
          case 'dead-end':
            return step.starved && 'domino' in step.starved
              ? t.hint.deadEndDomino(pair(step.domino), pair(step.starved.domino))
              : t.hint.deadEndCell(pair(step.domino), cells[step.starved?.cell ?? step.focus[0]!]!);
          case 'lookahead':
            return t.hint.lookahead(pair(step.domino));
        }
      };
      return { ...both(explain), next: t.hint.doIt, marks };
    }
  }
}

function partnerIn(pair: Pair, cell: CellIndex): CellIndex {
  return pair.a === cell ? pair.b : pair.a;
}

/**
 * Why a cell's other free neighbours cannot be its partner: a wall, or a domino
 * that is already on the board. Covered neighbours go without saying.
 */
function ruledOut(
  game: GameState,
  cell: CellIndex,
  partner: CellIndex,
  pair: (domino: DominoId) => string,
  t: Strings,
): string[] {
  const { cells, order, rows, cols } = game.puzzle;
  const { cellEdges, edgeA, edgeB } = getTopology(rows, cols);
  const placed = new Set(placedTiles(game).map((tile) => tile.domino));
  // By number: two neighbours with the same number are ruled out for the same reason.
  const used = new Map<number, UsedNeighbour>();
  const walled = new Set<number>();
  for (const edge of cellEdges[cell]!) {
    const neighbour = edgeA[edge] === cell ? edgeB[edge]! : edgeA[edge]!;
    if (neighbour === partner || game.partner[neighbour]! >= 0) continue;
    const value = cells[neighbour]!;
    const domino = dominoId(cells[cell]!, value, order);
    if (hasWall(game, cell, neighbour)) walled.add(value);
    else if (placed.has(domino)) used.set(value, { neighbour: value, pair: pair(domino) });
  }
  const [first, ...rest] = used.values();
  return [
    ...(first ? [t.hint.becauseUsed([first, ...rest])] : []),
    ...(walled.size > 0 ? [t.hint.becauseWalls([...walled])] : []),
  ];
}

/** Identifies a hint, so the sheet only slides in again for a different one. */
export function hintKey(hint: Hint): string {
  switch (hint.kind) {
    case 'mistake':
      return `mistake-${hint.mistake.kind}-${hint.mistake.pair.a}-${hint.mistake.pair.b}`;
    case 'reveal':
      return `reveal-${hint.pair.a}-${hint.pair.b}`;
    case 'step':
      return `step-${hint.step.technique}-${hint.step.focus.join('-')}`;
  }
}
