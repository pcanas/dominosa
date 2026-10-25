import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useStrings } from '@/i18n';
import { spacing } from '@/ui/theme';

import { IconButton } from './IconButton';

interface TopBarProps {
  /** Where "back" goes when there is no history, e.g. a page opened from a link on the web. */
  readonly backTo: Href;
  /** Title block, centred. */
  readonly children: ReactNode;
  /** Control on the right; without one, an empty slot keeps the title centred. */
  readonly right?: ReactNode;
}

/** Back button, centred title and an optional control on the right. */
export function TopBar({ backTo, children, right }: TopBarProps) {
  const t = useStrings();
  return (
    <View style={styles.bar}>
      <IconButton
        icon="chevron-back"
        label={t.actions.back}
        onPress={() => (router.canGoBack() ? router.back() : router.replace(backTo))}
      />
      <View style={styles.title}>{children}</View>
      {right ?? <View style={styles.spacer} />}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', paddingTop: spacing.sm },
  title: { flex: 1, alignItems: 'center' },
  // Same width as an icon button.
  spacer: { minWidth: 64 },
});
