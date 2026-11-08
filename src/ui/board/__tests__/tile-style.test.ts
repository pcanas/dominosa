import { describe, expect, it } from 'vitest';

import { contrastRatio } from '@/ui/theme/contrast';
import { palettes } from '@/ui/theme/palette';

import { isPreview, TILE_VARIANTS, tileColors } from '../tile-style';

describe.each(Object.entries(palettes))('tiles on the %s palette', (_scheme, palette) => {
  it.each(TILE_VARIANTS)('outlines a %s domino at 3:1 or more against the board and the cells', (variant) => {
    const { border } = tileColors(palette, variant);
    expect(contrastRatio(border, palette.board)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(border, palette.cell)).toBeGreaterThanOrEqual(3);
  });

  it.each(TILE_VARIANTS)('keeps the numbers readable on a %s domino', (variant) => {
    const { fill } = tileColors(palette, variant);
    // Transparent previews show the cell below.
    const background = fill === 'transparent' ? palette.cell : fill;
    expect(contrastRatio(palette.text, background)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('isPreview', () => {
  it('marks drag previews and tracker slots, not dominoes on the board', () => {
    expect(TILE_VARIANTS.filter(isPreview)).toEqual(['ghost', 'blocked', 'slot']);
  });
});
