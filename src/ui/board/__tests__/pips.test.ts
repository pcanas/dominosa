import { describe, expect, it } from 'vitest';

import { canShowPips, MAX_PIPS, pipDiameter, pipLayout } from '../pips';

describe('pipLayout', () => {
  it('has one dot per unit, from blank to six', () => {
    for (let value = 0; value <= MAX_PIPS; value++) expect(pipLayout(value)).toHaveLength(value);
  });

  it('keeps every dot inside the face and never stacks two dots', () => {
    for (let value = 0; value <= MAX_PIPS; value++) {
      const dots = pipLayout(value);
      for (const [x, y] of dots) {
        expect(x).toBeGreaterThan(0.15);
        expect(x).toBeLessThan(0.85);
        expect(y).toBeGreaterThan(0.15);
        expect(y).toBeLessThan(0.85);
      }
      expect(new Set(dots.map(([x, y]) => `${x},${y}`)).size).toBe(dots.length);
    }
  });

  it('is symmetric through the centre, like a real domino face', () => {
    for (let value = 0; value <= MAX_PIPS; value++) {
      const dots = new Set(pipLayout(value).map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`));
      for (const [x, y] of pipLayout(value))
        expect(dots.has(`${(1 - x).toFixed(2)},${(1 - y).toFixed(2)}`)).toBe(true);
    }
  });

  it('refuses values a domino face cannot show', () => {
    expect(() => pipLayout(7)).toThrow(RangeError);
    expect(() => pipLayout(-1)).toThrow(RangeError);
    expect(() => pipLayout(1.5)).toThrow(RangeError);
  });
});

describe('canShowPips', () => {
  it('allows boards up to the double-six set', () => {
    expect(canShowPips(3)).toBe(true);
    expect(canShowPips(6)).toBe(true);
    expect(canShowPips(7)).toBe(false);
    expect(canShowPips(8)).toBe(false);
  });
});

describe('pipDiameter', () => {
  it('scales with the face, without dots too small to see', () => {
    expect(pipDiameter(80)).toBeGreaterThan(pipDiameter(34));
    expect(pipDiameter(10)).toBe(3);
    // Dots in the same row never touch: centres are 0.23 of the face apart.
    for (const face of [20, 34, 50, 84]) expect(pipDiameter(face)).toBeLessThan(face * 0.23);
  });
});
