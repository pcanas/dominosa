import { describe, expect, it } from 'vitest';

import { WAVE_MAX_DELAY_MS, WAVE_STEP_MS, WAVE_TURN_MS, waveDelay, waveEnd } from '../celebration';

const COLS = 4;

describe('waveDelay', () => {
  it('starts with the domino that was placed last', () => {
    // Cells 5 and 6 (row 1, columns 1–2); the wave starts at cell 5.
    expect(waveDelay({ a: 5, b: 6 }, 5, COLS)).toBe(Math.round(0.5 * WAVE_STEP_MS));
  });

  it('reaches dominoes later the further away they are', () => {
    const near = waveDelay({ a: 0, b: 1 }, 5, COLS);
    const far = waveDelay({ a: 18, b: 19 }, 5, COLS);
    expect(far).toBeGreaterThan(near);
  });

  it('never waits longer than the cap, even on the largest boards', () => {
    // 9×10 board: from one corner to the other.
    expect(waveDelay({ a: 88, b: 89 }, 0, 9)).toBe(WAVE_MAX_DELAY_MS);
  });
});

describe('waveEnd', () => {
  it('lasts until the furthest domino has turned', () => {
    const tiles = [
      { a: 0, b: 1 },
      { a: 18, b: 19 },
    ];
    expect(waveEnd(tiles, 0, COLS)).toBe(waveDelay(tiles[1]!, 0, COLS) + WAVE_TURN_MS);
    expect(waveEnd([], 0, COLS)).toBe(WAVE_TURN_MS);
  });
});
