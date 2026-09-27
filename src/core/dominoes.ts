import type { DominoId, Pip } from './types';

/** Number of dominoes in a double-`order` set: (n+1)(n+2)/2. */
export function dominoCount(order: number): number {
  return ((order + 1) * (order + 2)) / 2;
}

/**
 * Grid shape for a puzzle of the given order. The long side is vertical so the
 * board fits a phone held in portrait: (n+2) rows × (n+1) columns.
 */
export function gridShape(order: number): { rows: number; cols: number } {
  return { rows: order + 2, cols: order + 1 };
}

/**
 * Stable id for the domino with pips `x` and `y` (order-independent).
 * Dominoes are enumerated as 0-0, 0-1, …, 0-n, 1-1, 1-2, …, n-n.
 */
export function dominoId(x: Pip, y: Pip, order: number): DominoId {
  const lo = x < y ? x : y;
  const hi = x < y ? y : x;
  return lo * (order + 1) - (lo * (lo - 1)) / 2 + (hi - lo);
}

/** Inverse of {@link dominoId}: the pips `[lo, hi]` of a domino. */
export function dominoPips(id: DominoId, order: number): [Pip, Pip] {
  let lo = 0;
  let start = 0;
  while (lo <= order) {
    const rowLength = order + 1 - lo;
    if (id < start + rowLength) {
      return [lo, lo + (id - start)];
    }
    start += rowLength;
    lo += 1;
  }
  throw new RangeError(`Domino id ${id} is out of range for order ${order}`);
}
