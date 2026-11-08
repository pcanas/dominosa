import { Pressable, StyleSheet } from 'react-native';

import { radius, spacing, useTheme } from '@/ui/theme';

import { AppText } from './AppText';

interface PillButtonProps {
  readonly label: string;
  readonly onPress: () => void;
}

/** The screen's main action, as a wide filled pill (e.g. "Let's play!" at the end of the tutorial). */
export function PillButton({ label, onPress }: PillButtonProps) {
  const { palette } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.pill, { backgroundColor: palette.text }, pressed && styles.pressed]}>
      <AppText variant="label" maxFontSizeMultiplier={1.4} style={{ color: palette.background }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: 52,
    minWidth: 220,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { transform: [{ scale: 0.97 }] },
});
