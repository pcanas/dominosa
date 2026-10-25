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

import { makePair, type CellIndex, type Pair, type Puzzle } from '@/core';
import type { GameAction, PairSlots, PlacedTile } from '@/game';
import { fonts, radius, useTheme } from '@/ui/theme';

import {
  cellRect,
  computeMetrics,
  pairRect,
  tapTargetAt,
  wallRect,
  wallThickness,
  type BoardMetrics,
  type TapTarget,
} from './geometry';
import type { CellAction } from './a11y';
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
  readonly onPlace: (a: CellIndex, b: CellIndex) => void;
  readonly onWall: (a: CellIndex, b: CellIndex) => void;
  /** A tap on a domino. */
  readonly onRemove: (cell: CellIndex) => void;
  /** A tap on (or near) a wall. */
  readonly onRemoveWall: (a: CellIndex, b: CellIndex) => void;
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
  readonly onAction: (action: GameAction) => void;
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
  onPlace,
  onWall,
  onRemove,
  onRemoveWall,
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
    onPlace,
    onWall,
    onTap: (target: TapTarget) =>
      target.kind === 'wall' ? onRemoveWall(target.a, target.b) : onRemove(target.cell),
    hitTest: (x, y) =>
      metrics && tapTargetAt(metrics, x, y, { hasWall: walled, isCovered: (cell) => coveredCells.has(cell) }),
  });
  const pressedWall = drag?.press?.kind === 'wall' ? pairKey(drag.press) : null;
  const highlightedKeys = new Set(highlight?.placed.map(pairKey) ?? []);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSpace((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }));
  };

  return (
    <View style={styles.container} onLayout={onLayout}>
      {metrics && metrics.cell > 0 && (
        <GestureDetector gesture={gesture} touchAction="none" userSelect="none">
          <View
            style={[
              styles.frame,
              { width: metrics.width, height: metrics.height, backgroundColor: palette.board },
            ]}>
            {puzzle.cells.map((_pip, i) => {
              const r = cellRect(metrics, i);
              const isStart = drag?.start === i && drag.target < 0;
              // Cells under a domino are hidden so the tile's edge reads cleanly.
              const covered = coveredCells.has(i);
              const style = [
                styles.cell,
                {
                  left: r.x,
                  top: r.y,
                  width: r.width,
                  height: r.height,
                  borderRadius: Math.round(metrics.cell * 0.2),
                  backgroundColor: covered ? 'transparent' : isStart ? palette.surfacePressed : palette.cell,
                  borderColor: isStart ? palette.tileBorder : 'transparent',
                },
              ];
              return <View key={`cell-${i}`} style={style} />;
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
              <SelectionRing metrics={metrics} cell={screenReader.selected} color={palette.accent} />
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
              {puzzle.cells.map((pip, i) => {
                const r = cellRect(metrics, i);
                return (
                  <Text
                    key={`pip-${i}`}
                    allowFontScaling={false}
                    style={[
                      styles.pip,
                      {
                        left: r.x,
                        top: r.y,
                        width: r.width,
                        height: r.height,
                        lineHeight: r.height,
                        fontSize: Math.round(metrics.cell * 0.5),
                        color: palette.text,
                      },
                    ]}>
                    {pip}
                  </Text>
                );
              })}
            </View>

            {/*
              What screen readers see and touch: one transparent element per cell, drawn last so no
              layer sits above it (VoiceOver's touch exploration did not reach cells under the numbers).
            */}
            {puzzle.cells.map((_pip, i) => {
              const r = cellRect(metrics, i);
              const rect = { left: r.x, top: r.y, width: r.width, height: r.height };
              if (!screenReader) {
                return (
                  <View
                    key={`a11y-${i}`}
                    accessible
                    accessibilityLabel={descriptions[i]}
                    // Safari only reads a label on an element with a role.
                    role={Platform.OS === 'web' ? 'img' : undefined}
                    style={[styles.a11yCell, rect]}
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
                    if (picked) screenReader.onAction(picked.action);
                  }}
                  style={[styles.a11yCell, rect]}
                />
              );
            })}
          </View>
        </GestureDetector>
      )}
    </View>
  );
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
  const r = wallRect(metrics, pair.a, pair.b, thickness);
  return (
    <View
      pointerEvents="none"
      aria-hidden
      style={[
        styles.wall,
        {
          left: r.x,
          top: r.y,
          width: r.width,
          height: r.height,
          borderRadius: thickness / 2,
          backgroundColor: pressed ? palette.accent : palette.wall,
          opacity,
        },
      ]}
    />
  );
}

/** Ring around the cell picked first while playing with a screen reader. */
function SelectionRing({
  metrics,
  cell,
  color,
}: {
  readonly metrics: BoardMetrics;
  readonly cell: CellIndex;
  readonly color: string;
}) {
  const r = cellRect(metrics, cell);
  const out = 3;
  return (
    <View
      pointerEvents="none"
      aria-hidden
      style={[
        styles.ring,
        {
          left: r.x - out,
          top: r.y - out,
          width: r.width + 2 * out,
          height: r.height + 2 * out,
          borderRadius: Math.round(metrics.cell * 0.2) + out,
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
  const row = Math.floor(drag.start / m.cols);
  const col = drag.start % m.cols;
  const neighbours = [
    row > 0 ? drag.start - m.cols : -1,
    row < m.rows - 1 ? drag.start + m.cols : -1,
    col > 0 ? drag.start - 1 : -1,
    col < m.cols - 1 ? drag.start + 1 : -1,
  ];
  return neighbours.filter((n) => n >= 0).map((n) => makePair(drag.start, n));
}

const pairKey = (pair: Pair) => `${pair.a}-${pair.b}`;

/** 6-pt gaps as in the plan; tight frame so 9×10 still gets ~34-pt cells on a phone. */
const METRICS = { gap: 6, padding: 6, maxCell: 84 } as const;

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: { borderRadius: radius.lg },
  cell: { position: 'absolute', borderWidth: 1 },
  a11yCell: { position: 'absolute' },
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
