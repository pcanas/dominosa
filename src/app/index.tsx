import { router } from 'expo-router';
import Head from 'expo-router/head';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useStrings } from '@/i18n';
import { PACKS } from '@/levels';
import { buildInfo } from '@/platform/build-info';
import { useHydrated } from '@/platform/use-hydrated';
import { useProgressStore } from '@/state/progress-store';
import { useSavedGamesStore } from '@/state/saved-games-store';
import { AppText } from '@/ui/components/AppText';
import { Screen } from '@/ui/components/Screen';
import { packSummary } from '@/ui/level-list/pack-summary';
import { PackCard } from '@/ui/level-list/PackCard';
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
          <AppText variant="title" accessibilityRole="header">
            {t.appName}
          </AppText>
          <AppText tone="secondary">{t.homeSubtitle}</AppText>
        </View>
        <View style={styles.list}>
          {PACKS.map((pack) => (
            <PackCard
              key={pack.id}
              name={t.packs[pack.id] ?? pack.id}
              // Stored data only after hydration, so the static web render matches.
              summary={packSummary(pack, hydrated ? progress : {}, hydrated ? savedGames : {})}
              onPress={() => router.push({ pathname: '/pack/[packId]', params: { packId: pack.id } })}
            />
          ))}
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
