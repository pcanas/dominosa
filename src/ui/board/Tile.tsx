import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useTheme } from '@/ui/theme';

import type { Rect } from './geometry';

export type TileVariant = 'placed' | 'duplicate' | 'solved' | 'ghost';

interface TileProps {
  readonly rect: Rect;
  readonly variant: TileVariant;
  /** Cell size, used to scale corners and the duplicate badge. */
  readonly cell: number;
}

const INSET = 1;

/** A domino covering two cells. Numbers are drawn by the board on top of it. */
export function Tile({ rect, variant, cell }: TileProps) {
  const { palette } = useTheme();
  const scale = useSharedValue(variant === 'ghost' ? 1 : 0.86);

  useEffect(() => {
    // Soft snap when the domino lands.
    scale.value = withSpring(1, { damping: 13, stiffness: 260, mass: 0.6 });
  }, [scale]);

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const horizontal = rect.width > rect.height;
  const colors = {
    placed: { fill: palette.tile, border: palette.tileBorder, divider: palette.tileBorder },
    duplicate: { fill: palette.accentSoft, border: palette.accent, divider: palette.accent },
    solved: { fill: palette.successSoft, border: palette.success, divider: palette.success },
    ghost: { fill: 'transparent', border: palette.textSecondary, divider: 'transparent' },
  }[variant];
  const radius = Math.round(cell * 0.24);
  const badge = Math.max(14, Math.round(cell * 0.32));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.tile,
        {
          left: rect.x + INSET,
          top: rect.y + INSET,
          width: rect.width - 2 * INSET,
          height: rect.height - 2 * INSET,
          borderRadius: radius,
          backgroundColor: colors.fill,
          borderColor: colors.border,
          borderStyle: variant === 'ghost' ? 'dashed' : 'solid',
          boxShadow: variant === 'ghost' ? undefined : '0px 1px 2px rgba(74, 63, 53, 0.18)',
        },
        animated,
      ]}>
      <View
        style={[
          horizontal ? styles.dividerVertical : styles.dividerHorizontal,
          { backgroundColor: colors.divider },
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
  );
}

const styles = StyleSheet.create({
  tile: {
    position: 'absolute',
    borderWidth: 1.5,
  },
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
