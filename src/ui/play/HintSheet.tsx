import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { useStrings } from '@/i18n';
import { AppText } from '@/ui/components/AppText';
import { radius, spacing, useTheme } from '@/ui/theme';

import type { HintView } from './hint-text';

interface HintSheetProps {
  readonly view: HintView;
  /** A mistake on the board: shown with a warning icon instead of a bulb. */
  readonly mistake: boolean;
  /** Moves on: "Why?" → "Do it" (or "Where?" → "Remove it"). */
  readonly onNext: () => void;
  readonly onClose: () => void;
}

/**
 * The hint, floating over the toolbar like the pair tracker, so the board never
 * moves: what to look at, then why, then a button that does it. Spoken by the
 * play screen's announcement when it opens and at each step.
 */
export function HintSheet({ view, mistake, onNext, onClose }: HintSheetProps) {
  const { palette } = useTheme();
  const t = useStrings();

  // Slide up on open.
  const offset = useSharedValue(24);
  const opacity = useSharedValue(0);
  useEffect(() => {
    offset.set(withSpring(0, { damping: 18, stiffness: 220 }));
    opacity.set(withTiming(1, { duration: 150 }));
  }, [offset, opacity]);
  const animated = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateY: offset.get() }],
  }));

  return (
    <Animated.View
      style={[styles.sheet, { backgroundColor: palette.surface, borderColor: palette.tileBorder }, animated]}>
      <View style={styles.header}>
        <Ionicons
          name={mistake ? 'alert-circle' : 'bulb'}
          size={22}
          color={palette.accent}
          aria-hidden
          style={styles.icon}
        />
        <AppText
          variant="label"
          accessibilityLabel={view.spoken}
          maxFontSizeMultiplier={1.4}
          style={styles.text}>
          {view.text}
        </AppText>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t.actions.close}
          hitSlop={10}
          style={({ pressed }) => [styles.close, pressed && { backgroundColor: palette.surfacePressed }]}>
          <Ionicons name="close" size={22} color={palette.text} />
        </Pressable>
      </View>
      <Pressable
        onPress={onNext}
        accessibilityRole="button"
        style={({ pressed }) => [styles.next, { backgroundColor: palette.text }, pressed && styles.pressed]}>
        <AppText variant="label" maxFontSizeMultiplier={1.4} style={{ color: palette.background }}>
          {view.next}
        </AppText>
      </Pressable>
    </Animated.View>
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
    padding: spacing.md,
    gap: spacing.md,
    boxShadow: '0px 6px 24px rgba(74, 63, 53, 0.22)',
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  icon: { marginTop: 1 },
  text: { flex: 1 },
  close: {
    width: 40,
    height: 40,
    marginTop: -spacing.sm,
    marginRight: -spacing.xs,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  next: {
    alignSelf: 'flex-end',
    minHeight: 44,
    minWidth: 120,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { transform: [{ scale: 0.97 }] },
});
