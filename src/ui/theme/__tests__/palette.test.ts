import { describe, expect, it } from 'vitest';

import { palettes, type Palette } from '../palette';

/** WCAG contrast ratio between two #RRGGBB colours. */
function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, bl] = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * bl!;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

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

  it('draws walls at 3:1 or more against the board and the cells', () => {
    expect(contrast(palette.wall, palette.board)).toBeGreaterThanOrEqual(3);
    expect(contrast(palette.wall, palette.cell)).toBeGreaterThanOrEqual(3);
  });
});
