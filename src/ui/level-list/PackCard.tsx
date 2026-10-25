import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { useStrings } from '@/i18n';
import { AppText } from '@/ui/components/AppText';
import { radius, spacing, useTheme } from '@/ui/theme';

import { DepthDots } from './DepthDots';
import type { PackSummary } from './pack-summary';

interface PackCardProps {
  readonly name: string;
  readonly summary: PackSummary;
  readonly onPress: () => void;
}

/** One pack on the home screen: name, board sizes, depth, progress. */
export function PackCard({ name, summary, onPress }: PackCardProps) {
  const { palette } = useTheme();
  const t = useStrings();
  const { total, solved, inProgress, sizes, maxGrade } = summary;
  const done = solved === total;
  const sizeText = sizes.map(([cols, rows]) => t.gridSize(cols, rows)).join(' · ');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${sizeText}, ${t.packSolved(solved, total)}`}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: pressed ? palette.surfacePressed : palette.surface,
          borderColor: done ? palette.success : palette.tileBorder,
        },
      ]}>
      <View style={styles.top}>
        <View style={styles.body}>
          <AppText variant="label">{name}</AppText>
          <View style={styles.meta}>
            <AppText variant="caption" tone="secondary">
              {sizeText}
            </AppText>
            <DepthDots depth={maxGrade} size={6} />
          </View>
        </View>
        <View style={styles.side}>
          {done ? (
            <Ionicons name="checkmark-circle" size={22} color={palette.success} />
          ) : (
            <AppText variant="label" tone="secondary">
              {`${solved}/${total}`}
            </AppText>
          )}
          <Ionicons name="chevron-forward" size={18} color={palette.textSecondary} />
        </View>
      </View>
      <View style={[styles.track, { backgroundColor: palette.board }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${(solved / total) * 100}%`,
              backgroundColor: done ? palette.success : palette.tileBorder,
            },
          ]}
        />
      </View>
      {inProgress > 0 && (
        <AppText variant="caption" tone="accent">
          {t.packInProgress(inProgress)}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  body: { flex: 1, gap: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  side: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
});
