import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';

import { makePair, type CellIndex, type Pair, type Puzzle } from '@/core';
import type { PlacedTile } from '@/game';
import { useStrings } from '@/i18n';
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
}

/**
 * The playing board. Fills the space it is given and sizes cells to fit.
 * Layers, bottom to top: frame → cells → dominoes → walls → drag previews → numbers.
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
}: BoardProps) {
  const { palette } = useTheme();
  const t = useStrings();
  const [space, setSpace] = useState<{ width: number; height: number } | null>(null);

  const metrics = space ? computeMetrics(puzzle.rows, puzzle.cols, space.width, space.height, METRICS) : null;
  const coveredCells = new Set(tiles.flatMap((tile) => [tile.a, tile.b]));
  const wallKeys = new Set(walls.map(pairKey));
  const walled = (a: CellIndex, b: CellIndex) => wallKeys.has(pairKey(makePair(a, b)));

  const { gesture, drag } = useBoardGesture({
    metrics,
    enabled: !solved,
    tool,
    onPlace,
    onWall,
    onTap: (target: TapTarget) =>
      target.kind === 'wall' ? onRemoveWall(target.a, target.b) : onRemove(target.cell),
    hitTest: (x, y) =>
      metrics && tapTargetAt(metrics, x, y, { hasWall: walled, isCovered: (cell) => coveredCells.has(cell) }),
  });
  const pressedWall = drag?.press?.kind === 'wall' ? pairKey(drag.press) : null;

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSpace((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }));
  };

  return (
    <View style={styles.container} onLayout={onLayout}>
      {metrics && metrics.cell > 0 && (
        <GestureDetector gesture={gesture} touchAction="none" userSelect="none">
          <View
            accessibilityLabel={t.a11y.board}
            style={[
              styles.frame,
              { width: metrics.width, height: metrics.height, backgroundColor: palette.board },
            ]}>
            {puzzle.cells.map((pip, i) => {
              const r = cellRect(metrics, i);
              const isStart = drag?.start === i && drag.target < 0;
              // Cells under a domino are hidden so the tile's edge reads cleanly.
              const covered = coveredCells.has(i);
              return (
                <View
                  key={`cell-${i}`}
                  accessible
                  accessibilityLabel={t.a11y.cell(
                    Math.floor(i / puzzle.cols) + 1,
                    (i % puzzle.cols) + 1,
                    pip,
                  )}
                  style={[
                    styles.cell,
                    {
                      left: r.x,
                      top: r.y,
                      width: r.width,
                      height: r.height,
                      borderRadius: Math.round(metrics.cell * 0.2),
                      backgroundColor: covered
                        ? 'transparent'
                        : isStart
                          ? palette.surfacePressed
                          : palette.cell,
                      borderColor: isStart ? palette.tileBorder : 'transparent',
                    },
                  ]}
                />
              );
            })}

            {tiles.map((tile) => (
              <Tile
                key={`tile-${tile.a}-${tile.b}`}
                rect={pairRect(metrics, tile.a, tile.b)}
                variant={solved ? 'solved' : tile.duplicate ? 'duplicate' : 'placed'}
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

            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
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
  wall: { position: 'absolute' },
  pip: {
    position: 'absolute',
    textAlign: 'center',
    fontFamily: fonts.number,
    fontVariant: ['tabular-nums'],
    userSelect: 'none',
  },
});
