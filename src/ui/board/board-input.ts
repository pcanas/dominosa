/**
 * Input state machine for the board, independent of the gesture library:
 *  - `begin` at touch-down remembers the start cell;
 *  - `move` picks the neighbour in the drag direction once the finger has
 *    travelled far enough (a ghost domino is shown);
 *  - `end` places the ghost, if any; sliding back cancels it;
 *  - `tap` reports the cell under a quick touch.
 */
import type { CellIndex } from '@/core';

import { cellAtPoint, dragTarget, type BoardMetrics } from './geometry';

export interface DragState {
  readonly start: CellIndex;
  /** Neighbour currently selected, or -1 while the drag is too short. */
  readonly target: CellIndex;
}

export interface BoardInputConfig {
  readonly metrics: BoardMetrics | null;
  readonly onPlace: (a: CellIndex, b: CellIndex) => void;
  readonly onTap: (cell: CellIndex) => void;
}

export class BoardInput {
  private config: BoardInputConfig = { metrics: null, onPlace: () => {}, onTap: () => {} };
  private drag: DragState | null = null;
  private readonly listeners = new Set<() => void>();

  configure(config: BoardInputConfig): void {
    this.config = config;
  }

  begin(x: number, y: number): void {
    const { metrics } = this.config;
    const start = metrics ? cellAtPoint(metrics, x, y) : -1;
    this.setDrag(start >= 0 ? { start, target: -1 } : null);
  }

  move(dx: number, dy: number): void {
    const { metrics } = this.config;
    if (!metrics || !this.drag) return;
    const target = dragTarget(metrics, this.drag.start, dx, dy);
    if (target !== this.drag.target) this.setDrag({ start: this.drag.start, target });
  }

  /** The drag gesture completed: place the ghost domino, if there is one. */
  end(): void {
    const drag = this.drag;
    if (drag && drag.target >= 0) this.config.onPlace(drag.start, drag.target);
  }

  /** The touch finished, whatever happened: clear the drag feedback. */
  finalize(): void {
    this.setDrag(null);
  }

  tap(x: number, y: number): void {
    const { metrics } = this.config;
    const cell = metrics ? cellAtPoint(metrics, x, y) : -1;
    if (cell >= 0) this.config.onTap(cell);
  }

  // Store protocol for useSyncExternalStore.
  readonly getDrag = (): DragState | null => this.drag;

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private setDrag(next: DragState | null): void {
    if (next === this.drag) return;
    this.drag = next;
    this.listeners.forEach((listener) => listener());
  }
}
