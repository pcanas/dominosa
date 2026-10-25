import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View, type AppStateStatus } from 'react-native';

import { dominoId, type CellIndex, type DominoId } from '@/core';
import {
  boardStatus,
  canUndo,
  createGame,
  hasWall,
  isBlank,
  isSolved,
  pairSlots,
  placedTiles,
  trackPairs,
  wallPairs,
  type GameAction,
} from '@/game';
import { formatDuration, useStrings } from '@/i18n';
import { getLevel, LEVELS, nextLevel, type Level } from '@/levels';
import { haptics } from '@/platform/haptics';
import { announce, useScreenReader } from '@/platform/screen-reader';
import { useSavedGamesStore } from '@/state/saved-games-store';
import { useSessionStore, type DispatchOutcome } from '@/state/session-store';
import { useSettingsStore } from '@/state/settings-store';
import { announcementFor, cellActions, describeCells } from '@/ui/board/a11y';
import { Board } from '@/ui/board/Board';
import { pickCell } from '@/ui/board/tap-select';
import { afterWallDrawn, tapWallButton, WALL_BUTTON_OFF, type WallButton } from '@/ui/board/wall-mode';
import { AppText } from '@/ui/components/AppText';
import { IconButton } from '@/ui/components/IconButton';
import { NotFound } from '@/ui/components/NotFound';
import { Screen } from '@/ui/components/Screen';
import { TopBar } from '@/ui/components/TopBar';
import { Clock } from '@/ui/play/Clock';
import { pairLabel, pairStatus } from '@/ui/play/status';
import { StatusLine } from '@/ui/play/StatusLine';
import { spacing } from '@/ui/theme';
import { PairTracker } from '@/ui/tracker/PairTracker';

/** Pre-render one page per bundled level for the static web build. */
export function generateStaticParams(): { levelId: string }[] {
  return LEVELS.map((level) => ({ levelId: level.id }));
}

export default function PlayRoute() {
  const { levelId } = useLocalSearchParams<{ levelId: string }>();
  const level = getLevel(levelId);
  // Keyed by level so per-level UI state (wall button, tracker, reset confirmation) starts fresh.
  return level ? <PlayScreen key={level.id} level={level} /> : <NotFound />;
}

const RESET_CONFIRM_MS = 3000;

/** Vibration for each kind of move. */
const HAPTICS: Partial<Record<DispatchOutcome, () => void>> = {
  placed: haptics.place,
  removed: haptics.remove,
  wallAdded: haptics.wall,
  wallRemoved: haptics.remove,
  blocked: haptics.blocked,
  solved: haptics.solved,
};

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
  const focused = useIsFocused();
  const [wallButton, setWallButton] = useState<WallButton>(WALL_BUTTON_OFF);
  const [trackerOpen, setTrackerOpen] = useState(false);
  /** Pair picked in the tracker: its free slots are shown on the board. */
  const [selectedPair, setSelectedPair] = useState<DominoId | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const vibration = useSettingsStore((s) => s.vibration);
  const screenReaderOn = useScreenReader();
  /** Cell picked first while playing with a screen reader. */
  const [pickedCell, setPickedCell] = useState<CellIndex | null>(null);
  const selectedCell = screenReaderOn ? pickedCell : null;
  /** Last message for the visually hidden live region (screen readers on Android and the web). */
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (!savedGamesReady) return;
    open(level);
    return () => leave(level.id);
  }, [level, savedGamesReady, open, leave]);

  // The clock only runs while this screen is in front (not under settings) and the app is active;
  // pausing also saves the game.
  useEffect(() => {
    if (!focused) return;
    const isThisLevel = () => useSessionStore.getState().levelId === level.id;
    // Back from settings: the clock starts again.
    if (AppState.currentState === 'active' && isThisLevel()) resume();
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (!isThisLevel()) return;
      if (state === 'active') resume();
      else pause();
    });
    return () => {
      subscription.remove();
      if (isThisLevel()) pause();
    };
  }, [focused, level.id, pause, resume]);

  // "Sure?" goes back to "Reset" after a few seconds.
  useEffect(() => {
    if (!confirmingReset) return;
    const id = setTimeout(() => setConfirmingReset(false), RESET_CONFIRM_MS);
    return () => clearTimeout(id);
  }, [confirmingReset]);

  // Until the session opens (first frame, static render), show the empty board.
  const game = session?.game ?? createGame(level.puzzle);
  const solved = isSolved(game);
  const next = nextLevel(level.id);
  const { order } = level.puzzle;
  const pair =
    selectedPair !== null && !solved
      ? { label: pairLabel(selectedPair, order), slots: pairSlots(game, selectedPair) }
      : null;
  const packName = t.packs[level.packId] ?? level.packId;
  const descriptions = describeCells(game, selectedCell, t);

  const say = (message: string) => {
    // Alternate a zero-width space so the same message twice is still read twice.
    setAnnouncement((previous) => (previous.endsWith('​') ? message : `${message}​`));
    announce(message);
  };

  const act = (action: GameAction) => {
    const outcome = dispatch(action);
    if (vibration) HAPTICS[outcome]?.();
    const after = useSessionStore.getState();
    if (after.game) {
      const solvedText = t.status.solved(formatDuration(after.solvedInMs ?? 0));
      const message = announcementFor(action, outcome, after.game, t, solvedText);
      if (message) say(message);
    }
    // A single-use wall mode ends with the wall it was armed for; a solve ends any mode.
    if (outcome === 'wallAdded') setWallButton(afterWallDrawn);
    if (outcome === 'solved') {
      setWallButton(WALL_BUTTON_OFF);
      setTrackerOpen(false);
      setSelectedPair(null);
    }
    // Placing the pair picked in the tracker is what the highlight was for.
    if (outcome === 'placed' && action.type === 'place' && selectedPair !== null) {
      const cells = level.puzzle.cells;
      if (dominoId(cells[action.a]!, cells[action.b]!, order) === selectedPair) setSelectedPair(null);
    }
  };

  /** A cell picked while playing with a screen reader. */
  const onPickCell = (cell: CellIndex) => {
    const { selected, action } = pickCell(selectedCell, cell, {
      cols: level.puzzle.cols,
      partnerOf: (c) => game.partner[c] ?? -1,
      hasWall: (a, b) => hasWall(game, a, b),
      wallMode: wallButton.mode !== 'off',
    });
    setPickedCell(selected);
    if (action) act(action);
    else if (selected !== null) say(t.announce.selected(descriptions[selected]!));
    else say(t.announce.deselected);
  };

  const onSelectPair = (domino: DominoId) => {
    if (domino === selectedPair) {
      setSelectedPair(null);
      return;
    }
    setSelectedPair(domino);
    setTrackerOpen(false);
    say(pairStatus({ label: pairLabel(domino, order), slots: pairSlots(game, domino) }, t).text);
  };

  const onReset = () => {
    if (!confirmingReset && !solved) {
      setConfirmingReset(true);
      return;
    }
    setConfirmingReset(false);
    act({ type: 'reset' });
  };

  const goNext = () =>
    next
      ? router.replace({ pathname: '/play/[levelId]', params: { levelId: next.id } })
      : router.replace('/');

  return (
    <Screen gutter={spacing.sm}>
      <Head>
        <title>{`${packName} · ${t.levelNumber(level.number)} · ${t.appName}`}</title>
      </Head>
      <TopBar
        backTo={{ pathname: '/pack/[packId]', params: { packId: level.packId } }}
        right={
          <IconButton
            icon="settings-outline"
            label={t.actions.settings}
            onPress={() => router.push('/settings')}
          />
        }>
        <AppText variant="heading" accessibilityRole="header">
          {t.levelNumber(level.number)}
        </AppText>
        <View style={styles.subtitle}>
          <AppText variant="caption" tone="secondary" maxFontSizeMultiplier={1.4}>
            {packName} · {t.gridSize(level.puzzle.cols, level.puzzle.rows)}
          </AppText>
          <Clock levelId={level.id} />
        </View>
      </TopBar>

      <StatusLine
        status={boardStatus(game)}
        wallMode={wallButton.mode}
        pickMode={screenReaderOn}
        pair={pair}
        onClearPair={() => setSelectedPair(null)}
        solvedInMs={session?.solvedInMs ?? null}
      />

      <Board
        puzzle={level.puzzle}
        tiles={placedTiles(game)}
        walls={wallPairs(game)}
        solved={solved}
        tool={wallButton.mode === 'off' ? 'domino' : 'wall'}
        onAction={act}
        highlight={pair?.slots ?? null}
        descriptions={descriptions}
        screenReader={
          screenReaderOn
            ? {
                selected: selectedCell,
                onPick: onPickCell,
                actionsFor: (cell: CellIndex) => cellActions(game, cell, t),
              }
            : null
        }
      />

      <View style={[styles.toolbar, solved && styles.toolbarPair]}>
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
              accessibilityLabel={
                wallButton.mode === 'locked'
                  ? t.a11y.wallLocked
                  : wallButton.mode === 'once'
                    ? t.a11y.wallOnce
                    : t.actions.wall
              }
              onPress={() => setWallButton((current) => tapWallButton(current, Date.now()))}
              selected={wallButton.mode !== 'off'}
              badge={wallButton.mode === 'locked' ? 'lock-closed' : undefined}
              showLabel
            />
            <IconButton
              icon="grid-outline"
              label={t.actions.pairs}
              onPress={() => setTrackerOpen((isOpen) => !isOpen)}
              selected={trackerOpen}
              showLabel
            />
            <IconButton
              icon="refresh"
              label={confirmingReset ? t.actions.confirmReset : t.actions.reset}
              onPress={onReset}
              // Nothing on the board: a reset would not change anything.
              disabled={isBlank(game)}
              tone={confirmingReset ? 'accent' : 'default'}
              showLabel
            />
          </>
        )}
      </View>

      {/* Spoken by TalkBack and by screen readers on the web; VoiceOver gets `announce`. */}
      <Text accessibilityLiveRegion="polite" aria-live="polite" style={styles.srOnly}>
        {announcement}
      </Text>

      {trackerOpen && !solved && (
        <PairTracker
          order={order}
          pairs={trackPairs(game)}
          selected={selectedPair}
          onSelect={onSelectPair}
          onClose={() => setTrackerOpen(false)}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: { flexDirection: 'row', alignItems: 'center' },
  srOnly: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 },
  // Evenly spread up to a comfortable width, so four buttons still fit on a 320 pt screen.
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    gap: spacing.xs,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  toolbarPair: { justifyContent: 'center', gap: spacing.xl },
});
