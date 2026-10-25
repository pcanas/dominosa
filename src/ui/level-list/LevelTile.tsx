import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { useStrings } from '@/i18n';
import type { Level } from '@/levels';
import { AppText } from '@/ui/components/AppText';
import { radius, spacing, useTheme } from '@/ui/theme';

import { DepthDots } from './DepthDots';

interface LevelTileProps {
  readonly level: Level;
  readonly solved: boolean;
  readonly inProgress: boolean;
  readonly onPress: () => void;
}

/** One level in a pack's grid: number, size, depth, and whether it is solved or started. */
export function LevelTile({ level, solved, inProgress, onPress }: LevelTileProps) {
  const { palette } = useTheme();
  const t = useStrings();
  const { cols, rows } = level.puzzle;
  const label = [
    t.levelNumber(level.number),
    t.gridSize(cols, rows),
    solved && t.a11y.solvedLevel,
    inProgress && t.a11y.inProgressLevel,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: pressed ? palette.surfacePressed : solved ? palette.successSoft : palette.surface,
          borderColor: solved ? palette.success : palette.tileBorder,
        },
      ]}>
      <AppText variant="heading">{level.number}</AppText>
      <AppText variant="caption" tone="secondary">
        {t.gridSize(cols, rows)}
      </AppText>
      <DepthDots depth={level.grade} size={5} />
      {(solved || inProgress) && (
        <View style={styles.corner}>
          {solved ? (
            <Ionicons name="checkmark-circle" size={18} color={palette.success} />
          ) : (
            <View style={[styles.dot, { backgroundColor: palette.accent }]} />
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    aspectRatio: 0.9,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: spacing.sm,
  },
  corner: { position: 'absolute', top: 6, right: 6 },
  dot: { width: 9, height: 9, borderRadius: 4.5, margin: 4 },
});
