/**
 * How each kind of domino on the board is drawn. Pure, so the palette tests can
 * check that every outline stays visible against the board.
 */
import type { Palette } from '@/ui/theme/palette';

/**
 * `ghost`: preview while dragging; `blocked`: preview over a wall, where the
 * domino cannot go; `slot`: a free slot for the pair picked in the tracker;
 * `highlighted`: a placed domino of that pair.
 */
export type TileVariant = 'placed' | 'duplicate' | 'solved' | 'ghost' | 'blocked' | 'slot' | 'highlighted';

export const TILE_VARIANTS: readonly TileVariant[] = [
  'placed',
  'duplicate',
  'solved',
  'ghost',
  'blocked',
  'slot',
  'highlighted',
];

export interface TileColors {
  readonly fill: string;
  /** The outline; previews draw it dashed. */
  readonly border: string;
  /** The line between the two halves. */
  readonly divider: string;
}

/** Outlines of things that are not (yet) a domino on the board: drawn dashed, never animated away. */
export function isPreview(variant: TileVariant): boolean {
  return variant === 'ghost' || variant === 'blocked' || variant === 'slot';
}

export function tileColors(palette: Palette, variant: TileVariant): TileColors {
  switch (variant) {
    case 'placed':
      return { fill: palette.tile, border: palette.tileEdge, divider: palette.tileBorder };
    case 'duplicate':
      return { fill: palette.accentSoft, border: palette.accent, divider: palette.accent };
    case 'solved':
      return { fill: palette.successSoft, border: palette.success, divider: palette.success };
    case 'ghost':
      return { fill: 'transparent', border: palette.textSecondary, divider: 'transparent' };
    case 'blocked':
      return { fill: 'transparent', border: palette.accent, divider: 'transparent' };
    case 'slot':
      return { fill: palette.successSoft, border: palette.success, divider: 'transparent' };
    case 'highlighted':
      return { fill: palette.tile, border: palette.success, divider: palette.tileBorder };
  }
}
