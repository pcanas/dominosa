/**
 * Board layout and hit-testing math. Pure functions, independent of React, so
 * the gesture logic can be unit-tested and tuned without a device.
 */
import { makePair, type CellIndex } from '@/core';

export interface BoardMetrics {
  readonly rows: number;
  readonly cols: number;
  /** Side of a cell, in points. */
  readonly cell: number;
  /** Space between cells. */
  readonly gap: number;
  /** Inner padding of the board frame. */
  readonly padding: number;
  readonly width: number;
  readonly height: number;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface MetricsOptions {
  readonly gap?: number;
  readonly padding?: number;
  /** Cells never grow beyond this, so small boards do not look bloated on tablets. */
  readonly maxCell?: number;
}

/** Largest square cell size that fits the board in the available space. */
export function computeMetrics(
  rows: number,
  cols: number,
  availableWidth: number,
  availableHeight: number,
  { gap = 6, padding = 8, maxCell = 84 }: MetricsOptions = {},
): BoardMetrics {
  const fit = (available: number, count: number) => (available - 2 * padding - (count - 1) * gap) / count;
  const cell = Math.max(
    0,
    Math.floor(Math.min(fit(availableWidth, cols), fit(availableHeight, rows), maxCell)),
  );
  return {
    rows,
    cols,
    cell,
    gap,
    padding,
    width: 2 * padding + cols * cell + (cols - 1) * gap,
    height: 2 * padding + rows * cell + (rows - 1) * gap,
  };
}

export function cellRect(m: BoardMetrics, cell: CellIndex): Rect {
  const row = Math.floor(cell / m.cols);
  const col = cell % m.cols;
  const step = m.cell + m.gap;
  return { x: m.padding + col * step, y: m.padding + row * step, width: m.cell, height: m.cell };
}

/** Rectangle covering two adjacent cells and the gap between them. */
export function pairRect(m: BoardMetrics, a: CellIndex, b: CellIndex): Rect {
  const ra = cellRect(m, Math.min(a, b));
  const rb = cellRect(m, Math.max(a, b));
  return { x: ra.x, y: ra.y, width: rb.x + rb.width - ra.x, height: rb.y + rb.height - ra.y };
}

/**
 * Cell under a point in board coordinates, or -1 outside the grid. Points in
 * the gaps between cells snap to the nearest cell, so a touch is never lost.
 */
export function cellAtPoint(m: BoardMetrics, x: number, y: number): CellIndex {
  const step = m.cell + m.gap;
  const gx = x - m.padding + m.gap / 2;
  const gy = y - m.padding + m.gap / 2;
  if (gx < 0 || gy < 0) return -1;
  const col = Math.floor(gx / step);
  const row = Math.floor(gy / step);
  if (col >= m.cols || row >= m.rows) return -1;
  return row * m.cols + col;
}

/** Fraction of a cell the finger must travel before a drag picks a neighbour. */
export const DRAG_THRESHOLD = 0.35;

/**
 * Neighbour selected by dragging from `start` by (dx, dy), or -1 if the drag is
 * still too short or points off the board. Uses the dominant axis only, so a
 * slightly diagonal swipe still means "right" or "down".
 */
export function dragTarget(
  m: BoardMetrics,
  start: CellIndex,
  dx: number,
  dy: number,
  threshold: number = DRAG_THRESHOLD,
): CellIndex {
  if (start < 0) return -1;
  const horizontal = Math.abs(dx) >= Math.abs(dy);
  const distance = horizontal ? Math.abs(dx) : Math.abs(dy);
  if (distance < threshold * m.cell) return -1;

  const row = Math.floor(start / m.cols);
  const col = start % m.cols;
  if (horizontal) {
    const c = col + Math.sign(dx);
    return c >= 0 && c < m.cols ? row * m.cols + c : -1;
  }
  const r = row + Math.sign(dy);
  return r >= 0 && r < m.rows ? r * m.cols + col : -1;
}

/**
 * Bar drawn in the gap between two adjacent cells to show a wall: centred on
 * the gap, `thickness` across, `length` (a fraction of the cell) along it.
 */
export function wallRect(
  m: BoardMetrics,
  a: CellIndex,
  b: CellIndex,
  thickness: number,
  length: number = WALL_LENGTH,
): Rect {
  const first = cellRect(m, Math.min(a, b));
  const along = m.cell * length;
  const inset = (m.cell - along) / 2;
  const across = first.width + m.gap / 2 - thickness / 2;
  // Neighbours in the same row share a vertical gap; neighbours in a column, a horizontal one.
  const sameRow = Math.floor(a / m.cols) === Math.floor(b / m.cols);
  return sameRow
    ? { x: first.x + across, y: first.y + inset, width: thickness, height: along }
    : { x: first.x + inset, y: first.y + across, width: along, height: thickness };
}

/** Fraction of the cell side a wall bar covers. */
export const WALL_LENGTH = 0.72;

/** Thickness of a wall bar: fits inside the gap, grows a little with the cell. */
export function wallThickness(m: BoardMetrics): number {
  return Math.max(2, Math.min(m.gap - 2, Math.round(m.cell * 0.1)));
}

/** What a tap is aimed at: a wall between two cells, or a cell (to remove its domino). */
export type TapTarget =
  | { readonly kind: 'wall'; readonly a: CellIndex; readonly b: CellIndex }
  | { readonly kind: 'cell'; readonly cell: CellIndex };

export interface TapContext {
  readonly hasWall: (a: CellIndex, b: CellIndex) => boolean;
  readonly isCovered: (cell: CellIndex) => boolean;
}

/**
 * How far into a cell holding a domino a tap still reaches its walls: about a
 * quarter of the cell, capped so the domino keeps most of the cell.
 */
export const WALL_REACH_OVER_TILE = 0.25;
export const WALL_REACH_OVER_TILE_MAX = 10;

/**
 * What a tap at (x, y) is aimed at. Walls are drawn thin, so their touch area
 * is much larger than the bar: the gap plus a band into the cell under the
 * finger. That band is narrow when the cell holds a domino (the domino stays
 * easy to tap) and reaches the middle of the cell when it is empty (there is
 * nothing else to hit there). Otherwise the tap is on the cell itself.
 */
export function tapTargetAt(m: BoardMetrics, x: number, y: number, ctx: TapContext): TapTarget | null {
  const cell = cellAtPoint(m, x, y);
  if (cell < 0) return null;
  const r = cellRect(m, cell);
  const row = Math.floor(cell / m.cols);
  const col = cell % m.cols;
  const reach = ctx.isCovered(cell)
    ? Math.min(WALL_REACH_OVER_TILE_MAX, m.cell * WALL_REACH_OVER_TILE)
    : m.cell / 2;

  // Distance from the tap to each side of the cell (negative in the gap beyond it).
  const sides = [
    { neighbour: row > 0 ? cell - m.cols : -1, distance: y - r.y },
    { neighbour: row < m.rows - 1 ? cell + m.cols : -1, distance: r.y + r.height - y },
    { neighbour: col > 0 ? cell - 1 : -1, distance: x - r.x },
    { neighbour: col < m.cols - 1 ? cell + 1 : -1, distance: r.x + r.width - x },
  ];
  let best: { neighbour: CellIndex; distance: number } | null = null;
  for (const side of sides) {
    if (side.neighbour < 0 || side.distance > reach || !ctx.hasWall(cell, side.neighbour)) continue;
    if (!best || side.distance < best.distance) best = side;
  }
  if (!best) return { kind: 'cell', cell };
  return { kind: 'wall', ...makePair(cell, best.neighbour) };
}
