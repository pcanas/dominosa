/**
 * The solve wave: once the last domino lands, the dominoes turn sage one after
 * another, spreading out from that last domino. Pure timing, tested on its own.
 */
import type { CellIndex, Pair } from '@/core';

/** Delay added per cell of distance from where the wave starts. */
export const WAVE_STEP_MS = 45;
/** Longest wait, so the far corner of a 9×10 board does not lag behind (it would be ~530 ms). */
export const WAVE_MAX_DELAY_MS = 450;
/** How long one domino takes to turn sage. */
export const WAVE_TURN_MS = 280;

/** How long a domino waits before turning, from the distance between its centre and the origin cell. */
export function waveDelay(tile: Pair, origin: CellIndex, cols: number): number {
  const x = (cell: CellIndex) => cell % cols;
  const y = (cell: CellIndex) => Math.floor(cell / cols);
  const dx = (x(tile.a) + x(tile.b)) / 2 - x(origin);
  const dy = (y(tile.a) + y(tile.b)) / 2 - y(origin);
  return Math.min(WAVE_MAX_DELAY_MS, Math.round(Math.hypot(dx, dy) * WAVE_STEP_MS));
}

/** When the last domino has finished turning. */
export function waveEnd(tiles: readonly Pair[], origin: CellIndex, cols: number): number {
  const last = tiles.reduce((max, tile) => Math.max(max, waveDelay(tile, origin, cols)), 0);
  return last + WAVE_TURN_MS;
}
