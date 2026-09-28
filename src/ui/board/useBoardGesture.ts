import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Gesture } from 'react-native-gesture-handler';

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
 * Connects the board's input model ({@link BoardInput}) to Gesture Handler.
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
  const gesture = useMemo(() => createBoardGesture(input, enabled), [input, enabled]);
  return { gesture, drag };
}

function createBoardGesture(input: BoardInput, enabled: boolean) {
  const pan = Gesture.Pan()
    .runOnJS(true)
    .enabled(enabled)
    .minDistance(6)
    // Touch-down (before the pan activates): remember the cell and what a tap would remove.
    .onBegin((e) => input.begin(e.x, e.y))
    // The finger moved past `minDistance`: it is a swipe, not a tap.
    .onStart(() => input.startSwipe())
    .onUpdate((e) => input.move(e.translationX, e.translationY))
    // `success` is false when the system cancels the touch (e.g. an iOS edge swipe): never place then.
    .onEnd((_e, success) => {
      if (success) input.end();
    })
    .onFinalize(() => input.finalize());

  const tap = Gesture.Tap()
    .runOnJS(true)
    .enabled(enabled)
    .maxDistance(10)
    .maxDuration(TAP_MAX_MS)
    .onEnd((e, success) => {
      if (success) input.tap(e.x, e.y);
    });

  return Gesture.Race(pan, tap);
}
