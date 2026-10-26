import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useState } from 'react';
import { AppState, StyleSheet, View, type AppStateStatus } from 'react-native';

import { dominoId, type CellIndex, type DominoId } from '@/core';
import {
  boardStatus,
  canUndo,
  createGame,
  hasWall,
  hintAction,
  isBlank,
  isSolved,
  nextHint,
  pairSlots,
  placedTiles,
  trackPairs,
  wallPairs,
  type GameAction,
  type GameState,
  type Hint,
} from '@/game';
import { useStrings } from '@/i18n';
import { getLevel, LEVELS, nextLevel, type Level } from '@/levels';
import { useScreenReader } from '@/platform/screen-reader';
import { sound } from '@/platform/sound';
import { useSavedGamesStore } from '@/state/saved-games-store';
import { useSessionStore } from '@/state/session-store';
import { useSettingsStore } from '@/state/settings-store';
import { announcementFor, cellActions, describeCells } from '@/ui/board/a11y';
import { Board } from '@/ui/board/Board';
import { WAVE_TURN_MS, waveEnd } from '@/ui/board/celebration';
import { hintHighlight } from '@/ui/board/hint-marks';
import { canShowPips } from '@/ui/board/pips';
import { pickCell } from '@/ui/board/tap-select';
import { afterWallDrawn, WALL_BUTTON_OFF, type WallButton } from '@/ui/board/wall-mode';
import { AppText } from '@/ui/components/AppText';
import { IconButton } from '@/ui/components/IconButton';
import { LiveRegion, useAnnouncer } from '@/ui/components/LiveRegion';
import { NotFound } from '@/ui/components/NotFound';
import { Screen } from '@/ui/components/Screen';
import { TopBar } from '@/ui/components/TopBar';
import { Clock } from '@/ui/play/Clock';
import { moveFeedback } from '@/ui/play/feedback';
import { describeHint, hintKey, type HintStage } from '@/ui/play/hint-text';
import { HintSheet } from '@/ui/play/HintSheet';
import { SolvedCard } from '@/ui/play/SolvedCard';
import { describeSolve, pairLabel, pairStatus } from '@/ui/play/status';
import { StatusLine } from '@/ui/play/StatusLine';
import { WallToggle } from '@/ui/play/WallToggle';
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

function PlayScreen({ level }: { readonly level: Level }) {
  const t = useStrings();
  const open = useSessionStore((s) => s.open);
  const dispatch = useSessionStore((s) => s.dispatch);
  const recordHint = useSessionStore((s) => s.recordHint);
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
  const soundOn = useSettingsStore((s) => s.sound);
  const numberStyle = useSettingsStore((s) => s.numberStyle);
  /** Cell of the domino that solved the board, where the solve wave starts. */
  const [celebrateFrom, setCelebrateFrom] = useState<CellIndex | null>(null);
  const screenReaderOn = useScreenReader();
  /** Cell picked first while playing with a screen reader. */
  const [pickedCell, setPickedCell] = useState<CellIndex | null>(null);
  const selectedCell = screenReaderOn ? pickedCell : null;
  const { announcement, say } = useAnnouncer();
  /** The hint on screen, for the board it was asked on: any move closes it. */
  const [hintState, setHintState] = useState<{
    readonly hint: Hint;
    readonly stage: HintStage;
    readonly game: GameState;
  } | null>(null);

  useEffect(() => {
    if (!savedGamesReady) return;
    open(level);
    return () => leave(level.id);
  }, [level, savedGamesReady, open, leave]);

  // Load the sounds before the first move needs them.
  useEffect(() => {
    if (soundOn) sound.prepare();
  }, [soundOn]);

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
  const activeHint = hintState && hintState.game === game && !solved ? hintState : null;
  const hintView = activeHint
    ? describeHint(activeHint.hint, activeHint.stage, game, t, { pickMode: screenReaderOn })
    : null;
  // A hint's domino slot or wrong domino shows like a pair picked in the tracker.
  const highlight = hintView ? hintHighlight(hintView.marks) : (pair?.slots ?? null);
  const packName = t.packs[level.packId] ?? level.packId;
  const descriptions = describeCells(game, selectedCell, t);
  const pips = numberStyle === 'pips' && canShowPips(order);
  const tiles = placedTiles(game);

  const act = (action: GameAction) => {
    const outcome = dispatch(action);
    moveFeedback(outcome, { sound: soundOn, vibration });
    const after = useSessionStore.getState();
    if (after.game) {
      const summary = describeSolve(after.solvedInMs ?? 0, after.bestBeforeMs, after.hintsUsed, t);
      const solvedText = summary.detail ? `${summary.title} ${summary.detail}` : summary.title;
      const message = announcementFor(action, outcome, after.game, t, solvedText);
      if (message) say(message);
    }
    // A single-use wall mode ends with the wall it was armed for; a solve ends any mode.
    if (outcome === 'wallAdded') setWallButton(afterWallDrawn);
    if (outcome === 'solved') {
      setWallButton(WALL_BUTTON_OFF);
      setTrackerOpen(false);
      setSelectedPair(null);
      if (action.type === 'place') setCelebrateFrom(action.a);
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

  /** "Hint": the first tap shows where to look (or that there is a mistake). */
  const onHint = () => {
    const hint = nextHint(game, level.solution);
    if (!hint) return;
    recordHint();
    setTrackerOpen(false);
    setSelectedPair(null);
    setHintState({ hint, stage: 1, game });
    if (soundOn) sound.hint();
    say(describeHint(hint, 1, game, t, { pickMode: screenReaderOn }).spoken);
  };

  /** The sheet's button: "Why?" explains, then "Do it" makes the move (one step to undo). */
  const onHintNext = () => {
    if (!activeHint) return;
    if (activeHint.stage === 1) {
      setHintState({ ...activeHint, stage: 2 });
      say(describeHint(activeHint.hint, 2, game, t, { pickMode: screenReaderOn }).spoken);
      return;
    }
    setHintState(null);
    act(hintAction(activeHint.hint));
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

      {solved && session?.solvedInMs != null ? (
        <SolvedCard
          summary={describeSolve(session.solvedInMs, session.bestBeforeMs, session.hintsUsed, t)}
          // Shows up as the solve wave settles.
          delay={
            celebrateFrom === null ? 0 : waveEnd(tiles, celebrateFrom, level.puzzle.cols) - WAVE_TURN_MS / 2
          }
        />
      ) : (
        <StatusLine
          status={boardStatus(game)}
          wallMode={wallButton.mode}
          pickMode={screenReaderOn}
          pair={pair}
          onClearPair={() => setSelectedPair(null)}
          solvedInMs={session?.solvedInMs ?? null}
        />
      )}

      <Board
        puzzle={level.puzzle}
        tiles={tiles}
        walls={wallPairs(game)}
        solved={solved}
        tool={wallButton.mode === 'off' ? 'domino' : 'wall'}
        onAction={act}
        highlight={highlight}
        hint={hintView?.marks ?? null}
        descriptions={descriptions}
        pips={pips}
        celebrateFrom={celebrateFrom}
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
              compact
            />
            <WallToggle state={wallButton} onChange={setWallButton} say={say} />
            <IconButton
              icon="grid-outline"
              label={t.actions.pairs}
              onPress={() => {
                setHintState(null);
                setTrackerOpen((isOpen) => !isOpen);
              }}
              selected={trackerOpen}
              showLabel
              compact
            />
            <IconButton icon="bulb-outline" label={t.actions.hint} onPress={onHint} showLabel compact />
            <IconButton
              icon="refresh"
              label={confirmingReset ? t.actions.confirmReset : t.actions.reset}
              onPress={onReset}
              // Nothing on the board: a reset would not change anything.
              disabled={isBlank(game)}
              tone={confirmingReset ? 'accent' : 'default'}
              showLabel
              compact
            />
          </>
        )}
      </View>

      <LiveRegion announcement={announcement} />

      {hintView && activeHint && (
        <HintSheet
          // A new sheet (and its slide-in) for each new hint, not for each step of one.
          key={hintKey(activeHint.hint)}
          view={hintView}
          mistake={activeHint.hint.kind === 'mistake'}
          onNext={onHintNext}
          onClose={() => setHintState(null)}
        />
      )}

      {trackerOpen && !solved && (
        <PairTracker
          order={order}
          pairs={trackPairs(game)}
          selected={selectedPair}
          onSelect={onSelectPair}
          onClose={() => setTrackerOpen(false)}
          pips={pips}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: { flexDirection: 'row', alignItems: 'center' },
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
