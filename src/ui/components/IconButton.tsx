import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { radius, spacing, useTheme } from '@/ui/theme';

import { AppText } from './AppText';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface IconButtonProps {
  readonly icon: IconName;
  readonly label: string;
  readonly onPress: () => void;
  readonly disabled?: boolean;
  /** Show the label under the icon (toolbar) or only use it for accessibility. */
  readonly showLabel?: boolean;
  readonly tone?: 'default' | 'accent' | 'primary';
  /** For toggles: shown filled and announced as selected while on. */
  readonly selected?: boolean;
}

/** Round icon button with an optional caption; at least 44 pt to hit comfortably. */
export function IconButton({
  icon,
  label,
  onPress,
  disabled = false,
  showLabel = false,
  tone = 'default',
  selected,
}: IconButtonProps) {
  const { palette } = useTheme();
  const filled = tone === 'primary' || selected === true;
  const iconColor = filled ? palette.background : tone === 'accent' ? palette.accent : palette.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={selected === undefined ? { disabled } : { disabled, selected }}
      hitSlop={6}
      style={({ pressed }) => [styles.root, disabled && styles.disabled, pressed && styles.pressed]}>
      {({ pressed }) => (
        <>
          <View
            style={[
              styles.circle,
              {
                backgroundColor: filled ? palette.text : pressed ? palette.surfacePressed : palette.surface,
                borderColor: tone === 'accent' ? palette.accent : palette.tileBorder,
              },
            ]}>
            <Ionicons name={icon} size={22} color={iconColor} />
          </View>
          {showLabel && (
            <AppText
              variant="caption"
              tone={tone === 'accent' ? 'accent' : selected ? 'primary' : 'secondary'}>
              {label}
            </AppText>
          )}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', gap: spacing.xs, minWidth: 64 },
  circle: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { transform: [{ scale: 0.96 }] },
  disabled: { opacity: 0.35 },
});
