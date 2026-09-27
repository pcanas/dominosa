/**
 * Core domain types for Dominosa.
 *
 * Everything under `src/core` is pure TypeScript with no runtime dependencies,
 * so the same code runs in the app (iOS, Android, web), in Node scripts
 * (offline level generation) and in tests.
 */

/** Index of a cell in row-major order: `row * cols + col`. */
export type CellIndex = number;

/** Pip value shown in a cell, in `0..order`. */
export type Pip = number;

/** Identifier of a domino (an unordered pair of pips) within the double-`order` set. */
export type DominoId = number;

/** A Dominosa puzzle: a rectangular grid of pips. */
export interface Puzzle {
  /** Highest pip value. A puzzle of order `n` uses the full double-`n` domino set. */
  readonly order: number;
  readonly rows: number;
  readonly cols: number;
  /** Pips in row-major order; length is `rows * cols`. */
  readonly cells: readonly Pip[];
}

/** Two orthogonally adjacent cells covered by one domino. Always normalised so that `a < b`. */
export interface Pair {
  readonly a: CellIndex;
  readonly b: CellIndex;
}

/**
 * A complete solution, as the partner of every cell:
 * `partner[i]` is the other cell covered by the domino that covers `i`.
 */
export type Solution = readonly CellIndex[];
