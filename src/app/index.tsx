import { router } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useStrings } from '@/i18n';
import { PACKS } from '@/levels';
import { buildInfo } from '@/platform/build-info';
import { useHydrated } from '@/platform/use-hydrated';
import { useTutorialDue } from '@/state/onboarding-store';
import { useProgressStore } from '@/state/progress-store';
import { useSavedGamesStore } from '@/state/saved-games-store';
import { AppText } from '@/ui/components/AppText';
import { IconButton } from '@/ui/components/IconButton';
import { Screen } from '@/ui/components/Screen';
import { packSummary } from '@/ui/level-list/pack-summary';
import { PackCard } from '@/ui/level-list/PackCard';
import { spacing } from '@/ui/theme';

/** The welcome screen opens by itself at most once per launch, even if it is left with the back button. */
let welcomeShown = false;

export default function HomeScreen() {
  const t = useStrings();
  const hydrated = useHydrated();
  const progress = useProgressStore((s) => s.levels);
  const savedGames = useSavedGamesStore((s) => s.games);
  const tutorialDue = useTutorialDue();

  // The first time the app opens, the welcome screen (and from it, the tutorial) comes up over the home screen.
  useEffect(() => {
    if (!tutorialDue || welcomeShown) return;
    welcomeShown = true;
    router.push('/welcome');
  }, [tutorialDue]);

  return (
    <Screen>
      <Head>
        <title>{t.appName}</title>
      </Head>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <AppText
              variant="title"
              accessibilityRole="header"
              maxFontSizeMultiplier={1.3}
              // Room for the two buttons beside it on the narrowest phones with large text.
              numberOfLines={1}
              adjustsFontSizeToFit
              style={styles.title}>
              {t.appName}
            </AppText>
            <View style={styles.actions}>
              <IconButton
                icon="help-circle-outline"
                label={t.help.howToPlay}
                onPress={() => router.push('/tutorial')}
              />
              <IconButton
                icon="settings-outline"
                label={t.actions.settings}
                onPress={() => router.push('/settings')}
              />
            </View>
          </View>
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
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { flexShrink: 1 },
  actions: { flexDirection: 'row' },
  list: { gap: spacing.md },
  version: { textAlign: 'center' },
});
