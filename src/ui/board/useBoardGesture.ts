import { useEffect, useState, useSyncExternalStore } from 'react';
import { useCompetingGestures, usePanGesture, useTapGesture } from 'react-native-gesture-handler';

import type { CellIndex } from '@/core';

import { BoardInput, TAP_MAX_MS, type BoardTool } from './board-input';
import type { BoardMetrics, TapTarget } from './geometry';

export type { BoardTool, DragState } from './board-input';

interface Options {
  readonly metrics: BoardMetrics | null;
  readonly enabled: boolean;
  readonly tool: BoardTool;
  readonly onPlace: (a: CellIndex, b: CellIndex) => void;
  readonly onWall: (a: CellIndex, b: CellIndex) => void;
  readonly onTap: (target: TapTarget) => void;
  readonly hitTest: (x: number, y: number) => TapTarget | null;
}

/**
 * Connects the board's input model ({@link BoardInput}) to Gesture Handler 3's
 * hook API: a pan for swipes and a tap, competing (the first to activate wins).
 *
 * Handlers run on the JS thread: the board has at most ~110 cells and the
 * ghost only changes when the target cell changes, so this stays cheap and
 * behaves the same on iOS, Android and the web.
 */
export function useBoardGesture({ metrics, enabled, tool, onPlace, onWall, onTap, hitTest }: Options) {
  const [input] = useState(() => new BoardInput());

  useEffect(() => {
    input.configure({ metrics, tool, onPlace, onWall, onTap, hitTest });
  });

  const drag = useSyncExternalStore(input.subscribe, input.getDrag, input.getDrag);

  const pan = usePanGesture({
    runOnJS: true,
    enabled,
    minDistance: 6,
    // Touch-down (before the pan activates): remember the cell and what a tap would remove.
    onBegin: (e) => input.begin(e.x, e.y),
    // The finger moved past `minDistance`: it is a swipe, not a tap.
    onActivate: () => input.startSwipe(),
    onUpdate: (e) => input.move(e.translationX, e.translationY),
    // `canceled` is set when the system takes the touch (e.g. an iOS edge swipe): never place then.
    onDeactivate: (e) => {
      if (!e.canceled) input.end();
    },
    onFinalize: () => input.finalize(),
  });

  const tap = useTapGesture({
    runOnJS: true,
    enabled,
    maxDistance: 10,
    maxDuration: TAP_MAX_MS,
    onDeactivate: (e) => {
      if (!e.canceled) input.tap(e.x, e.y);
    },
  });

  const gesture = useCompetingGestures(pan, tap);
  return { gesture, drag };
}
