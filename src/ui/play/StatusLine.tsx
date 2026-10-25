import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { useStrings } from '@/i18n';
import { AppText } from '@/ui/components/AppText';
import { spacing, useTheme } from '@/ui/theme';

import { describeStatus, type StatusInput } from './status';

interface StatusLineProps extends StatusInput {
  readonly onClearPair: () => void;
}

/**
 * The line above the board (see `describeStatus`). Not a live region: moves are
 * announced by the play screen, without repeating this line.
 */
export function StatusLine({ onClearPair, ...input }: StatusLineProps) {
  const t = useStrings();
  const { palette } = useTheme();
  const { text, tone, icon } = describeStatus(input, t);
  return (
    <View style={styles.status}>
      {icon && (
        <Ionicons
          name={icon}
          size={18}
          color={tone === 'success' ? palette.success : tone === 'accent' ? palette.accent : palette.wall}
        />
      )}
      <AppText
        variant="label"
        tone={tone === 'secondary' ? 'secondary' : 'primary'}
        numberOfLines={3}
        maxFontSizeMultiplier={1.4}
        style={styles.text}>
        {text}
      </AppText>
      {input.pair && (
        <Pressable
          onPress={onClearPair}
          accessibilityRole="button"
          accessibilityLabel={t.a11y.clearPair}
          hitSlop={12}
          style={styles.clear}>
          <Ionicons name="close-circle" size={20} color={palette.textSecondary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  status: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  text: { textAlign: 'center', flexShrink: 1 },
  clear: { padding: 2 },
});
