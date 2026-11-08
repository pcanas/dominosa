/**
 * The app icon, as SVG: the last domino of a nearly solved board. A 3|5 domino
 * hovers over its dashed slot; the rest of the board sits back, flat and faint,
 * so the falling domino is the only piece with a dark outline. Every icon file
 * is drawn from `iconSvg` (see `generate-icons.ts`); change the art here, then
 * run `npm run icons`.
 *
 * Text is Nunito ExtraBold, the board's font: the script hands that font to the
 * renderer, and an editor opening the SVG needs it installed.
 */

const SIZE = 1024;
const CENTER = SIZE / 2;

/**
 * Android crops adaptive icons to the central 72 of 108 dp (a circle on many
 * launchers) and keeps the central 66 dp safe: at this scale the domino sits well
 * inside it. Both layers use it, so the domino stays over its slot.
 */
export const ADAPTIVE = 0.6;
/** Maskable PWA icons may be cropped to a circle of 80 % of the size. */
export const MASKABLE = 0.82;
/** Radius of Android's adaptive-icon safe zone (66 of 108 dp), in pixels of the 1024 canvas. */
export const ADAPTIVE_SAFE_RADIUS = (66 / 108) * CENTER;

type Point = readonly [number, number];

/** Short, stable numbers in the SVG. */
const n = (v: number) => +v.toFixed(1);

// --- Colours -------------------------------------------------------------------------------

interface DominoColours {
  readonly faceLight: string;
  readonly faceShade: string;
  readonly sideTop: string;
  readonly sideBottom: string;
  readonly edge: string;
  readonly divider: string;
  /** The 3. The icon keeps the plan's lighter terracotta; the app uses a darker one for text. */
  readonly top: string;
  /** The 5. */
  readonly bottom: string;
  readonly shadow: string;
  readonly shadowOpacity: number;
}

const DOMINO: DominoColours = {
  faceLight: '#FFFEFA',
  faceShade: '#F4EADB',
  sideTop: '#E2D0B2',
  sideBottom: '#B99B72',
  edge: '#8E7962',
  divider: '#C4B197',
  top: '#C8775A',
  bottom: '#4A3F35',
  shadow: '#3E3127',
  shadowOpacity: 0.5,
};

/** Greys only: the tinted iOS icon must be a grayscale image. */
const DOMINO_GREY: DominoColours = {
  faceLight: '#F4F4F4',
  faceShade: '#E2E2E2',
  sideTop: '#C9C9C9',
  sideBottom: '#959595',
  edge: '#8A8A8A',
  divider: '#B4B4B4',
  top: '#5E5E5E',
  bottom: '#2E2E2E',
  shadow: '#000000',
  shadowOpacity: 0.6,
};

interface BoardColours {
  readonly base: string;
  /** Bare cells and placed dominoes share it: placed dominoes are just merged cells. */
  readonly cell: string;
  readonly number: string;
  readonly divider: string;
  readonly slotFill: string;
  readonly slotEdge: string;
  readonly slotNumber: string;
}

const BOARDS = {
  // A shade darker than the domino, so the ivory stands out.
  light: {
    base: '#D3C1A2',
    cell: '#E0D2B9',
    number: '#B8A385',
    divider: '#D0BFA2',
    slotFill: '#CBB797',
    slotEdge: '#7F6A52',
    slotNumber: '#A38E71',
  },
  // iOS dark appearance: the same board at night.
  dark: {
    base: '#2A231E',
    cell: '#3A3129',
    number: '#6B5C4F',
    divider: '#473B32',
    slotFill: '#302821',
    slotEdge: '#B09C85',
    slotNumber: '#857363',
  },
  // iOS tinted appearance: the system tints by brightness, so the board stays dark.
  grey: {
    base: '#0D0D0D',
    cell: '#222222',
    number: '#4A4A4A',
    divider: '#2E2E2E',
    slotFill: '#161616',
    slotEdge: '#8A8A8A',
    slotNumber: '#5A5A5A',
  },
} satisfies Record<string, BoardColours>;

// --- Layout --------------------------------------------------------------------------------

/** Board cell size, the slot's centre (the board turns around it) and the board's tilt. */
const CELL = 330;
const SLOT: Point = [590, 676];
const BOARD_ANGLE = -7;

interface Piece {
  readonly center: Point;
  readonly width: number;
  readonly height: number;
  readonly angle: number;
  /** How much of the domino's side shows below its face. */
  readonly depth: number;
}

/** The falling domino: a touch bigger than its slot, as it is closer to the eye, and not yet aligned. */
const PIECE: Piece = {
  center: [466, 468],
  width: 0.94 * CELL * 1.15,
  height: 1.88 * CELL * 1.15,
  angle: -14,
  depth: 34,
};

/** The domino alone (splash screen, favicon, themed icon): centred and 800 px tall. */
const LONE_PIECE: Piece = {
  ...PIECE,
  center: [CENTER, CENTER],
  width: (PIECE.width * 800) / PIECE.height,
  height: 800,
  depth: (PIECE.depth * 800) / PIECE.height,
};

/**
 * Numbers of the board around the slot (column 2, rows 2–3: the 3 and the 5),
 * and the dominoes already placed there. Further out, `boardNumber` and
 * `outerDominoes` carry on with the same kind of pattern, for the layers that
 * show more board (Android, maskable PWA icon).
 */
const NUMBERS = [
  [1, 4, 0, 2, 6, 3],
  [5, 2, 6, 4, 1, 0],
  [0, 3, 3, 1, 2, 5],
  [6, 1, 5, 0, 4, 2],
  [2, 4, 0, 6, 3, 1],
  [3, 6, 2, 5, 0, 4],
] as const;
const CORE = NUMBERS.length;

type Domino = readonly [c1: number, r1: number, c2: number, r2: number];

const SLOT_DOMINO: Domino = [2, 2, 2, 3];
const CORE_DOMINOES: readonly Domino[] = [
  [0, 0, 1, 0],
  [2, 0, 3, 0],
  [4, 0, 5, 0],
  [0, 1, 0, 2],
  [1, 1, 2, 1],
  [3, 1, 3, 2],
  [4, 1, 5, 1],
  [1, 2, 1, 3],
  [4, 2, 4, 3],
  [5, 2, 5, 3],
  [0, 3, 0, 4],
  [3, 3, 3, 4],
  [1, 4, 2, 4],
  [4, 4, 5, 4],
  [0, 5, 1, 5],
  [2, 5, 3, 5],
  [4, 5, 5, 5],
];

/** A small integer hash, so the outer board is the same on every run. */
function hash(a: number, b: number): number {
  let h = Math.imul(a, 0x27d4eb2d) ^ Math.imul(b, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  return (h ^ (h >>> 12)) >>> 0;
}

const inCore = (c: number, r: number) => c >= 0 && c < CORE && r >= 0 && r < CORE;

function boardNumber(c: number, r: number): number {
  return inCore(c, r) ? NUMBERS[r]![c]! : hash(c, r) % 7;
}

/** Outside the core, 2×2 blocks of two horizontal or two vertical dominoes tile the rest. */
function outerDominoes(from: number, to: number): Domino[] {
  const out: Domino[] = [];
  for (let bj = Math.floor(from / 2); bj <= Math.floor(to / 2); bj++) {
    for (let bi = Math.floor(from / 2); bi <= Math.floor(to / 2); bi++) {
      const c = 2 * bi;
      const r = 2 * bj;
      if (inCore(c, r)) continue;
      if (hash(bi, bj) % 2 === 0) {
        out.push([c, r, c + 1, r], [c, r + 1, c + 1, r + 1]);
      } else {
        out.push([c, r, c, r + 1], [c + 1, r, c + 1, r + 1]);
      }
    }
  }
  return out;
}

// --- Geometry ------------------------------------------------------------------------------

/** Points along a rounded rectangle's outline. */
function roundedRectPoints(x: number, y: number, w: number, h: number, r: number, segments = 12): Point[] {
  const corners: [number, number, number][] = [
    [x + w - r, y + r, -90],
    [x + w - r, y + h - r, 0],
    [x + r, y + h - r, 90],
    [x + r, y + r, 180],
  ];
  return corners.flatMap(([cx, cy, from]) =>
    Array.from({ length: segments + 1 }, (_, i): Point => {
      const a = ((from + (90 * i) / segments) * Math.PI) / 180;
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    }),
  );
}

function rotate([x, y]: Point, degrees: number, [cx, cy]: Point): Point {
  const a = (degrees * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c];
}

/** Convex hull (Andrew's monotone chain), to draw the tile's face and side as one solid. */
function hull(points: readonly Point[]): Point[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Point, a: Point, b: Point) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list: readonly Point[]) => {
    const out: Point[] = [];
    for (const q of list) {
      while (out.length >= 2 && cross(out[out.length - 2]!, out[out.length - 1]!, q) <= 0) out.pop();
      out.push(q);
    }
    out.pop();
    return out;
  };
  return [...half(sorted), ...half([...sorted].reverse())];
}

const pathData = (points: readonly Point[]) => `M${points.map(([x, y]) => `${n(x)} ${n(y)}`).join(' L')}Z`;

const text = (value: string | number, x: number, y: number, size: number, fill: string) =>
  `<text x="${n(x)}" y="${n(y)}" text-anchor="middle" dominant-baseline="central" font-family="Nunito" font-weight="800" font-size="${n(size)}" fill="${fill}">${value}</text>`;

// --- Pieces of the art ---------------------------------------------------------------------

/**
 * The board, turned around the slot. `scale` is only used to skip cells that fall
 * outside the canvas, so the SVG stays small.
 */
function board(colours: BoardColours, scale: number): string {
  const s = CELL;
  const ox = SLOT[0] - 2.5 * s;
  const oy = SLOT[1] - 3 * s;
  const corner = (c: number, r: number): Point => [ox + c * s, oy + r * s];
  const visible = (c: number, r: number) => {
    const [x, y] = rotate([ox + (c + 0.5) * s, oy + (r + 0.5) * s], BOARD_ANGLE, SLOT);
    const margin = s;
    const sx = CENTER + (x - CENTER) * scale;
    const sy = CENTER + (y - CENTER) * scale;
    return sx > -margin && sx < SIZE + margin && sy > -margin && sy < SIZE + margin;
  };
  // Enough cells to cover the canvas at the smallest scale used (Android's).
  const from = -6;
  const to = CORE + 5;
  const cellInset = 0.035 * s;
  const pieceInset = 0.06 * s;
  const numberSize = 0.4 * s;
  const numberAt = (c: number, r: number, fill: string) => {
    const [x, y] = corner(c, r);
    return text(boardNumber(c, r), x + s / 2, y + s / 2 + 0.03 * s, numberSize, fill);
  };

  let out = '';
  for (let r = from; r <= to; r++) {
    for (let c = from; c <= to; c++) {
      if (!visible(c, r)) continue;
      const [x, y] = corner(c, r);
      out += `<rect x="${n(x + cellInset)}" y="${n(y + cellInset)}" width="${n(s - 2 * cellInset)}" height="${n(s - 2 * cellInset)}" rx="${n(0.2 * s)}" fill="${colours.cell}"/>`;
    }
  }
  // Placed dominoes: merged cells with a faint divider, nothing that competes with the falling one.
  for (const [c1, r1, c2, r2] of [...CORE_DOMINOES, ...outerDominoes(from, to)]) {
    if (!visible(c1, r1) && !visible(c2, r2)) continue;
    const [x1, y1] = corner(c1, r1);
    const [x2, y2] = corner(c2, r2);
    const w = x2 - x1 + s - 2 * pieceInset;
    const h = y2 - y1 + s - 2 * pieceInset;
    const mx = x1 + pieceInset + w / 2;
    const my = y1 + pieceInset + h / 2;
    const half = 0.22 * s;
    const [dx1, dy1, dx2, dy2] = r1 === r2 ? [mx, my - half, mx, my + half] : [mx - half, my, mx + half, my];
    out +=
      `<rect x="${n(x1 + pieceInset)}" y="${n(y1 + pieceInset)}" width="${n(w)}" height="${n(h)}" rx="${n(0.24 * s)}" fill="${colours.cell}"/>` +
      `<line x1="${n(dx1)}" y1="${n(dy1)}" x2="${n(dx2)}" y2="${n(dy2)}" stroke="${colours.divider}" stroke-width="${n(0.022 * s)}" stroke-linecap="round"/>` +
      numberAt(c1, r1, colours.number) +
      numberAt(c2, r2, colours.number);
  }
  // The empty slot, dashed like the slot preview in the game.
  const [sc, sr] = SLOT_DOMINO;
  const [x, y] = corner(sc, sr);
  out +=
    `<rect x="${n(x + pieceInset)}" y="${n(y + pieceInset)}" width="${n(s - 2 * pieceInset)}" height="${n(2 * s - 2 * pieceInset)}" rx="${n(0.24 * s)}" fill="${colours.slotFill}" stroke="${colours.slotEdge}" stroke-width="${n(0.028 * s)}" stroke-dasharray="${n(0.09 * s)} ${n(0.07 * s)}" stroke-linecap="round"/>` +
    numberAt(sc, sr, colours.slotNumber) +
    numberAt(sc, sr + 1, colours.slotNumber);
  return `<g transform="rotate(${BOARD_ANGLE} ${SLOT[0]} ${SLOT[1]})" filter="url(#focus)">${out}</g>`;
}

/** The 3|5 domino: a solid tile whose side shows below its face. */
function domino(piece: Piece, colours: DominoColours, shadow: boolean): string {
  const { center, width: w, height: h, angle, depth } = piece;
  const [cx, cy] = center;
  const k = w / 410;
  const x = cx - w / 2;
  const y = cy - h / 2;
  const r = 0.25 * w;
  const edge = 13;

  const outline = roundedRectPoints(x, y, w, h, r).map((p) => rotate(p, angle, center));
  const body = hull([...outline, ...outline.map(([px, py]): Point => [px, py + depth])]);
  const bottom = Math.max(...body.map(([, py]) => py));
  const side =
    `<linearGradient id="side" gradientUnits="userSpaceOnUse" x1="0" y1="${n(bottom - depth * 2.4)}" x2="0" y2="${n(bottom)}">` +
    `<stop offset="0" stop-color="${colours.sideTop}"/><stop offset="1" stop-color="${colours.sideBottom}"/></linearGradient>`;

  const inset = 16 * k;
  const dividerInset = 74 * k;
  const line = (dy: number, stroke: string) =>
    `<line x1="${n(x + dividerInset)}" y1="${n(cy + dy)}" x2="${n(x + w - dividerInset)}" y2="${n(cy + dy)}" stroke="${stroke}" stroke-width="${n(11 * k)}" stroke-linecap="round"/>`;
  const font = 0.7 * w;
  // Each digit has a light copy just below it, as if pressed into the tile.
  const digit = (value: string, digitY: number, fill: string) =>
    text(value, cx, digitY + 6 * k, font, '#FFFFFF') + text(value, cx, digitY, font, fill);

  return (
    `<defs>${side}</defs>` +
    `<path d="${pathData(body)}" fill="url(#side)" stroke="${colours.edge}" stroke-width="${n(edge)}" stroke-linejoin="round"${shadow ? ' filter="url(#lift)"' : ''}/>` +
    `<g transform="rotate(${angle} ${n(cx)} ${n(cy)})">` +
    `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${n(r)}" fill="url(#face)" stroke="${colours.edge}" stroke-width="${n(edge * 0.7)}"/>` +
    `<rect x="${n(x + inset)}" y="${n(y + inset)}" width="${n(w - 2 * inset)}" height="${n(h - 2 * inset)}" rx="${n(r - inset)}" fill="none" stroke="url(#light)" stroke-width="${n(9 * k)}"/>` +
    line(4 * k, '#FFFFFF') +
    line(0, colours.divider) +
    digit('3', y + h / 4 + 10 * k, colours.top) +
    digit('5', cy + h / 4 + 10 * k, colours.bottom) +
    '</g>'
  );
}

/** White domino with its divider and digits cut out, for Android's themed icon. */
function silhouette(piece: Piece): string {
  const { center, width: w, height: h, angle } = piece;
  const [cx, cy] = center;
  const k = w / 410;
  const x = cx - w / 2;
  const y = cy - h / 2;
  const font = 0.7 * w;
  const cut =
    `<line x1="${n(x + 74 * k)}" y1="${n(cy)}" x2="${n(x + w - 74 * k)}" y2="${n(cy)}" stroke="black" stroke-width="${n(11 * k)}" stroke-linecap="round"/>` +
    text('3', cx, y + h / 4 + 10 * k, font, 'black') +
    text('5', cx, cy + h / 4 + 10 * k, font, 'black');
  return (
    `<defs><mask id="cut"><rect width="${SIZE}" height="${SIZE}" fill="black"/>` +
    `<g transform="rotate(${angle} ${n(cx)} ${n(cy)})"><rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${n(0.25 * w)}" fill="white"/>${cut}</g></mask></defs>` +
    `<rect width="${SIZE}" height="${SIZE}" fill="white" mask="url(#cut)"/>`
  );
}

// --- The icon ------------------------------------------------------------------------------

export interface IconOptions {
  /**
   * What is drawn behind the domino: the board (`light`, the main icon), the same
   * board at night (`dark`, iOS dark appearance), greys on black (`grey`, the tinted
   * iOS icon, which must be grayscale), or nothing (`none`: transparent).
   */
  readonly board: 'light' | 'dark' | 'grey' | 'none';
  /** Draw the falling domino. Off for Android's background layer. */
  readonly piece?: boolean;
  /** The domino alone and centred (splash screen, favicon, themed icon) instead of over its slot. */
  readonly centered?: boolean;
  /** Size relative to the main icon: smaller where launchers crop more (adaptive and maskable icons). */
  readonly scale?: number;
  /** White silhouette with the digits cut out, for Android's themed (monochrome) icon. */
  readonly silhouette?: boolean;
  readonly shadow?: boolean;
}

export function iconSvg({
  board: boardStyle,
  piece = true,
  centered = false,
  scale = 1,
  silhouette: asSilhouette = false,
  shadow = !asSilhouette,
}: IconOptions): string {
  const colours = boardStyle === 'grey' ? DOMINO_GREY : DOMINO;
  const shadowColour = boardStyle === 'dark' ? '#000000' : colours.shadow;
  const shadowOpacity = boardStyle === 'dark' ? 0.55 : colours.shadowOpacity;
  const defs = [
    `<linearGradient id="face" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${colours.faceLight}"/><stop offset="1" stop-color="${colours.faceShade}"/></linearGradient>`,
    // A soft highlight along the face's top-left edge.
    `<linearGradient id="light" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="1"/><stop offset="0.45" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>`,
    // The falling domino's shadow, cast down and to the right, onto its slot.
    `<filter id="lift" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceAlpha" stdDeviation="24"/><feOffset dx="30" dy="62" result="blur"/><feFlood flood-color="${shadowColour}" flood-opacity="${shadowOpacity}"/><feComposite in2="blur" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>`,
    // A touch of blur keeps the board behind the domino.
    `<filter id="focus" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2.2"/></filter>`,
  ].join('');

  const pieceShape = centered ? LONE_PIECE : PIECE;
  let art = '';
  if (boardStyle !== 'none') art += board(BOARDS[boardStyle], scale);
  if (piece) art += asSilhouette ? silhouette(pieceShape) : domino(pieceShape, colours, shadow);

  const backdrop =
    boardStyle === 'none' ? '' : `<rect width="${SIZE}" height="${SIZE}" fill="${BOARDS[boardStyle].base}"/>`;
  const transform =
    scale === 1
      ? ''
      : ` transform="translate(${CENTER} ${CENTER}) scale(${scale}) translate(${-CENTER} ${-CENTER})"`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">` +
    `<defs>${defs}</defs>${backdrop}<g${transform}>${art}</g></svg>`
  );
}
