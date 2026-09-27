import { createPuzzle } from '../puzzle';
import type { Puzzle } from '../types';

/** Builds a puzzle from rows of digits, e.g. ['01', '01', '10']. */
export function puzzleFromRows(order: number, rows: readonly string[]): Puzzle {
  const cells = rows.flatMap((row) => Array.from(row, Number));
  return createPuzzle(order, rows.length, rows[0]!.length, cells);
}

/*
 * A 3×2 grid has exactly three domino tilings:
 *   T1: three horizontals        [0,1] [2,3] [4,5]
 *   T2: two verticals on top     [0,2] [1,3] [4,5]
 *   T3: two verticals at bottom  [0,1] [2,4] [3,5]
 * With the order-1 set (0-0, 0-1, 1-1) we can pick pips so that one or two of
 * them use every domino exactly once.
 */

/** Only T2 is valid: 0-0, 1-1, 1-0. */
export const ORDER1_UNIQUE = puzzleFromRows(1, ['01', '01', '10']);
export const ORDER1_UNIQUE_SOLUTION = [2, 3, 0, 1, 5, 4];

/** T1 (0-0, 1-1, 0-1) and T3 (0-0, 1-0, 1-1) are both valid. */
export const ORDER1_AMBIGUOUS = puzzleFromRows(1, ['00', '11', '01']);
