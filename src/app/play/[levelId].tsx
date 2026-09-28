import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';

import type { CellIndex } from '@/core';
import {
  boardStatus,
  canUndo,
  createGame,
  isBlank,
  isSolved,
  placedTiles,
  wallPairs,
  type BoardStatus,
  type GameAction,
} from '@/game';
import { formatDuration, useStrings, type Strings } from '@/i18n';
import { getLevel, LEVELS, nextLevel, type Level } from '@/levels';
import { haptics } from '@/platform/haptics';
import { useSavedGamesStore } from '@/state/saved-games-store';
import { useSessionStore } from '@/state/session-store';
import { Board } from '@/ui/board/Board';
import {
  afterWallDrawn,
  tapWallButton,
  WALL_BUTTON_OFF,
  type WallButton,
  type WallMode,
} from '@/ui/board/wall-mode';
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
  // Keyed by level so per-level UI state (wall button, reset confirmation) starts fresh.
  return level ? <PlayScreen key={level.id} level={level} /> : <NotFound />;
}

const RESET_CONFIRM_MS = 3000;

function PlayScreen({ level }: { readonly level: Level }) {
  const t = useStrings();
  const open = useSessionStore((s) => s.open);
  const dispatch = useSessionStore((s) => s.dispatch);
  const leave = useSessionStore((s) => s.leave);
  const pause = useSessionStore((s) => s.pause);
  const resume = useSessionStore((s) => s.resume);
  const session = useSessionStore((s) => (s.levelId === level.id ? s : null));
  // Saved games load asynchronously; opening waits so a saved board is never missed.
  const savedGamesReady = useSavedGamesStore((s) => s.ready);
  const [wallButton, setWallButton] = useState<WallButton>(WALL_BUTTON_OFF);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!savedGamesReady) return;
    open(level);
    return () => leave(level.id);
  }, [level, savedGamesReady, open, leave]);

  // The clock only runs while the app is in front; going to the background also saves the game.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') resume();
      else pause();
    });
    return () => subscription.remove();
  }, [pause, resume]);

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
    else if (outcome === 'removed' || outcome === 'wallRemoved') haptics.remove();
    else if (outcome === 'wallAdded') haptics.wall();
    else if (outcome === 'blocked') haptics.blocked();
    else if (outcome === 'solved') haptics.solved();
    // A single-use wall mode ends with the wall it was armed for; a solve ends any mode.
    if (outcome === 'wallAdded') setWallButton(afterWallDrawn);
    if (outcome === 'solved') setWallButton(WALL_BUTTON_OFF);
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

      <StatusLine status={status} wallMode={wallButton.mode} solvedInMs={session?.solvedInMs ?? null} t={t} />

      <Board
        puzzle={level.puzzle}
        tiles={placedTiles(game)}
        walls={wallPairs(game)}
        solved={solved}
        tool={wallButton.mode === 'off' ? 'domino' : 'wall'}
        onPlace={(a: CellIndex, b: CellIndex) => act({ type: 'place', a, b })}
        onWall={(a: CellIndex, b: CellIndex) => act({ type: 'addWall', a, b })}
        onRemove={(cell: CellIndex) => act({ type: 'remove', cell })}
        onRemoveWall={(a: CellIndex, b: CellIndex) => act({ type: 'removeWall', a, b })}
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
              icon="ban-outline"
              label={t.actions.wall}
              accessibilityLabel={wallButton.mode === 'locked' ? t.a11y.wallLocked : t.actions.wall}
              onPress={() => setWallButton((current) => tapWallButton(current, Date.now()))}
              selected={wallButton.mode !== 'off'}
              badge={wallButton.mode === 'locked' ? 'lock-closed' : undefined}
              showLabel
            />
            <IconButton
              icon="refresh"
              label={confirmingReset ? t.actions.confirmReset : t.actions.reset}
              onPress={onReset}
              disabled={isBlank(game) && game.past.length === 0}
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
  wallMode,
  solvedInMs,
  t,
}: {
  readonly status: BoardStatus;
  readonly wallMode: WallMode;
  readonly solvedInMs: number | null;
  readonly t: Strings;
}) {
  const { palette } = useTheme();
  const { text, tone, icon } = describeStatus(status, wallMode, solvedInMs, t);
  return (
    <View style={styles.status} accessibilityLiveRegion="polite">
      {icon && (
        <Ionicons
          name={icon}
          size={18}
          color={tone === 'success' ? palette.success : tone === 'accent' ? palette.accent : palette.wall}
        />
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
  wallMode: WallMode,
  solvedInMs: number | null,
  t: Strings,
): {
  text: string;
  tone: 'secondary' | 'accent' | 'success';
  icon: 'alert-circle' | 'checkmark-circle' | 'ban-outline' | 'lock-closed-outline' | null;
} {
  // Wall mode is worth a reminder, but never hides a warning or the solve.
  if (wallMode !== 'off' && (status.kind === 'empty' || status.kind === 'progress')) {
    return wallMode === 'locked'
      ? { text: t.status.wallLocked, tone: 'secondary', icon: 'lock-closed-outline' }
      : { text: t.status.wallOnce, tone: 'secondary', icon: 'ban-outline' };
  }
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
    gap: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
});
