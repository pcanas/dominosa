import { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';

import { DIRECTIONS, makePair, neighbourOf, type CellIndex, type Pair, type Puzzle } from '@/core';
import type { GameAction, PairSlots, PlacedTile } from '@/game';
import { fonts, radius, useTheme } from '@/ui/theme';

import type { CellAction } from './a11y';
import {
  cellRect,
  computeMetrics,
  pairRect,
  tapTargetAt,
  wallRect,
  wallThickness,
  type BoardMetrics,
  type Rect,
} from './geometry';
import { Tile } from './Tile';
import { useBoardGesture, type BoardTool, type DragState } from './useBoardGesture';

interface BoardProps {
  readonly puzzle: Puzzle;
  readonly tiles: readonly PlacedTile[];
  /** Walled edges (top/left cell first). */
  readonly walls: readonly Pair[];
  readonly solved: boolean;
  /** What a swipe does: place a domino, or draw a wall while the wall button is on. */
  readonly tool: BoardTool;
  /** Every move made on the board: swipes, taps, picks and VoiceOver actions. */
  readonly onAction: (action: GameAction) => void;
  /** Slots of the pair picked in the tracker, shown on the board. */
  readonly highlight?: PairSlots | null;
  /** What each cell says to screen readers (see `describeCells`). */
  readonly descriptions: readonly string[];
  /**
   * Set while a screen reader is on: swipes are off and cells become buttons
   * that are picked one by one (see `pickCell`), with VoiceOver actions.
   */
  readonly screenReader?: ScreenReaderBoard | null;
}

export interface ScreenReaderBoard {
  readonly selected: CellIndex | null;
  readonly onPick: (cell: CellIndex) => void;
  readonly actionsFor: (cell: CellIndex) => readonly CellAction[];
}

/**
 * The playing board. Fills the space it is given and sizes cells to fit.
 * Layers, bottom to top: frame → cells → dominoes → walls → drag previews → numbers → the
 * transparent cells screen readers use.
 */
export function Board({
  puzzle,
  tiles,
  walls,
  solved,
  tool,
  onAction,
  highlight = null,
  descriptions,
  screenReader = null,
}: BoardProps) {
  const { palette } = useTheme();
  const [space, setSpace] = useState<{ width: number; height: number } | null>(null);

  const metrics = space ? computeMetrics(puzzle.rows, puzzle.cols, space.width, space.height, METRICS) : null;
  const coveredCells = new Set(tiles.flatMap((tile) => [tile.a, tile.b]));
  const wallKeys = new Set(walls.map(pairKey));
  const walled = (a: CellIndex, b: CellIndex) => wallKeys.has(pairKey(makePair(a, b)));

  const { gesture, drag } = useBoardGesture({
    metrics,
    enabled: !solved && !screenReader,
    tool,
    onPlace: (a, b) => onAction({ type: 'place', a, b }),
    onWall: (a, b) => onAction({ type: 'addWall', a, b }),
    onTap: (target) =>
      onAction(
        target.kind === 'wall'
          ? { type: 'removeWall', a: target.a, b: target.b }
          : { type: 'remove', cell: target.cell },
      ),
    hitTest: (x, y) =>
      metrics && tapTargetAt(metrics, x, y, { hasWall: walled, isCovered: (cell) => coveredCells.has(cell) }),
  });
  const pressedWall = drag?.press?.kind === 'wall' ? pairKey(drag.press) : null;
  const highlightedKeys = new Set(highlight?.placed.map(pairKey) ?? []);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSpace((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }));
  };

  if (!metrics || metrics.cell <= 0) return <View style={styles.container} onLayout={onLayout} />;

  const cellBoxes = puzzle.cells.map((_pip, i) => box(cellRect(metrics, i)));
  const cellRadius = Math.round(metrics.cell * 0.2);

  return (
    <View style={styles.container} onLayout={onLayout}>
      <GestureDetector gesture={gesture} touchAction="none" userSelect="none">
        <View
          style={[
            styles.frame,
            { width: metrics.width, height: metrics.height, backgroundColor: palette.board },
          ]}>
          {cellBoxes.map((cellBox, i) => {
            const isStart = drag?.start === i && drag.target < 0;
            // Cells under a domino are hidden so the tile's edge reads cleanly.
            const backgroundColor = coveredCells.has(i)
              ? 'transparent'
              : isStart
                ? palette.surfacePressed
                : palette.cell;
            return (
              <View
                key={`cell-${i}`}
                style={[
                  styles.cell,
                  cellBox,
                  {
                    borderRadius: cellRadius,
                    backgroundColor,
                    borderColor: isStart ? palette.tileBorder : 'transparent',
                  },
                ]}
              />
            );
          })}

          {!solved &&
            highlight?.open.map((slot) => (
              <Tile
                key={`hint-${slot.a}-${slot.b}`}
                rect={pairRect(metrics, slot.a, slot.b)}
                variant="hint"
                cell={metrics.cell}
              />
            ))}

          {tiles.map((tile) => (
            <Tile
              key={`tile-${tile.a}-${tile.b}`}
              rect={pairRect(metrics, tile.a, tile.b)}
              variant={
                solved
                  ? 'solved'
                  : tile.duplicate
                    ? 'duplicate'
                    : highlightedKeys.has(pairKey(tile))
                      ? 'highlighted'
                      : 'placed'
              }
              cell={metrics.cell}
            />
          ))}

          {!solved &&
            walls.map((wall) => (
              <WallBar
                key={`wall-${wall.a}-${wall.b}`}
                metrics={metrics}
                pair={wall}
                // A finger resting on a wall shows it will be removed when lifted.
                pressed={pairKey(wall) === pressedWall}
                opacity={1}
              />
            ))}

          {screenReader?.selected != null && (
            <SelectionRing
              cellBox={cellBoxes[screenReader.selected]!}
              radius={cellRadius}
              color={palette.accent}
            />
          )}

          {drag?.tool === 'domino' && drag.target >= 0 && (
            <Tile
              key={`ghost-${drag.start}-${drag.target}`}
              rect={pairRect(metrics, drag.start, drag.target)}
              variant={walled(drag.start, drag.target) ? 'blocked' : 'ghost'}
              cell={metrics.cell}
            />
          )}

          {drag?.tool === 'wall' &&
            pressedWall === null &&
            wallPreviews(metrics, drag)
              .filter((pair) => !walled(pair.a, pair.b))
              .map((pair) => (
                <WallBar
                  key={`wall-ghost-${pair.a}-${pair.b}`}
                  metrics={metrics}
                  pair={pair}
                  opacity={drag.target >= 0 ? 0.7 : 0.45}
                />
              ))}

          {/* Numbers are part of each cell's description, so the layer is hidden from screen readers. */}
          <View pointerEvents="none" aria-hidden style={StyleSheet.absoluteFill}>
            {puzzle.cells.map((pip, i) => (
              <Text
                key={`pip-${i}`}
                allowFontScaling={false}
                style={[
                  styles.pip,
                  cellBoxes[i],
                  {
                    lineHeight: cellBoxes[i]!.height,
                    fontSize: Math.round(metrics.cell * 0.5),
                    color: palette.text,
                  },
                ]}>
                {pip}
              </Text>
            ))}
          </View>

          <CellTargets
            cellBoxes={cellBoxes}
            descriptions={descriptions}
            solved={solved}
            screenReader={screenReader}
            onAction={onAction}
          />
        </View>
      </GestureDetector>
    </View>
  );
}

/**
 * What screen readers see and touch: one transparent element per cell, drawn
 * last so no layer covers it (VoiceOver's touch exploration and its activation
 * tap find the top view). With a screen reader on, each is a button that picks
 * the cell and offers the cell's VoiceOver actions.
 */
function CellTargets({
  cellBoxes,
  descriptions,
  solved,
  screenReader,
  onAction,
}: {
  readonly cellBoxes: readonly Box[];
  readonly descriptions: readonly string[];
  readonly solved: boolean;
  readonly screenReader: ScreenReaderBoard | null;
  readonly onAction: (action: GameAction) => void;
}) {
  return cellBoxes.map((cellBox, i) => {
    if (!screenReader) {
      return (
        <View
          key={`a11y-${i}`}
          accessible
          accessibilityLabel={descriptions[i]}
          // Safari only reads a label on an element with a role.
          role={Platform.OS === 'web' ? 'img' : undefined}
          style={[styles.target, cellBox]}
        />
      );
    }
    const actions = screenReader.actionsFor(i);
    const selected = screenReader.selected === i;
    return (
      <Pressable
        key={`a11y-${i}`}
        onPress={() => screenReader.onPick(i)}
        disabled={solved}
        accessibilityRole="button"
        accessibilityLabel={descriptions[i]}
        accessibilityState={{ selected, disabled: solved }}
        aria-selected={selected}
        accessibilityActions={actions.map(({ name, label }) => ({ name, label }))}
        onAccessibilityAction={(e: AccessibilityActionEvent) => {
          const picked = actions.find((a) => a.name === e.nativeEvent.actionName);
          if (picked) onAction(picked.action);
        }}
        style={[styles.target, cellBox]}
      />
    );
  });
}

function WallBar({
  metrics,
  pair,
  opacity,
  pressed = false,
}: {
  readonly metrics: BoardMetrics;
  readonly pair: Pair;
  readonly opacity: number;
  /** Terracotta while a resting finger would remove it. */
  readonly pressed?: boolean;
}) {
  const { palette } = useTheme();
  const thickness = wallThickness(metrics);
  return (
    <View
      pointerEvents="none"
      aria-hidden
      style={[
        styles.wall,
        box(wallRect(metrics, pair.a, pair.b, thickness)),
        { borderRadius: thickness / 2, backgroundColor: pressed ? palette.accent : palette.wall, opacity },
      ]}
    />
  );
}

/** Ring around the cell picked first while playing with a screen reader. */
function SelectionRing({
  cellBox,
  radius: cellRadius,
  color,
}: {
  readonly cellBox: Box;
  readonly radius: number;
  readonly color: string;
}) {
  const out = 3;
  return (
    <View
      pointerEvents="none"
      aria-hidden
      style={[
        styles.ring,
        {
          left: cellBox.left - out,
          top: cellBox.top - out,
          width: cellBox.width + 2 * out,
          height: cellBox.height + 2 * out,
          borderRadius: cellRadius + out,
          borderColor: color,
        },
      ]}
    />
  );
}

/**
 * Where a wall drag would draw: the picked edge, or — before a neighbour is
 * picked — every edge of the start cell, so the player sees the wall tool is
 * on even with a finger covering the cell.
 */
function wallPreviews(m: BoardMetrics, drag: DragState): Pair[] {
  if (drag.target >= 0) return [makePair(drag.start, drag.target)];
  return DIRECTIONS.map((dir) => neighbourOf(drag.start, dir, m.rows, m.cols))
    .filter((n) => n >= 0)
    .map((n) => makePair(drag.start, n));
}

/** Absolute position of a rectangle inside the board frame. */
interface Box {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

const box = (r: Rect): Box => ({ left: r.x, top: r.y, width: r.width, height: r.height });

const pairKey = (pair: Pair) => `${pair.a}-${pair.b}`;

/** 6-pt gaps as in the plan; tight frame so 9×10 still gets ~34-pt cells on a phone. */
const METRICS = { gap: 6, padding: 6, maxCell: 84 } as const;

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: { borderRadius: radius.lg },
  cell: { position: 'absolute', borderWidth: 1 },
  target: { position: 'absolute' },
  wall: { position: 'absolute' },
  ring: { position: 'absolute', borderWidth: 3 },
  pip: {
    position: 'absolute',
    textAlign: 'center',
    fontFamily: fonts.number,
    fontVariant: ['tabular-nums'],
    userSelect: 'none',
  },
});
