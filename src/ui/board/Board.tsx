import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';

import type { CellIndex, Puzzle } from '@/core';
import type { PlacedTile } from '@/game';
import { useStrings } from '@/i18n';
import { fonts, radius, useTheme } from '@/ui/theme';

import { cellRect, computeMetrics, pairRect } from './geometry';
import { Tile } from './Tile';
import { useBoardGesture } from './useBoardGesture';

interface BoardProps {
  readonly puzzle: Puzzle;
  readonly tiles: readonly PlacedTile[];
  readonly solved: boolean;
  readonly onPlace: (a: CellIndex, b: CellIndex) => void;
  readonly onRemove: (cell: CellIndex) => void;
}

/**
 * The playing board. Fills the space it is given and sizes cells to fit.
 * Layers, bottom to top: frame → cells → dominoes → drag ghost → numbers.
 */
export function Board({ puzzle, tiles, solved, onPlace, onRemove }: BoardProps) {
  const { palette } = useTheme();
  const t = useStrings();
  const [space, setSpace] = useState<{ width: number; height: number } | null>(null);

  const metrics = space ? computeMetrics(puzzle.rows, puzzle.cols, space.width, space.height, METRICS) : null;
  const { gesture, drag } = useBoardGesture({ metrics, enabled: !solved, onPlace, onTap: onRemove });

  const coveredCells = new Set(tiles.flatMap((tile) => [tile.a, tile.b]));

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

            {drag && drag.target >= 0 && (
              <Tile
                key={`ghost-${drag.start}-${drag.target}`}
                rect={pairRect(metrics, drag.start, drag.target)}
                variant="ghost"
                cell={metrics.cell}
              />
            )}

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

/** 6-pt gaps as in the plan; tight frame so 9×10 still gets ~34-pt cells on a phone. */
const METRICS = { gap: 6, padding: 6, maxCell: 84 } as const;

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: { borderRadius: radius.lg },
  cell: { position: 'absolute', borderWidth: 1 },
  pip: {
    position: 'absolute',
    textAlign: 'center',
    fontFamily: fonts.number,
    fontVariant: ['tabular-nums'],
    userSelect: 'none',
  },
});
