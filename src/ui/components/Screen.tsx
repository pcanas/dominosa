import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing, useTheme } from '@/ui/theme';

interface ScreenProps {
  readonly children: ReactNode;
  /** Side padding; the play screen uses a tighter one to give the board more room. */
  readonly gutter?: number;
}

/** Full-screen container: safe areas, theme background and a readable max width. */
export function Screen({ children, gutter = spacing.lg }: ScreenProps) {
  const { palette } = useTheme();
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      <View style={[styles.content, { paddingHorizontal: gutter }]}>{children}</View>
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
