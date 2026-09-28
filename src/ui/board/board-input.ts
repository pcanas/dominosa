/**
 * Input state machine for the board, independent of the gesture library:
 *  - `begin` at touch-down remembers the start cell, with the current tool
 *    (domino, or wall while the wall button is on), and what a tap there
 *    would remove (shown while the finger rests);
 *  - `startSwipe` means the finger started moving: it is no longer a tap;
 *  - `move` picks the neighbour in the drag direction once the finger has
 *    travelled far enough (a ghost domino or wall is shown);
 *  - `end` places the domino or draws the wall, if a neighbour is picked;
 *    sliding back cancels it;
 *  - `tap` removes what the quick touch is aimed at: a wall or a domino.
 */
import type { CellIndex } from '@/core';

import { cellAtPoint, dragTarget, type BoardMetrics, type TapTarget } from './geometry';

/** What a swipe between two cells does. */
export type BoardTool = 'domino' | 'wall';

export interface DragState {
  readonly start: CellIndex;
  /** Neighbour currently selected, or -1 while the drag is too short. */
  readonly target: CellIndex;
  readonly tool: BoardTool;
  /** What lifting the finger now would remove, until it starts moving (or rests too long). */
  readonly press: TapTarget | null;
}

export interface BoardInputConfig {
  readonly metrics: BoardMetrics | null;
  /** Tool used by a swipe. */
  readonly tool: BoardTool;
  readonly onPlace: (a: CellIndex, b: CellIndex) => void;
  readonly onWall: (a: CellIndex, b: CellIndex) => void;
  readonly onTap: (target: TapTarget) => void;
  /** What a tap at a point of the board is aimed at. */
  readonly hitTest: (x: number, y: number) => TapTarget | null;
}

/** Longest touch that still counts as a tap. */
export const TAP_MAX_MS = 500;

export class BoardInput {
  private config: BoardInputConfig = {
    metrics: null,
    tool: 'domino',
    onPlace: () => {},
    onWall: () => {},
    onTap: () => {},
    hitTest: () => null,
  };
  private drag: DragState | null = null;
  private pressTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly listeners = new Set<() => void>();

  configure(config: BoardInputConfig): void {
    this.config = config;
  }

  begin(x: number, y: number): void {
    const { metrics, tool, hitTest } = this.config;
    this.clearPressTimer();
    const start = metrics ? cellAtPoint(metrics, x, y) : -1;
    if (start < 0) {
      this.setDrag(null);
      return;
    }
    const press = hitTest(x, y);
    this.setDrag({ start, target: -1, tool, press });
    // Past this, lifting the finger is no longer a tap: stop promising a removal.
    if (press) this.pressTimer = setTimeout(() => this.clearPress(), TAP_MAX_MS);
  }

  /** The finger started moving: from now on it is a swipe, not a tap. */
  startSwipe(): void {
    this.clearPress();
  }

  move(dx: number, dy: number): void {
    const { metrics } = this.config;
    if (!metrics || !this.drag) return;
    const target = dragTarget(metrics, this.drag.start, dx, dy);
    if (target !== this.drag.target) this.setDrag({ ...this.drag, target, press: null });
  }

  /** The drag gesture completed: place the domino or draw the wall, if a neighbour is picked. */
  end(): void {
    const drag = this.drag;
    if (!drag || drag.target < 0) return;
    if (drag.tool === 'wall') this.config.onWall(drag.start, drag.target);
    else this.config.onPlace(drag.start, drag.target);
  }

  /** The touch finished, whatever happened: clear the drag feedback. */
  finalize(): void {
    this.clearPressTimer();
    this.setDrag(null);
  }

  tap(x: number, y: number): void {
    if (!this.config.metrics) return;
    const target = this.config.hitTest(x, y);
    if (target) this.config.onTap(target);
  }

  // Store protocol for useSyncExternalStore.
  readonly getDrag = (): DragState | null => this.drag;

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private clearPress(): void {
    this.clearPressTimer();
    if (this.drag?.press) this.setDrag({ ...this.drag, press: null });
  }

  private clearPressTimer(): void {
    if (this.pressTimer !== null) clearTimeout(this.pressTimer);
    this.pressTimer = null;
  }

  private setDrag(next: DragState | null): void {
    if (next === this.drag) return;
    this.drag = next;
    this.listeners.forEach((listener) => listener());
  }
}
