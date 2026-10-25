import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing, useTheme } from '@/ui/theme';

interface ScreenProps {
  readonly children: ReactNode;
  /** Side padding; the play screen uses a tighter one to give the board more room. */
  readonly gutter?: number;
}

/**
 * Since SDK 58, Expo Router reports zero safe-area insets on the web (measuring them could break
 * hydration), so the installed web app pads with CSS instead: the notch and the home indicator.
 * React Native's style types do not know `env()`, hence the cast.
 */
const WEB_SAFE_AREA = {
  paddingTop: 'env(safe-area-inset-top, 0px)',
  paddingBottom: 'env(safe-area-inset-bottom, 0px)',
} as unknown as ViewStyle;

/** Full-screen container: safe areas, theme background and a readable max width. */
export function Screen({ children, gutter = spacing.lg }: ScreenProps) {
  const { palette } = useTheme();
  const content = <View style={[styles.content, { paddingHorizontal: gutter }]}>{children}</View>;
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.root, WEB_SAFE_AREA, { backgroundColor: palette.background }]}>{content}</View>
    );
  }
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
});
