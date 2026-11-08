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
  /** No back button (a first screen with nothing behind it); its slot stays, empty. */
  readonly noBack?: boolean;
}

/** Back button, centred title and an optional control on the right. */
export function TopBar({ backTo, children, right, noBack = false }: TopBarProps) {
  const t = useStrings();
  return (
    <View style={styles.bar}>
      {noBack ? (
        <View style={styles.spacer} />
      ) : (
        <IconButton
          icon="chevron-back"
          label={t.actions.back}
          onPress={() => (router.canGoBack() ? router.back() : router.replace(backTo))}
        />
      )}
      <View style={styles.title}>{children}</View>
      {right ?? <View style={styles.spacer} />}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', paddingTop: spacing.sm },
  title: { flex: 1, alignItems: 'center' },
  // Same size as an icon button, so the bar keeps its height without one.
  spacer: { minWidth: 64, minHeight: 48 },
});
