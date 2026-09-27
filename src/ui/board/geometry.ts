/**
 * Board layout and hit-testing math. Pure functions, independent of React, so
 * the gesture logic can be unit-tested and tuned without a device.
 */
import type { CellIndex } from '@/core';

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
