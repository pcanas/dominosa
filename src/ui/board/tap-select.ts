/**
 * Playing by picking cells, for screen reader users (swipes are taken by
 * VoiceOver): pick a cell, then a neighbour to place a domino there (or a
 * wall, with the wall button on). Pure, so it is tested without a device.
 */
import { areAdjacent, type CellIndex } from '@/core';
import type { GameAction } from '@/game';

export interface PickContext {
  readonly cols: number;
  /** Other cell of the domino covering `cell`, or -1. */
  readonly partnerOf: (cell: CellIndex) => CellIndex;
  readonly hasWall: (a: CellIndex, b: CellIndex) => boolean;
  /** The wall button is on: a picked pair gets a wall instead of a domino. */
  readonly wallMode: boolean;
}

export interface PickResult {
  /** Cell selected after this pick, or null. */
  readonly selected: CellIndex | null;
  /** What the pick does to the board, if anything. */
  readonly action: GameAction | null;
}

/**
 * - nothing selected: select the cell;
 * - the selected cell again: remove its domino, or just deselect it if empty;
 * - a neighbour: place a domino on the pair (replacing overlaps), or with the
 *   wall button on, draw a wall there or remove the one already there;
 * - any other cell: move the selection there.
 */
export function pickCell(selected: CellIndex | null, cell: CellIndex, ctx: PickContext): PickResult {
  if (selected === null) return { selected: cell, action: null };
  if (selected === cell) {
    return ctx.partnerOf(cell) >= 0
      ? { selected: null, action: { type: 'remove', cell } }
      : { selected: null, action: null };
  }
  if (!areAdjacent(selected, cell, ctx.cols)) return { selected: cell, action: null };
  if (!ctx.wallMode) return { selected: null, action: { type: 'place', a: selected, b: cell } };
  const type = ctx.hasWall(selected, cell) ? 'removeWall' : 'addWall';
  return { selected: null, action: { type, a: selected, b: cell } };
}
