/**
 * Colour tokens. Light values come straight from the plan (section 7); dark is
 * a warm variant built around the plan's #2B2622 background.
 *
 * Contrast (WCAG): `text` on `cell` and on `tile` is above 8:1 in both
 * schemes; `textSecondary` is only used for non-essential labels.
 */
export interface Palette {
  readonly background: string;
  readonly board: string;
  readonly cell: string;
  readonly tile: string;
  readonly tileBorder: string;
  readonly text: string;
  readonly textSecondary: string;
  /** Terracotta: errors and primary actions. */
  readonly accent: string;
  /** Tile fill for a duplicated domino. */
  readonly accentSoft: string;
  /** Sage: solved state. */
  readonly success: string;
  readonly successSoft: string;
  /** Raised surfaces such as cards and toolbar buttons. */
  readonly surface: string;
  readonly surfacePressed: string;
}

export const palettes: Readonly<Record<'light' | 'dark', Palette>> = {
  light: {
    background: '#F4EDE2',
    board: '#E6D9C3',
    cell: '#FBF7F0',
    tile: '#FFFCF6',
    tileBorder: '#B9A58C',
    text: '#4A3F35',
    textSecondary: '#8C7B68',
    accent: '#C8775A',
    accentSoft: '#F6E0D6',
    success: '#8FA58A',
    successSoft: '#E4ECE1',
    surface: '#FBF7F0',
    surfacePressed: '#EFE5D6',
  },
  dark: {
    background: '#2B2622',
    board: '#38312B',
    cell: '#433A33',
    tile: '#5B4F45',
    tileBorder: '#8C7B68',
    text: '#F3EADF',
    textSecondary: '#B7A794',
    accent: '#DB8C6F',
    accentSoft: '#6E4A3D',
    success: '#9DB598',
    successSoft: '#4A5646',
    surface: '#38312B',
    surfacePressed: '#433A33',
  },
};
