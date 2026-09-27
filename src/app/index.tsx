import { router } from 'expo-router';
import Head from 'expo-router/head';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useStrings } from '@/i18n';
import { LEVELS } from '@/levels';
import { useHydrated } from '@/platform/use-hydrated';
import { useProgressStore } from '@/state/progress-store';
import { AppText } from '@/ui/components/AppText';
import { Screen } from '@/ui/components/Screen';
import { LevelCard } from '@/ui/level-list/LevelCard';
import { spacing } from '@/ui/theme';

export default function HomeScreen() {
  const t = useStrings();
  const hydrated = useHydrated();
  const progress = useProgressStore((s) => s.levels);

  return (
    <Screen>
      <Head>
        <title>{t.appName}</title>
      </Head>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <AppText variant="caption" tone="accent">
            {t.prototypeTag}
          </AppText>
          <AppText variant="title" accessibilityRole="header">
            {t.appName}
          </AppText>
          <AppText tone="secondary">{t.homeSubtitle}</AppText>
        </View>
        <View style={styles.list}>
          {LEVELS.map((level) => (
            <LevelCard
              key={level.id}
              level={level}
              progress={hydrated ? progress[level.id] : undefined}
              onPress={() => router.push({ pathname: '/play/[levelId]', params: { levelId: level.id } })}
            />
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: spacing.xl, gap: spacing.xl },
  header: { gap: spacing.sm },
  list: { gap: spacing.md },
});
