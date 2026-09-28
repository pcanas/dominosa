import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import type { LevelProgress } from '@/game';
import { formatDuration, useStrings } from '@/i18n';
import type { Level } from '@/levels';
import { AppText } from '@/ui/components/AppText';
import { radius, spacing, useTheme } from '@/ui/theme';

interface LevelCardProps {
  readonly level: Level;
  readonly progress: LevelProgress | undefined;
  /** Dominoes placed in a saved, unsolved game of this level. */
  readonly inProgress?: { readonly placed: number; readonly total: number };
  readonly onPress: () => void;
}

/** One row of the level list: number, difficulty, size, deduction depth and status. */
export function LevelCard({ level, progress, inProgress, onPress }: LevelCardProps) {
  const { palette } = useTheme();
  const t = useStrings();
  const { rows, cols } = level.puzzle;
  const solved = progress !== undefined;
  const title = `${t.levelNumber(level.number)} · ${t.difficulty[level.difficulty]}`;
  const label = [title, solved && t.a11y.solvedLevel, inProgress && t.a11y.inProgressLevel]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: pressed ? palette.surfacePressed : palette.surface,
          borderColor: solved ? palette.success : palette.tileBorder,
        },
      ]}>
      <View style={[styles.number, { backgroundColor: solved ? palette.successSoft : palette.board }]}>
        {solved ? (
          <Ionicons name="checkmark" size={22} color={palette.success} />
        ) : (
          <AppText variant="label">{level.number}</AppText>
        )}
      </View>
      <View style={styles.body}>
        <AppText variant="label">{t.difficulty[level.difficulty]}</AppText>
        <AppText variant="caption" tone="secondary">
          {t.gridSize(cols, rows)}
          {progress ? ` · ${t.bestTime(formatDuration(progress.bestMs))}` : ''}
        </AppText>
        {inProgress && (
          <AppText variant="caption" tone="accent">
            {t.inProgress(inProgress.placed, inProgress.total)}
          </AppText>
        )}
      </View>
      <DepthDots depth={level.grade} />
      <Ionicons name="chevron-forward" size={18} color={palette.textSecondary} />
    </Pressable>
  );
}

/** Deduction depth (1–3) as filled dots: difficulty's second axis, next to size. */
function DepthDots({ depth }: { readonly depth: number }) {
  const { palette } = useTheme();
  return (
    <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {[1, 2, 3].map((d) => (
        <View
          key={d}
          style={[styles.dot, { backgroundColor: d <= depth ? palette.accent : palette.board }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  number: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
});
