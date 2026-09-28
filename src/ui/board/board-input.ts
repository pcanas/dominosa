/**
 * Input state machine for the board, independent of the gesture library:
 *  - `begin` at touch-down remembers the start cell, with the current tool
 *    (domino or wall);
 *  - resting the finger for {@link HOLD_MS} before moving switches to the
 *    other tool (the "hold, then swipe" shortcut);
 *  - `activate` means the finger started moving, which rules the hold out;
 *  - `move` picks the neighbour in the drag direction once the finger has
 *    travelled far enough (a ghost domino or wall is shown);
 *  - `end` places the domino or toggles the wall, if a neighbour is picked;
 *    sliding back cancels it;
 *  - `tap` reports the cell under a quick touch.
 */
import type { CellIndex } from '@/core';

import { cellAtPoint, dragTarget, type BoardMetrics } from './geometry';

/** What a swipe between two cells does. */
export type BoardTool = 'domino' | 'wall';

export interface DragState {
  readonly start: CellIndex;
  /** Neighbour currently selected, or -1 while the drag is too short. */
  readonly target: CellIndex;
  readonly tool: BoardTool;
}

export interface BoardInputConfig {
  readonly metrics: BoardMetrics | null;
  /** Tool used by a plain swipe; holding first switches to the other one. */
  readonly tool: BoardTool;
  readonly onPlace: (a: CellIndex, b: CellIndex) => void;
  readonly onWall: (a: CellIndex, b: CellIndex) => void;
  readonly onTap: (cell: CellIndex) => void;
  /** The hold shortcut switched tools (for haptic feedback). */
  readonly onHold?: (tool: BoardTool) => void;
}

/** How long the finger rests before a swipe switches tools. Also the longest touch that counts as a tap. */
export const HOLD_MS = 300;

const otherTool = (tool: BoardTool): BoardTool => (tool === 'domino' ? 'wall' : 'domino');

export class BoardInput {
  private config: BoardInputConfig = {
    metrics: null,
    tool: 'domino',
    onPlace: () => {},
    onWall: () => {},
    onTap: () => {},
  };
  private drag: DragState | null = null;
  private holdTimer: ReturnType<typeof setTimeout> | null = null;
  /** The current touch switched tools, so it is not a tap. */
  private held = false;
  private readonly listeners = new Set<() => void>();

  configure(config: BoardInputConfig): void {
    this.config = config;
  }

  begin(x: number, y: number): void {
    const { metrics, tool } = this.config;
    this.cancelHold();
    this.held = false;
    const start = metrics ? cellAtPoint(metrics, x, y) : -1;
    this.setDrag(start >= 0 ? { start, target: -1, tool } : null);
    if (start >= 0) this.holdTimer = setTimeout(() => this.hold(), HOLD_MS);
  }

  /** The finger started moving: from now on it is a plain swipe. */
  activate(): void {
    this.cancelHold();
  }

  move(dx: number, dy: number): void {
    const { metrics } = this.config;
    if (!metrics || !this.drag) return;
    // Moving far enough to pick a neighbour always settles the tool.
    const target = dragTarget(metrics, this.drag.start, dx, dy);
    if (target >= 0) this.cancelHold();
    if (target !== this.drag.target) this.setDrag({ ...this.drag, target });
  }

  /** The drag gesture completed: place the domino or toggle the wall, if a neighbour is picked. */
  end(): void {
    const drag = this.drag;
    if (!drag || drag.target < 0) return;
    if (drag.tool === 'wall') this.config.onWall(drag.start, drag.target);
    else this.config.onPlace(drag.start, drag.target);
  }

  /** The touch finished, whatever happened: clear the drag feedback. */
  finalize(): void {
    this.cancelHold();
    this.setDrag(null);
  }

  tap(x: number, y: number): void {
    const { metrics } = this.config;
    if (this.held) return;
    const cell = metrics ? cellAtPoint(metrics, x, y) : -1;
    if (cell >= 0) this.config.onTap(cell);
  }

  // Store protocol for useSyncExternalStore.
  readonly getDrag = (): DragState | null => this.drag;

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private hold(): void {
    this.holdTimer = null;
    const drag = this.drag;
    if (!drag || drag.target >= 0) return;
    this.held = true;
    const tool = otherTool(drag.tool);
    this.setDrag({ ...drag, tool });
    this.config.onHold?.(tool);
  }

  private cancelHold(): void {
    if (this.holdTimer !== null) clearTimeout(this.holdTimer);
    this.holdTimer = null;
  }

  private setDrag(next: DragState | null): void {
    if (next === this.drag) return;
    this.drag = next;
    this.listeners.forEach((listener) => listener());
  }
}
