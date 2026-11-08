import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { Keyframe } from 'react-native-reanimated';

import { AppText } from '@/ui/components/AppText';
import { radius, spacing, useTheme } from '@/ui/theme';

import type { CoachMessage } from './coach';

/** An instruction, praise for the move just made, a nudge after another move, or the end. */
export type CoachTone = 'step' | 'good' | 'nudge' | 'done';

interface CoachCardProps {
  /** "Step 2 of 5". */
  readonly caption: string;
  readonly message: CoachMessage;
  readonly tone: CoachTone;
  /**
   * Every instruction and nudge the card can show: it keeps the height of the
   * longest one, so the board under it never resizes from one step to the next.
   */
  readonly candidates: readonly string[];
}

const ICONS = { good: 'checkmark-circle', done: 'trophy' } as const;

/** Each new message fades in. */
const appear = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: 4 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }] },
}).duration(180);

/**
 * The tutorial's coach, above the board. Not a live region: the tutorial
 * screen announces each message once, when it changes.
 */
export function CoachCard({ caption, message, tone, candidates }: CoachCardProps) {
  const { palette } = useTheme();
  /** Measured height of each candidate, by text. */
  const [heights, setHeights] = useState<Readonly<Record<string, number>>>({});
  const minHeight = Math.max(0, ...candidates.map((text) => heights[text] ?? 0));
  const measure = (text: string) => (e: LayoutChangeEvent) => {
    const { height } = e.nativeEvent.layout;
    setHeights((previous) => (previous[text] === height ? previous : { ...previous, [text]: height }));
  };
  const icon = tone === 'good' || tone === 'done' ? ICONS[tone] : null;
  const textTone = tone === 'nudge' ? 'accent' : icon ? 'success' : 'primary';

  return (
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.tileBorder }]}>
      <AppText variant="caption" tone="secondary" maxFontSizeMultiplier={1.4}>
        {caption}
      </AppText>
      <View style={{ minHeight }}>
        <Animated.View key={`${tone}:${message.text}`} entering={appear} style={styles.row}>
          {icon && <Ionicons name={icon} size={22} color={palette.success} aria-hidden />}
          <AppText
            variant={icon ? 'label' : 'body'}
            tone={textTone}
            accessibilityLabel={message.spoken}
            maxFontSizeMultiplier={1.4}
            style={styles.text}>
            {message.text}
          </AppText>
        </Animated.View>
        {/* Invisible copies of every message, measured at the card's width. */}
        <View
          style={styles.measure}
          pointerEvents="none"
          aria-hidden
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants">
          {candidates.map((text) => (
            <AppText key={text} maxFontSizeMultiplier={1.4} style={styles.ghost} onLayout={measure(text)}>
              {text}
            </AppText>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  text: { flexShrink: 1 },
  measure: { position: 'absolute', top: 0, left: 0, right: 0, opacity: 0 },
  ghost: { position: 'absolute', top: 0, left: 0, right: 0 },
});
