import { router } from 'expo-router';
import Head from 'expo-router/head';
import { ScrollView, StyleSheet, View } from 'react-native';

import { dominoCount } from '@/core';
import { savedPlacedCount } from '@/game';
import { useStrings } from '@/i18n';
import { LEVELS } from '@/levels';
import { buildInfo } from '@/platform/build-info';
import { useHydrated } from '@/platform/use-hydrated';
import { useProgressStore } from '@/state/progress-store';
import { useSavedGamesStore } from '@/state/saved-games-store';
import { AppText } from '@/ui/components/AppText';
import { Screen } from '@/ui/components/Screen';
import { LevelCard } from '@/ui/level-list/LevelCard';
import { spacing } from '@/ui/theme';

export default function HomeScreen() {
  const t = useStrings();
  const hydrated = useHydrated();
  const progress = useProgressStore((s) => s.levels);
  const savedGames = useSavedGamesStore((s) => s.games);

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
          {LEVELS.map((level) => {
            const saved = hydrated ? savedGames[level.id] : undefined;
            return (
              <LevelCard
                key={level.id}
                level={level}
                progress={hydrated ? progress[level.id] : undefined}
                inProgress={
                  saved && { placed: savedPlacedCount(saved), total: dominoCount(level.puzzle.order) }
                }
                onPress={() => router.push({ pathname: '/play/[levelId]', params: { levelId: level.id } })}
              />
            );
          })}
        </View>
        <AppText variant="caption" tone="secondary" style={styles.version}>
          {t.version(buildInfo.version, buildInfo.build)}
        </AppText>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: spacing.xl, gap: spacing.xl },
  header: { gap: spacing.sm },
  list: { gap: spacing.md },
  version: { textAlign: 'center' },
});
