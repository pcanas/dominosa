import { router, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useStrings } from '@/i18n';
import { getPack, PACKS, type LevelPack } from '@/levels';
import { useHydrated } from '@/platform/use-hydrated';
import { useProgressStore } from '@/state/progress-store';
import { useSavedGamesStore } from '@/state/saved-games-store';
import { AppText } from '@/ui/components/AppText';
import { IconButton } from '@/ui/components/IconButton';
import { NotFound } from '@/ui/components/NotFound';
import { Screen } from '@/ui/components/Screen';
import { LevelTile } from '@/ui/level-list/LevelTile';
import { spacing } from '@/ui/theme';

/** Pre-render one page per bundled pack for the static web build. */
export function generateStaticParams(): { packId: string }[] {
  return PACKS.map((pack) => ({ packId: pack.id }));
}

export default function PackRoute() {
  const { packId } = useLocalSearchParams<{ packId: string }>();
  const pack = getPack(packId);
  return pack ? <PackScreen pack={pack} /> : <NotFound />;
}

const COLUMNS = 4;

function PackScreen({ pack }: { readonly pack: LevelPack }) {
  const t = useStrings();
  const hydrated = useHydrated();
  const progress = useProgressStore((s) => s.levels);
  const savedGames = useSavedGamesStore((s) => s.games);
  const name = t.packs[pack.id] ?? pack.id;
  const solved = hydrated ? pack.levels.filter((l) => progress[l.id]).length : 0;

  // Rows of COLUMNS tiles; the last row is padded so tiles keep the same width.
  const rows: (typeof pack.levels)[] = [];
  for (let i = 0; i < pack.levels.length; i += COLUMNS) rows.push(pack.levels.slice(i, i + COLUMNS));

  return (
    <Screen>
      <Head>
        <title>{`${name} · ${t.appName}`}</title>
      </Head>
      <View style={styles.topBar}>
        <IconButton
          icon="chevron-back"
          label={t.actions.back}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        />
        <View style={styles.titleBlock}>
          <AppText variant="heading" accessibilityRole="header">
            {name}
          </AppText>
          <AppText variant="caption" tone="secondary">
            {t.packSolved(solved, pack.levels.length)}
          </AppText>
        </View>
        <View style={styles.topBarSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {rows.map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map((level) => (
              <LevelTile
                key={level.id}
                level={level}
                solved={hydrated && progress[level.id] !== undefined}
                inProgress={hydrated && savedGames[level.id] !== undefined}
                onPress={() => router.push({ pathname: '/play/[levelId]', params: { levelId: level.id } })}
              />
            ))}
            {Array.from({ length: COLUMNS - row.length }, (_, i) => (
              <View key={`pad-${i}`} style={styles.pad} />
            ))}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', paddingTop: spacing.sm },
  titleBlock: { flex: 1, alignItems: 'center' },
  topBarSpacer: { minWidth: 64 },
  grid: { paddingVertical: spacing.xl, gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  pad: { flex: 1 },
});
