import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Gesture } from 'react-native-gesture-handler';

import type { CellIndex } from '@/core';

import { BoardInput } from './board-input';
import type { BoardMetrics } from './geometry';

export type { DragState } from './board-input';

interface Options {
  readonly metrics: BoardMetrics | null;
  readonly enabled: boolean;
  readonly onPlace: (a: CellIndex, b: CellIndex) => void;
  readonly onTap: (cell: CellIndex) => void;
}

/**
 * Connects the board's input model ({@link BoardInput}) to Gesture Handler.
 *
 * Handlers run on the JS thread: the board has at most ~110 cells and the
 * ghost only changes when the target cell changes, so this stays cheap and
 * behaves the same on iOS, Android and the web.
 */
export function useBoardGesture({ metrics, enabled, onPlace, onTap }: Options) {
  const [input] = useState(() => new BoardInput());

  useEffect(() => {
    input.configure({ metrics, onPlace, onTap });
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
    .onBegin((e) => input.begin(e.x, e.y))
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
    .onEnd((e, success) => {
      if (success) input.tap(e.x, e.y);
    });

  return Gesture.Race(pan, tap);
}
