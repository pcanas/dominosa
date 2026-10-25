import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import type { DominoId } from '@/core';
import type { TrackedPair } from '@/game';
import { useStrings } from '@/i18n';
import { AppText } from '@/ui/components/AppText';
import { fonts, radius, spacing, useTheme } from '@/ui/theme';

interface PairTrackerProps {
  readonly order: number;
  readonly pairs: readonly TrackedPair[];
  readonly selected: DominoId | null;
  readonly onSelect: (domino: DominoId) => void;
  readonly onClose: () => void;
}

const GAP = 4;
const MAX_CHIP = 52;

/**
 * Sheet with every pair of the set as a staircase: row `a` holds a-a … a-n.
 * Pairs still to place are plain, placed ones sage, repeated ones terracotta.
 * It floats over the bottom of the screen so the board never shrinks for it.
 */
export function PairTracker({ order, pairs, selected, onSelect, onClose }: PairTrackerProps) {
  const { palette } = useTheme();
  const t = useStrings();
  const [width, setWidth] = useState(0);

  // Slide up on open.
  const offset = useSharedValue(24);
  const opacity = useSharedValue(0);
  useEffect(() => {
    offset.value = withSpring(0, { damping: 18, stiffness: 220 });
    opacity.value = withTiming(1, { duration: 150 });
  }, [offset, opacity]);
  const animated = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: offset.value }],
  }));

  const columns = order + 1;
  const chip = width > 0 ? Math.min(MAX_CHIP, Math.floor((width - (columns - 1) * GAP) / columns)) : 0;
  const chipHeight = Math.round(Math.min(chip * 0.8, 36));
  const placedCount = pairs.filter((p) => p.placed > 0).length;

  const rows: TrackedPair[][] = [];
  for (const pair of pairs) (rows[pair.pips[0]] ??= []).push(pair);

  const onLayout = (e: LayoutChangeEvent) => {
    const next = Math.floor(e.nativeEvent.layout.width);
    setWidth((prev) => (prev === next ? prev : next));
  };

  return (
    <Animated.View
      style={[styles.sheet, { backgroundColor: palette.surface, borderColor: palette.tileBorder }, animated]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <AppText variant="label" accessibilityRole="header">
            {t.tracker.title}
          </AppText>
          <AppText variant="caption" tone="secondary">
            {t.tracker.placed(placedCount, pairs.length)}
          </AppText>
        </View>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t.actions.close}
          hitSlop={10}
          style={({ pressed }) => [styles.close, pressed && { backgroundColor: palette.surfacePressed }]}>
          <Ionicons name="close" size={22} color={palette.text} />
        </Pressable>
      </View>

      <View onLayout={onLayout} style={styles.grid}>
        {chip > 0 &&
          rows.map((row, lo) => (
            <View key={lo} style={[styles.row, { paddingLeft: lo * (chip + GAP) }]}>
              {row.map((pair) => (
                <PairChip
                  key={pair.domino}
                  pair={pair}
                  width={chip}
                  height={chipHeight}
                  selected={pair.domino === selected}
                  onPress={() => onSelect(pair.domino)}
                />
              ))}
            </View>
          ))}
      </View>

      <AppText variant="caption" tone="secondary" style={styles.hint}>
        {t.tracker.hint}
      </AppText>
    </Animated.View>
  );
}

function PairChip({
  pair,
  width,
  height,
  selected,
  onPress,
}: {
  readonly pair: TrackedPair;
  readonly width: number;
  readonly height: number;
  readonly selected: boolean;
  readonly onPress: () => void;
}) {
  const { palette } = useTheme();
  const t = useStrings();
  const [lo, hi] = pair.pips;
  const tone =
    pair.placed > 1
      ? { fill: palette.accentSoft, border: palette.accent, text: palette.text }
      : pair.placed === 1
        ? { fill: palette.successSoft, border: palette.success, text: palette.textSecondary }
        : { fill: palette.tile, border: palette.tileBorder, text: palette.text };
  const fontSize = Math.max(11, Math.round(height * 0.45));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t.a11y.pair(lo, hi, pair.placed)}
      accessibilityState={{ selected }}
      hitSlop={2}
      style={({ pressed }) => [
        styles.chip,
        {
          width,
          height,
          backgroundColor: pressed ? palette.surfacePressed : tone.fill,
          borderColor: selected ? palette.text : tone.border,
          borderWidth: selected ? 2 : 1,
        },
      ]}>
      <AppText style={[styles.chipText, { fontSize, lineHeight: height - 4, color: tone.text }]}>
        {lo}
      </AppText>
      <View style={[styles.chipDivider, { backgroundColor: tone.border }]} />
      <AppText style={[styles.chipText, { fontSize, lineHeight: height - 4, color: tone.text }]}>
        {hi}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    boxShadow: '0px 6px 24px rgba(74, 63, 53, 0.22)',
  },
  header: { flexDirection: 'row', alignItems: 'center' },
  headerText: { flex: 1, gap: 2 },
  close: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  grid: { gap: GAP },
  row: { flexDirection: 'row', gap: GAP },
  chip: {
    borderRadius: radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  chipText: { fontFamily: fonts.number, fontVariant: ['tabular-nums'], textAlign: 'center' },
  chipDivider: { width: 1, height: '50%', opacity: 0.7 },
  hint: { textAlign: 'center' },
});
