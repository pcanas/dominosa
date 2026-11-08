import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  Keyframe,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/ui/theme';

import { WAVE_TURN_MS } from './celebration';
import type { Rect } from './geometry';
import { isPreview, tileColors, type TileVariant } from './tile-style';

export type { TileVariant } from './tile-style';

interface TileProps {
  readonly rect: Rect;
  readonly variant: TileVariant;
  /** Cell size, used to scale corners and the duplicate badge. */
  readonly cell: number;
  /** Once the board is solved: how long this domino waits before turning sage (see `waveDelay`). */
  readonly celebrateDelay?: number;
}

const INSET = 1;
/** Soft snap when a domino lands. */
const SNAP = { damping: 13, stiffness: 260, mass: 0.6 } as const;

/**
 * A domino taken off the board (removed, undone, replaced, reset) fades out in
 * place instead of vanishing; it keeps its size, so it does not look like it
 * shrinks away. A keyframe, so it also runs on the web.
 */
const LEAVE = new Keyframe({
  0: { opacity: 1 },
  100: { opacity: 0 },
}).duration(160);

/**
 * A domino covering two cells. Numbers are drawn by the board on top of it.
 *
 * Every animation here uses Reanimated's default `ReduceMotion.System`: with
 * "Reduce motion" on, they jump straight to their end state.
 */
export function Tile({ rect, variant, cell, celebrateDelay = 0 }: TileProps) {
  const { palette } = useTheme();
  const preview = isPreview(variant);
  const emphasis = variant === 'slot' || variant === 'highlighted';
  const solved = variant === 'solved';
  const scale = useSharedValue(preview ? 1 : 0.86);
  // 0 → 1 while the domino turns sage. A domino drawn already solved starts turned.
  const turned = useSharedValue(solved ? 1 : 0);

  useEffect(() => {
    scale.set(withSpring(1, SNAP));
  }, [scale]);

  useEffect(() => {
    if (!solved) {
      turned.set(0);
      return;
    }
    if (turned.get() === 1) return;
    turned.set(withDelay(celebrateDelay, withTiming(1, { duration: WAVE_TURN_MS })));
    scale.set(
      withDelay(celebrateDelay, withSequence(withTiming(1.07, { duration: 120 }), withSpring(1, SNAP))),
    );
  }, [solved, celebrateDelay, turned, scale]);

  // A solved domino is drawn as placed and turns sage in the animated style below.
  const colors = tileColors(palette, solved ? 'placed' : variant);
  const sage = tileColors(palette, 'solved');

  const animated = useAnimatedStyle(() => {
    if (!solved) return { transform: [{ scale: scale.get() }] };
    const t = turned.get();
    return {
      transform: [{ scale: scale.get() }],
      backgroundColor: interpolateColor(t, [0, 1], [colors.fill, sage.fill]),
      borderColor: interpolateColor(t, [0, 1], [colors.border, sage.border]),
    };
  }, [solved, colors.fill, colors.border, sage.fill, sage.border]);

  const dividerAnimated = useAnimatedStyle(() => {
    if (!solved) return {};
    return { backgroundColor: interpolateColor(turned.get(), [0, 1], [colors.divider, sage.divider]) };
  }, [solved, colors.divider, sage.divider]);

  const horizontal = rect.width > rect.height;
  const radius = Math.round(cell * 0.24);
  const badge = Math.max(14, Math.round(cell * 0.32));

  return (
    // The outer view only places the domino and fades it out when it leaves; the scale lives on the
    // inner one. On the web, Reanimated draws a leaving view at the size it measured when it appeared,
    // so a view that appeared mid-snap would jump smaller just before fading.
    <Animated.View
      pointerEvents="none"
      aria-hidden
      exiting={preview ? undefined : LEAVE}
      style={[
        styles.slot,
        {
          left: rect.x + INSET,
          top: rect.y + INSET,
          width: rect.width - 2 * INSET,
          height: rect.height - 2 * INSET,
        },
      ]}>
      <Animated.View
        style={[
          styles.tile,
          {
            borderRadius: radius,
            backgroundColor: colors.fill,
            borderColor: colors.border,
            borderStyle: preview ? 'dashed' : 'solid',
            borderWidth: emphasis ? 2.5 : 1.5,
            boxShadow: preview ? undefined : '0px 1px 2px rgba(74, 63, 53, 0.18)',
          },
          animated,
        ]}>
        <Animated.View
          style={[
            horizontal ? styles.dividerVertical : styles.dividerHorizontal,
            { backgroundColor: colors.divider },
            dividerAnimated,
          ]}
        />
        {variant === 'duplicate' && (
          <View
            style={[
              styles.badge,
              { width: badge, height: badge, borderRadius: badge / 2, backgroundColor: palette.accent },
            ]}>
            <View style={[styles.badgeMark, { height: badge * 0.42, backgroundColor: palette.tile }]} />
            <View style={[styles.badgeDot, { backgroundColor: palette.tile }]} />
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  slot: {
    position: 'absolute',
  },
  tile: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  dividerVertical: {
    position: 'absolute',
    left: '50%',
    top: '22%',
    bottom: '22%',
    width: 1,
    marginLeft: -0.5,
    opacity: 0.7,
  },
  dividerHorizontal: {
    position: 'absolute',
    top: '50%',
    left: '22%',
    right: '22%',
    height: 1,
    marginTop: -0.5,
    opacity: 0.7,
  },
  // "!" drawn with views so it needs no font and scales with the cell.
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1.5,
  },
  badgeMark: { width: 2.5, borderRadius: 1.25 },
  badgeDot: { width: 2.5, height: 2.5, borderRadius: 1.25 },
});
