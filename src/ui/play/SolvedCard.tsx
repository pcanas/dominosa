import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Keyframe } from 'react-native-reanimated';

import { AppText } from '@/ui/components/AppText';
import { radius, spacing, useTheme } from '@/ui/theme';

import type { SolveSummary } from './status';

interface SolvedCardProps {
  readonly summary: SolveSummary;
  /** Wait for the solve wave on the board before appearing (ms). */
  readonly delay: number;
}

/**
 * Takes the status line's place once the board is solved: the time, and how it
 * compares with the best one. Same height as the status line, so the board
 * does not move. Spoken by the play screen's announcement, not as a live region.
 */
export function SolvedCard({ summary, delay }: SolvedCardProps) {
  const { palette } = useTheme();
  // Read once, when the card mounts.
  const [appear] = useState(() =>
    new Keyframe({
      0: { opacity: 0, transform: [{ translateY: 6 }, { scale: 0.96 }] },
      100: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] },
    })
      .delay(delay)
      .duration(260),
  );

  return (
    <View style={styles.slot}>
      <Animated.View
        entering={appear}
        style={[styles.card, { backgroundColor: palette.successSoft, borderColor: palette.success }]}>
        <Ionicons
          name={summary.newBest ? 'trophy' : 'checkmark-circle'}
          size={22}
          color={palette.success}
          aria-hidden
        />
        <View style={styles.text}>
          <AppText variant="label" maxFontSizeMultiplier={1.4}>
            {summary.title}
          </AppText>
          {summary.detail && (
            <AppText variant="caption" maxFontSizeMultiplier={1.4}>
              {summary.detail}
            </AppText>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Same minimum height as the status line it replaces.
  slot: { minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  text: { flexShrink: 1 },
});
