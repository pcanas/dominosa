import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';

import { dominoId, dominoPips, type CellIndex, type DominoId } from '@/core';
import {
  boardStatus,
  canUndo,
  createGame,
  isBlank,
  isSolved,
  pairSlots,
  placedTiles,
  trackPairs,
  wallPairs,
  type BoardStatus,
  type GameAction,
  type PairSlots,
} from '@/game';
import { formatDuration, useStrings, type Strings } from '@/i18n';
import { getLevel, LEVELS, nextLevel, type Level } from '@/levels';
import { haptics } from '@/platform/haptics';
import { announce, useScreenReader } from '@/platform/screen-reader';
import { useSavedGamesStore } from '@/state/saved-games-store';
import { elapsedNow, useSessionStore, type DispatchOutcome } from '@/state/session-store';
import { useSettingsStore } from '@/state/settings-store';
import { announcementFor, cellActions, describeCells } from '@/ui/board/a11y';
import { Board } from '@/ui/board/Board';
import { pickCell } from '@/ui/board/tap-select';
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
  const [trackerOpen, setTrackerOpen] = useState(false);
  /** Pair picked in the tracker: its free slots are shown on the board. */
  const [selectedPair, setSelectedPair] = useState<DominoId | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  // The clock only runs while the app is in front; going to the background also saves the game.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') resume();
      else pause();
    });
    return () => subscription.remove();
  }, [pause, resume]);

  // Leaving the screen without unmounting it (settings is pushed on top) stops the clock too.
  useFocusEffect(
    useCallback(() => {
      if (useSessionStore.getState().levelId === level.id) resume();
      return () => {
        if (useSessionStore.getState().levelId === level.id) pause();
      };
    }, [level.id, pause, resume]),
  );

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
  const { order } = level.puzzle;
  const highlight = selectedPair !== null && !solved ? pairSlots(game, selectedPair) : null;
  const packName = t.packs[level.packId] ?? level.packId;
  const descriptions = describeCells(game, selectedCell, t);

  const say = (message: string) => {
    // Alternate a zero-width space so the same message twice is still read twice.
    setAnnouncement((previous) => (previous.endsWith('\u200B') ? message : `${message}\u200B`));
    announce(message);
  };

  const feedback = (outcome: DispatchOutcome) => {
    if (!vibration) return;
    if (outcome === 'placed') haptics.place();
    else if (outcome === 'removed' || outcome === 'wallRemoved') haptics.remove();
    else if (outcome === 'wallAdded') haptics.wall();
    else if (outcome === 'blocked') haptics.blocked();
    else if (outcome === 'solved') haptics.solved();
  };

  const act = (action: GameAction) => {
    const outcome = dispatch(action);
    feedback(outcome);
    const after = useSessionStore.getState();
    const message = after.game
      ? announcementFor(
          action,
          outcome,
          after.game,
          t,
          t.status.solved(formatDuration(after.solvedInMs ?? 0)),
        )
      : null;
    if (message) say(message);
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
      hasWall: (a, b) => wallPairs(game).some((w) => w.a === Math.min(a, b) && w.b === Math.max(a, b)),
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
    const slots = pairSlots(game, domino);
    const label = pairLabel(domino, order);
    say(
      slots.placed.length > 0
        ? t.status.pairPlaced(label)
        : slots.open.length === 0
          ? t.status.pairNone(label)
          : t.status.pairOpen(label, slots.open.length),
    );
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

  const goBack = () =>
    router.canGoBack()
      ? router.back()
      : router.replace({ pathname: '/pack/[packId]', params: { packId: level.packId } });
  const goNext = () =>
    next
      ? router.replace({ pathname: '/play/[levelId]', params: { levelId: next.id } })
      : router.replace('/');

  return (
    <Screen gutter={spacing.sm}>
      <Head>
        <title>{`${packName} · ${t.levelNumber(level.number)} · ${t.appName}`}</title>
      </Head>
      <View style={styles.topBar}>
        <IconButton icon="chevron-back" label={t.actions.back} onPress={goBack} />
        <View style={styles.titleBlock}>
          <AppText variant="heading" accessibilityRole="header">
            {t.levelNumber(level.number)}
          </AppText>
          <View style={styles.subtitle}>
            <AppText variant="caption" tone="secondary" maxFontSizeMultiplier={1.4}>
              {packName} · {t.gridSize(level.puzzle.cols, level.puzzle.rows)}
            </AppText>
            <Clock levelId={level.id} />
          </View>
        </View>
        <IconButton
          icon="settings-outline"
          label={t.actions.settings}
          onPress={() => router.push('/settings')}
        />
      </View>

      <StatusLine
        status={status}
        wallMode={wallButton.mode}
        pair={
          highlight && selectedPair !== null
            ? { label: pairLabel(selectedPair, order), slots: highlight }
            : null
        }
        onClearPair={() => setSelectedPair(null)}
        solvedInMs={session?.solvedInMs ?? null}
        t={t}
      />

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
        highlight={highlight}
        descriptions={descriptions}
        screenReader={
          screenReaderOn
            ? {
                selected: selectedCell,
                onPick: onPickCell,
                actionsFor: (cell: CellIndex) => cellActions(game, cell, t),
                onAction: act,
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
              onPress={() => setTrackerOpen((open) => !open)}
              selected={trackerOpen}
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

/** Time played, under the title, when the "show time" setting is on. Ticks on its own. */
function Clock({ levelId }: { readonly levelId: string }) {
  const t = useStrings();
  const show = useSettingsStore((s) => s.showTimer);
  const session = useSessionStore((s) => (s.levelId === levelId ? s : null));
  const running = show && session !== null && session.runningSince !== null;
  // The current time lives in state: the React Compiler memoizes pure-looking calls, so reading
  // Date.now() during render would freeze the clock on its first value.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);
  if (!show || !session) return null;
  const time = formatDuration(session.solvedInMs ?? elapsedNow(session, now));
  return (
    <AppText
      variant="caption"
      tone="secondary"
      maxFontSizeMultiplier={1.4}
      accessibilityLabel={t.a11y.timer(time)}
      style={styles.clock}>
      {` · ${time}`}
    </AppText>
  );
}

/** "3–5" for a domino. */
function pairLabel(domino: DominoId, order: number): string {
  const [lo, hi] = dominoPips(domino, order);
  return `${lo}–${hi}`;
}

interface SelectedPair {
  readonly label: string;
  readonly slots: PairSlots;
}

function StatusLine({
  status,
  wallMode,
  pair,
  onClearPair,
  solvedInMs,
  t,
}: {
  readonly status: BoardStatus;
  readonly wallMode: WallMode;
  readonly pair: SelectedPair | null;
  readonly onClearPair: () => void;
  readonly solvedInMs: number | null;
  readonly t: Strings;
}) {
  const { palette } = useTheme();
  const { text, tone, icon } = describeStatus(status, wallMode, pair, solvedInMs, t);
  const showClear = pair !== null && status.kind !== 'solved';
  return (
    // Not a live region: moves are announced by the play screen, without repeating this line.
    <View style={styles.status}>
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
        numberOfLines={3}
        maxFontSizeMultiplier={1.4}
        style={styles.statusText}>
        {text}
      </AppText>
      {showClear && (
        <Pressable
          onPress={onClearPair}
          accessibilityRole="button"
          accessibilityLabel={t.a11y.clearPair}
          hitSlop={12}
          style={styles.clear}>
          <Ionicons name="close-circle" size={20} color={palette.textSecondary} />
        </Pressable>
      )}
    </View>
  );
}

function describeStatus(
  status: BoardStatus,
  wallMode: WallMode,
  pair: SelectedPair | null,
  solvedInMs: number | null,
  t: Strings,
): {
  text: string;
  tone: 'secondary' | 'accent' | 'success';
  icon: 'alert-circle' | 'checkmark-circle' | 'ban-outline' | 'lock-closed-outline' | 'search' | null;
} {
  // A pair picked in the tracker: say where it can go (the board shows it too).
  if (pair && status.kind !== 'solved') {
    const { label, slots } = pair;
    if (slots.placed.length > 0) return { text: t.status.pairPlaced(label), tone: 'success', icon: 'search' };
    if (slots.open.length === 0)
      return { text: t.status.pairNone(label), tone: 'accent', icon: 'alert-circle' };
    return { text: t.status.pairOpen(label, slots.open.length), tone: 'secondary', icon: 'search' };
  }
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
  subtitle: { flexDirection: 'row', alignItems: 'center' },
  clock: { fontVariant: ['tabular-nums'] },
  srOnly: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 },
  status: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  statusText: { textAlign: 'center', flexShrink: 1 },
  clear: { padding: 2 },
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
