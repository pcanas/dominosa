import { describe, expect, it } from 'vitest';

import { afterWallDrawn, DOUBLE_TAP_MS, tapWallButton, WALL_BUTTON_OFF } from '../wall-mode';

const taps = (...times: number[]) => times.reduce(tapWallButton, WALL_BUTTON_OFF).mode;

describe('wall button', () => {
  it('arms a single wall with one tap and disarms with another', () => {
    expect(taps(1_000)).toBe('once');
    expect(taps(1_000, 3_000)).toBe('off');
  });

  it('locks with a double tap, and a later tap unlocks', () => {
    expect(taps(1_000, 1_000 + DOUBLE_TAP_MS)).toBe('locked');
    expect(taps(1_000, 1_200, 5_000)).toBe('off');
    // Tapping fast while locked only turns it off; it does not re-lock.
    expect(taps(1_000, 1_200, 1_400)).toBe('off');
    expect(taps(1_000, 1_200, 1_400, 1_600)).toBe('once');
  });

  it('switches a single-use wall mode off once a wall is drawn, but not a locked one', () => {
    const once = tapWallButton(WALL_BUTTON_OFF, 1_000);
    expect(afterWallDrawn(once).mode).toBe('off');
    const locked = tapWallButton(once, 1_100);
    expect(afterWallDrawn(locked)).toBe(locked);
    expect(afterWallDrawn(WALL_BUTTON_OFF)).toBe(WALL_BUTTON_OFF);
  });

  it('does not lock when the double tap comes after the wall was drawn', () => {
    const drawn = afterWallDrawn(tapWallButton(WALL_BUTTON_OFF, 1_000));
    expect(tapWallButton(drawn, 1_200).mode).toBe('once');
  });
});
