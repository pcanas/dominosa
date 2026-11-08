/**
 * Colour tokens. Light values come from the plan (section 7); dark is a warm
 * variant built around the plan's #2B2622 background.
 *
 * Palette v2 (hito 2) keeps the look but makes every colour that carries
 * meaning readable (checked by the palette and tile tests):
 *  - `text` and `textSecondary`: 4.5:1 on the background, surfaces and cells.
 *  - `accent` and `success` are also used as text, so they reach 4.5:1 on the
 *    background and surfaces; in light mode they are darker than the plan's
 *    #C8775A and #8FA58A, which stay in the icon.
 *  - Domino outlines (`tileEdge`, `accent`, `success`) and walls: 3:1 against
 *    the board and the cells around them.
 */
export interface Palette {
  readonly background: string;
  readonly board: string;
  readonly cell: string;
  readonly tile: string;
  /** Outline of a placed domino: what tells it apart from the board. */
  readonly tileEdge: string;
  /** Soft lines: card and button borders, the line between a domino's halves. */
  readonly tileBorder: string;
  readonly text: string;
  readonly textSecondary: string;
  /** Terracotta: repeated dominoes, warnings and the "in progress" mark. */
  readonly accent: string;
  /** Tile fill for a duplicated domino. */
  readonly accentSoft: string;
  /** Sage: solved state. */
  readonly success: string;
  readonly successSoft: string;
  /** Wall marks between cells. */
  readonly wall: string;
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
    tileEdge: '#8C7357',
    tileBorder: '#B9A58C',
    text: '#4A3F35',
    textSecondary: '#796957',
    accent: '#A3523A',
    accentSoft: '#F6E0D6',
    success: '#5A7056',
    successSoft: '#E4ECE1',
    wall: '#7A6A58',
    surface: '#FBF7F0',
    surfacePressed: '#EFE5D6',
  },
  dark: {
    background: '#2B2622',
    board: '#38312B',
    cell: '#433A33',
    tile: '#5B4F45',
    tileEdge: '#9C8A75',
    tileBorder: '#8C7B68',
    text: '#F3EADF',
    textSecondary: '#B7A794',
    accent: '#DB8C6F',
    accentSoft: '#6E4A3D',
    success: '#9DB598',
    successSoft: '#4A5646',
    wall: '#C9B9A5',
    surface: '#38312B',
    surfacePressed: '#433A33',
  },
};
