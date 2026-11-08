/**
 * Domino pips: where the dots go for each value, as fractions of a square
 * face. Real dominoes stop at 6, so boards with higher values keep digits.
 */

/** Highest value a face can show with pips. */
export const MAX_PIPS = 6;

/** A dot's centre, as fractions of the face (0 is the left / top edge). */
export type PipPoint = readonly [x: number, y: number];

const NEAR = 0.27;
const MID = 0.5;
const FAR = 0.73;

const LAYOUTS: readonly (readonly PipPoint[])[] = [
  [],
  [[MID, MID]],
  [
    [NEAR, NEAR],
    [FAR, FAR],
  ],
  [
    [NEAR, NEAR],
    [MID, MID],
    [FAR, FAR],
  ],
  [
    [NEAR, NEAR],
    [FAR, NEAR],
    [NEAR, FAR],
    [FAR, FAR],
  ],
  [
    [NEAR, NEAR],
    [FAR, NEAR],
    [MID, MID],
    [NEAR, FAR],
    [FAR, FAR],
  ],
  [
    [NEAR, NEAR],
    [FAR, NEAR],
    [NEAR, MID],
    [FAR, MID],
    [NEAR, FAR],
    [FAR, FAR],
  ],
];

/** Dots for a value from 0 (blank) to {@link MAX_PIPS}. */
export function pipLayout(value: number): readonly PipPoint[] {
  const layout = Number.isInteger(value) ? LAYOUTS[value] : undefined;
  if (!layout) throw new RangeError(`No pip layout for ${value}`);
  return layout;
}

/** Whether every value of a puzzle of this order fits on a pip face. */
export function canShowPips(order: number): boolean {
  return order <= MAX_PIPS;
}

/** Dot diameter for a face of the given side, in points. */
export function pipDiameter(face: number): number {
  return Math.max(3, Math.round(face * 0.17 * 2) / 2);
}
