import { describe, expect, it } from 'vitest';

import { contrastRatio as contrast } from '../contrast';
import { palettes, type Palette } from '../palette';

describe('contrastRatio', () => {
  it('matches WCAG reference values', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrast('#777777', '#FFFFFF')).toBeCloseTo(4.48, 2);
    expect(contrast('#ABCDEF', '#ABCDEF')).toBe(1);
  });

  it('rejects colours it cannot read', () => {
    expect(() => contrast('red', '#FFFFFF')).toThrow(RangeError);
  });
});

describe.each(Object.entries(palettes))('%s palette', (_scheme, palette: Palette) => {
  it('keeps text readable (4.5:1) wherever it is written', () => {
    for (const fg of [palette.text, palette.textSecondary]) {
      for (const bg of [palette.background, palette.surface, palette.cell]) {
        expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
      }
    }
    for (const bg of [palette.tile, palette.accentSoft, palette.successSoft]) {
      expect(contrast(palette.text, bg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps terracotta and sage readable as text on the background and surfaces', () => {
    for (const fg of [palette.accent, palette.success]) {
      for (const bg of [palette.background, palette.surface]) {
        expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('draws walls and domino outlines at 3:1 or more against the board and the cells', () => {
    for (const line of [palette.wall, palette.tileEdge, palette.accent, palette.success]) {
      expect(contrast(line, palette.board)).toBeGreaterThanOrEqual(3);
      expect(contrast(line, palette.cell)).toBeGreaterThanOrEqual(3);
    }
  });

  it('keeps the repeated-domino badge visible on the domino', () => {
    // The badge is a terracotta disc with a mark in the tile colour.
    expect(contrast(palette.accent, palette.tile)).toBeGreaterThanOrEqual(3);
  });
});
