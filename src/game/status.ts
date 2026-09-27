import { dominoCount } from '@/core';

import { coveredCellCount, isSolved, placedTiles, type GameState } from './game';

/** What the context line above the board should say. UI maps each kind to a string. */
export type BoardStatus =
  | { readonly kind: 'empty' }
  | { readonly kind: 'progress'; readonly placed: number; readonly total: number }
  | { readonly kind: 'duplicates'; readonly full: boolean }
  | { readonly kind: 'solved' };

export function boardStatus(state: GameState): BoardStatus {
  if (isSolved(state)) return { kind: 'solved' };
  const covered = coveredCellCount(state);
  if (covered === 0) return { kind: 'empty' };
  const tiles = placedTiles(state);
  if (tiles.some((t) => t.duplicate)) return { kind: 'duplicates', full: covered === state.partner.length };
  return { kind: 'progress', placed: tiles.length, total: dominoCount(state.puzzle.order) };
}
