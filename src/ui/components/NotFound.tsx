import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useStrings } from '@/i18n';
import { spacing } from '@/ui/theme';

import { AppText } from './AppText';
import { IconButton } from './IconButton';
import { Screen } from './Screen';

/** Shown for unknown routes and unknown level ids. */
export function NotFound() {
  const t = useStrings();
  return (
    <Screen>
      <View style={styles.root}>
        <AppText variant="heading">{t.notFound}</AppText>
        <IconButton icon="chevron-back" label={t.goHome} onPress={() => router.replace('/')} showLabel />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
});
