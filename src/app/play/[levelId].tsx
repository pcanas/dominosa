import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { CellIndex } from '@/core';
import {
  boardStatus,
  canUndo,
  createGame,
  isSolved,
  placedTiles,
  type BoardStatus,
  type GameAction,
} from '@/game';
import { formatDuration, useStrings, type Strings } from '@/i18n';
import { getLevel, LEVELS, nextLevel, type Level } from '@/levels';
import { haptics } from '@/platform/haptics';
import { useSessionStore } from '@/state/session-store';
import { Board } from '@/ui/board/Board';
import { AppText } from '@/ui/components/AppText';
import { IconButton } from '@/ui/components/IconButton';
import { NotFound } from '@/ui/components/NotFound';
import { Screen } from '@/ui/components/Screen';
import { spacing, useTheme } from '@/ui/theme';

/** Pre-render one page per bundled level for the static web build. */
export function generateStaticParams(): { levelId: string }[] {
  return LEVELS.map((level) => ({ levelId: level.id }));
}

export default function PlayRoute() {
  const { levelId } = useLocalSearchParams<{ levelId: string }>();
  const level = getLevel(levelId);
  return level ? <PlayScreen level={level} /> : <NotFound />;
}

const RESET_CONFIRM_MS = 3000;

function PlayScreen({ level }: { readonly level: Level }) {
  const t = useStrings();
  const open = useSessionStore((s) => s.open);
  const dispatch = useSessionStore((s) => s.dispatch);
  const session = useSessionStore((s) => (s.levelId === level.id ? s : null));
  const [confirmingReset, setConfirmingReset] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const leave = useSessionStore((s) => s.leave);
  useEffect(() => {
    open(level);
    return () => leave(level.id);
  }, [level, open, leave]);

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [],
  );

  // Until the session opens (first frame, static render), show the empty board.
  const game = session?.game ?? createGame(level.puzzle);
  const solved = isSolved(game);
  const status = boardStatus(game);
  const next = nextLevel(level.id);

  const act = (action: GameAction) => {
    const outcome = dispatch(action);
    if (outcome === 'placed') haptics.place();
    else if (outcome === 'removed') haptics.remove();
    else if (outcome === 'solved') haptics.solved();
  };

  const onReset = () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    if (!confirmingReset && !solved) {
      setConfirmingReset(true);
      resetTimer.current = setTimeout(() => setConfirmingReset(false), RESET_CONFIRM_MS);
      return;
    }
    setConfirmingReset(false);
    act({ type: 'reset' });
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const goNext = () =>
    next
      ? router.replace({ pathname: '/play/[levelId]', params: { levelId: next.id } })
      : router.replace('/');

  return (
    <Screen gutter={spacing.sm}>
      <Head>
        <title>{`${t.levelNumber(level.number)} · ${t.appName}`}</title>
      </Head>
      <View style={styles.topBar}>
        <IconButton icon="chevron-back" label={t.actions.back} onPress={goBack} />
        <View style={styles.titleBlock}>
          <AppText variant="heading" accessibilityRole="header">
            {t.levelNumber(level.number)}
          </AppText>
          <AppText variant="caption" tone="secondary">
            {t.difficulty[level.difficulty]} · {t.gridSize(level.puzzle.cols, level.puzzle.rows)}
          </AppText>
        </View>
        <View style={styles.topBarSpacer} />
      </View>

      <StatusLine status={status} solvedInMs={session?.solvedInMs ?? null} t={t} />

      <Board
        puzzle={level.puzzle}
        tiles={placedTiles(game)}
        solved={solved}
        onPlace={(a: CellIndex, b: CellIndex) => act({ type: 'place', a, b })}
        onRemove={(cell: CellIndex) => act({ type: 'remove', cell })}
      />

      <View style={styles.toolbar}>
        {solved ? (
          <>
            <IconButton icon="refresh" label={t.actions.replay} onPress={onReset} showLabel />
            <IconButton
              icon={next ? 'arrow-forward' : 'grid-outline'}
              label={next ? t.actions.next : t.actions.levels}
              onPress={goNext}
              showLabel
              tone="primary"
            />
          </>
        ) : (
          <>
            <IconButton
              icon="arrow-undo"
              label={t.actions.undo}
              onPress={() => act({ type: 'undo' })}
              disabled={!canUndo(game)}
              showLabel
            />
            <IconButton
              icon="refresh"
              label={confirmingReset ? t.actions.confirmReset : t.actions.reset}
              onPress={onReset}
              disabled={status.kind === 'empty' && game.past.length === 0}
              tone={confirmingReset ? 'accent' : 'default'}
              showLabel
            />
          </>
        )}
      </View>
    </Screen>
  );
}

function StatusLine({
  status,
  solvedInMs,
  t,
}: {
  readonly status: BoardStatus;
  readonly solvedInMs: number | null;
  readonly t: Strings;
}) {
  const { palette } = useTheme();
  const { text, tone, icon } = describeStatus(status, solvedInMs, t);
  return (
    <View style={styles.status} accessibilityLiveRegion="polite">
      {icon && (
        <Ionicons name={icon} size={18} color={tone === 'success' ? palette.success : palette.accent} />
      )}
      <AppText
        variant="label"
        tone={tone === 'secondary' ? 'secondary' : 'primary'}
        numberOfLines={2}
        style={styles.statusText}>
        {text}
      </AppText>
    </View>
  );
}

function describeStatus(
  status: BoardStatus,
  solvedInMs: number | null,
  t: Strings,
): {
  text: string;
  tone: 'secondary' | 'accent' | 'success';
  icon: 'alert-circle' | 'checkmark-circle' | null;
} {
  switch (status.kind) {
    case 'empty':
      return { text: t.status.start, tone: 'secondary', icon: null };
    case 'progress':
      return { text: t.status.progress(status.placed, status.total), tone: 'secondary', icon: null };
    case 'duplicates':
      return {
        text: status.full ? t.status.fullWithDuplicates : t.status.duplicates,
        tone: 'accent',
        icon: 'alert-circle',
      };
    case 'solved':
      return {
        text: t.status.solved(formatDuration(solvedInMs ?? 0)),
        tone: 'success',
        icon: 'checkmark-circle',
      };
  }
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', paddingTop: spacing.sm },
  titleBlock: { flex: 1, alignItems: 'center' },
  topBarSpacer: { minWidth: 64 },
  status: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  statusText: { textAlign: 'center', flexShrink: 1 },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
});
