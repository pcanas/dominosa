/**
 * The app icon, as SVG: a tilted ivory domino showing a terracotta 3 and a
 * brown 5 on warm beige. Every icon file is drawn from `iconSvg` (see
 * `generate-icons.ts`); change the art here, then run `npm run icons`.
 *
 * The digits are Nunito ExtraBold, the board's font: the script hands that
 * font to the renderer, and an editor opening the SVG needs it installed.
 */

/** Colours of the art. The icon keeps the plan's lighter terracotta; the app uses a darker one for text. */
const ART = {
  backgroundTop: '#F8F2E8',
  backgroundBottom: '#E7DAC4',
  tileLight: '#FFFEFA',
  tileShade: '#F4EADB',
  edge: '#8E7962',
  divider: '#C4B197',
  top: '#C8775A',
  bottom: '#4A3F35',
  shadow: '#5A4A3C',
} as const;

const TINTED = {
  tileLight: '#F2F2F2',
  tileShade: '#E2E2E2',
  edge: '#8C8C8C',
  divider: '#B4B4B4',
  top: '#5E5E5E',
  bottom: '#2E2E2E',
} as const;

export interface IconOptions {
  /** `light`: beige backdrop (the main icon); `none`: transparent; `black`: for the tinted iOS variant. */
  readonly background: 'light' | 'none' | 'black';
  /** Domino size relative to the main icon: smaller where launchers crop more (adaptive and maskable icons). */
  readonly scale?: number;
  /** Greys only, for the tinted iOS icon. */
  readonly grey?: boolean;
  /** White silhouette with the digits cut out, for Android's themed (monochrome) icon. */
  readonly silhouette?: boolean;
  readonly shadow?: boolean;
  readonly rotation?: number;
}

const SIZE = 1024;
const CENTER = SIZE / 2;
const W = 410;
const H = 800;

export function iconSvg({
  background,
  scale = 1,
  grey = false,
  silhouette = false,
  shadow = !silhouette,
  rotation = -12,
}: IconOptions): string {
  const c = grey ? { ...ART, ...TINTED } : ART;
  const x = CENTER - W / 2;
  const y = CENTER - H / 2;
  const digit = (text: string, cy: number, fill: string) =>
    `<text x="${CENTER}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-family="Nunito" font-weight="800" font-size="290" fill="${fill}">${text}</text>`;
  const marks = (top: string, bottom: string, line: string) =>
    `<line x1="${x + 74}" y1="${CENTER}" x2="${x + W - 74}" y2="${CENTER}" stroke="${line}" stroke-width="11" stroke-linecap="round"/>` +
    digit('3', y + H / 4 + 10, top) +
    digit('5', CENTER + H / 4 + 10, bottom);

  const defs = [
    `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.backgroundTop}"/><stop offset="1" stop-color="${c.backgroundBottom}"/></linearGradient>`,
    `<linearGradient id="tile" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.tileLight}"/><stop offset="1" stop-color="${c.tileShade}"/></linearGradient>`,
    `<filter id="shadow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur in="SourceAlpha" stdDeviation="26"/><feOffset dy="28" result="blur"/><feFlood flood-color="${c.shadow}" flood-opacity="0.3"/><feComposite in2="blur" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>`,
    // Silhouette: the domino's shape minus its digits and divider.
    `<mask id="cut"><rect width="${SIZE}" height="${SIZE}" fill="black"/><rect x="${x}" y="${y}" width="${W}" height="${H}" rx="100" fill="white"/>${marks('black', 'black', 'black')}</mask>`,
  ].join('');

  const domino = silhouette
    ? `<rect x="0" y="0" width="${SIZE}" height="${SIZE}" fill="white" mask="url(#cut)"/>`
    : `<g${shadow ? ' filter="url(#shadow)"' : ''}><rect x="${x}" y="${y}" width="${W}" height="${H}" rx="100" fill="url(#tile)" stroke="${c.edge}" stroke-width="13"/></g>` +
      marks(c.top, c.bottom, c.divider);

  const backdrop =
    background === 'light'
      ? `<rect width="${SIZE}" height="${SIZE}" fill="url(#bg)"/>`
      : background === 'black'
        ? `<rect width="${SIZE}" height="${SIZE}" fill="#000000"/>`
        : '';

  const transform = `translate(${CENTER} ${CENTER}) scale(${scale}) rotate(${rotation}) translate(${-CENTER} ${-CENTER})`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">` +
    `<defs>${defs}</defs>${backdrop}<g transform="${transform}">${domino}</g></svg>`
  );
}
