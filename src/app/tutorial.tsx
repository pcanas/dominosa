import { router, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { CellIndex } from '@/core';
import {
  canUndo,
  gameReducer,
  hasWall,
  hintAction,
  isSolved,
  moveOutcome,
  nextHint,
  placedTiles,
  TUTORIAL_STEPS,
  tutorialBoard,
  tutorialPlan,
  wallPairs,
  type GameAction,
  type GameState,
  type Hint,
  type TutorialStep,
} from '@/game';
import { useStrings } from '@/i18n';
import { getLevel, TUTORIAL_LEVEL, type Level } from '@/levels';
import { haptics } from '@/platform/haptics';
import { useScreenReader } from '@/platform/screen-reader';
import { sound } from '@/platform/sound';
import { useHydrated } from '@/platform/use-hydrated';
import { useOnboardingStore } from '@/state/onboarding-store';
import { useSettingsStore } from '@/state/settings-store';
import { announcementFor, cellActions, describeCells } from '@/ui/board/a11y';
import { Board } from '@/ui/board/Board';
import { hintHighlight, NO_HINT_MARKS } from '@/ui/board/hint-marks';
import { canShowPips } from '@/ui/board/pips';
import { pickCell } from '@/ui/board/tap-select';
import { afterWallDrawn, WALL_BUTTON_OFF, type WallButton } from '@/ui/board/wall-mode';
import { AppText } from '@/ui/components/AppText';
import { IconButton } from '@/ui/components/IconButton';
import { LiveRegion, useAnnouncer } from '@/ui/components/LiveRegion';
import { Screen } from '@/ui/components/Screen';
import { TopBar } from '@/ui/components/TopBar';
import { moveFeedback } from '@/ui/play/feedback';
import { describeHint, hintKey, type HintStage } from '@/ui/play/hint-text';
import { HintSheet } from '@/ui/play/HintSheet';
import { WallToggle } from '@/ui/play/WallToggle';
import { radius, spacing, useTheme } from '@/ui/theme';
import {
  coachMarks,
  coachMessage,
  isExpected,
  stepNumber,
  TUTORIAL_STEP_COUNT,
  type CoachMessage,
  type CoachStep,
} from '@/ui/tutorial/coach';
import { CoachCard, type CoachTone } from '@/ui/tutorial/CoachCard';

const { puzzle, solution } = TUTORIAL_LEVEL;
/** The tutorial board is generated so that its script works (the level test checks it). */
const PLAN = tutorialPlan(puzzle, solution)!;

/** After a guided move, "Nice!" stays this long before the next step. */
const NEXT_STEP_MS = 700;

/**
 * "How to play": a guided game on a small board of its own (see `src/game/tutorial.ts`).
 * Opened before the first level a new player taps, with `then` set to that level,
 * and from "How to play" on the home and settings screens.
 */
export default function TutorialScreen() {
  const t = useStrings();
  const { palette } = useTheme();
  const hydrated = useHydrated();
  const params = useLocalSearchParams<{ then?: string }>();
  // The static page has no query string: the level to play next is only read once hydrated.
  const then = hydrated && params.then ? getLevel(params.then) : undefined;
  const onboardingReady = useOnboardingStore((s) => s.ready);
  const markTutorialSeen = useOnboardingStore((s) => s.markTutorialSeen);
  const soundOn = useSettingsStore((s) => s.sound);
  const vibration = useSettingsStore((s) => s.vibration);
  const numberStyle = useSettingsStore((s) => s.numberStyle);
  const screenReaderOn = useScreenReader();
  const { announcement, say } = useAnnouncer();

  const [step, setStep] = useState<CoachStep>('place');
  const [game, setGame] = useState<GameState>(() => tutorialBoard(puzzle, PLAN, 'place'));
  /** The step's move was made: "Nice!" shows until the next step starts. */
  const [advancing, setAdvancing] = useState(false);
  /** The player tried another move: the card says again what the step needs. */
  const [nudge, setNudge] = useState(false);
  const [wallButton, setWallButton] = useState<WallButton>(WALL_BUTTON_OFF);
  const [hintState, setHintState] = useState<{
    readonly hint: Hint;
    readonly stage: HintStage;
    readonly game: GameState;
  } | null>(null);
  /** Cell picked first while playing with a screen reader. */
  const [pickedCell, setPickedCell] = useState<CellIndex | null>(null);
  /** Cell of the domino that solved the board, where the solve wave starts. */
  const [celebrateFrom, setCelebrateFrom] = useState<CellIndex | null>(null);
  const nextStepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Opened once is enough: opening a level does not offer it again (it stays under "How to play").
  useEffect(() => {
    if (onboardingReady) markTutorialSeen();
  }, [onboardingReady, markTutorialSeen]);

  useEffect(() => {
    if (soundOn) sound.prepare();
  }, [soundOn]);

  useEffect(
    () => () => {
      if (nextStepTimer.current) clearTimeout(nextStepTimer.current);
    },
    [],
  );

  const pickMode = screenReaderOn;
  const selectedCell = pickMode ? pickedCell : null;
  const solved = isSolved(game);
  const activeHint = hintState && hintState.game === game && !solved ? hintState : null;
  const hintView = activeHint ? describeHint(activeHint.hint, activeHint.stage, game, t, { pickMode }) : null;
  const marks = hintView?.marks ?? (advancing ? NO_HINT_MARKS : coachMarks(step, PLAN));
  const descriptions = describeCells(game, selectedCell, t);
  const pips = numberStyle === 'pips' && canShowPips(puzzle.order);
  const guided = (current: CoachStep) => step === current && !advancing;

  const good: CoachMessage = { text: t.tutorial.good, spoken: t.tutorial.good };
  const message = advancing ? good : coachMessage(step, PLAN, puzzle, t, { pickMode, nudge });
  const tone: CoachTone = advancing ? 'good' : step === 'done' ? 'done' : nudge ? 'nudge' : 'step';
  // Every instruction and nudge, so the card keeps one height all along.
  const candidates = [
    ...new Set(
      TUTORIAL_STEPS.flatMap((s) =>
        [false, true].map((n) => coachMessage(s, PLAN, puzzle, t, { pickMode, nudge: n }).text),
      ),
    ),
  ];

  /** Makes a move on the board, with its sound and vibration. */
  const play = (action: GameAction) => {
    const after = gameReducer(game, action);
    const outcome = moveOutcome(game, after, action);
    moveFeedback(outcome, { sound: soundOn, vibration });
    setGame(after);
    if (outcome === 'wallAdded') setWallButton(afterWallDrawn);
    return { after, outcome };
  };

  /** The step's move is done: "Nice!", then the next step's board and instruction. */
  const advance = (from: TutorialStep) => {
    const next = TUTORIAL_STEPS[TUTORIAL_STEPS.indexOf(from) + 1]!;
    setAdvancing(true);
    setNudge(false);
    setWallButton(WALL_BUTTON_OFF);
    setPickedCell(null);
    say(t.tutorial.good);
    nextStepTimer.current = setTimeout(() => {
      setStep(next);
      // Undo starts afresh on each step; on the second one, the coach puts the repeated domino down.
      setGame(tutorialBoard(puzzle, PLAN, next));
      setAdvancing(false);
      if (next === 'remove' && soundOn) sound.place();
      say(coachMessage(next, PLAN, puzzle, t, { pickMode, nudge: false }).spoken);
    }, NEXT_STEP_MS);
  };

  /** Every move made on the board. Guided steps only take the move they ask for. */
  const act = (action: GameAction) => {
    if (advancing || step === 'done') return;
    if (!isExpected(step, PLAN, action)) {
      setNudge(true);
      if (vibration) haptics.blocked();
      say(coachMessage(step, PLAN, puzzle, t, { pickMode, nudge: true }).spoken);
      return;
    }
    const { after, outcome } = play(action);
    if (step !== 'finish') {
      advance(step);
      return;
    }
    if (outcome === 'solved') {
      setStep('done');
      setWallButton(WALL_BUTTON_OFF);
      if (action.type === 'place') setCelebrateFrom(action.a);
      say(t.tutorial.done);
      return;
    }
    const spoken = announcementFor(action, outcome, after, t, t.tutorial.done);
    if (spoken) say(spoken);
  };

  /** A cell picked while playing with a screen reader. */
  const onPickCell = (cell: CellIndex) => {
    const { selected, action } = pickCell(selectedCell, cell, {
      cols: puzzle.cols,
      partnerOf: (c) => game.partner[c] ?? -1,
      hasWall: (a, b) => hasWall(game, a, b),
      wallMode: wallButton.mode !== 'off',
    });
    setPickedCell(selected);
    if (action) act(action);
    else if (selected !== null) say(t.announce.selected(descriptions[selected]!));
    else say(t.announce.deselected);
  };

  const onHint = () => {
    const hint = nextHint(game, solution);
    if (!hint) return;
    setNudge(false);
    setHintState({ hint, stage: 1, game });
    if (soundOn) sound.hint();
    say(describeHint(hint, 1, game, t, { pickMode }).spoken);
  };

  /** The sheet's button: "Why?", then "Do it". On the hint step, doing it is the step's move. */
  const onHintNext = () => {
    if (!activeHint) return;
    if (activeHint.stage === 1) {
      setHintState({ ...activeHint, stage: 2 });
      say(describeHint(activeHint.hint, 2, game, t, { pickMode }).spoken);
      return;
    }
    setHintState(null);
    const action = hintAction(activeHint.hint);
    if (step === 'hint') {
      play(action);
      advance('hint');
    } else {
      act(action);
    }
  };

  const playLevel = (level: Level) =>
    router.replace({ pathname: '/play/[levelId]', params: { levelId: level.id } });
  const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <Screen gutter={spacing.sm}>
      <Head>
        <title>{`${t.tutorial.title} · ${t.appName}`}</title>
      </Head>
      <TopBar
        backTo={then ? { pathname: '/pack/[packId]', params: { packId: then.packId } } : '/'}
        right={
          then && step !== 'done' ? (
            <Pressable
              onPress={() => playLevel(then)}
              accessibilityRole="button"
              hitSlop={6}
              style={({ pressed }) => [styles.skip, pressed && { backgroundColor: palette.surfacePressed }]}>
              <AppText variant="label" tone="secondary" maxFontSizeMultiplier={1.3}>
                {t.tutorial.skip}
              </AppText>
            </Pressable>
          ) : undefined
        }>
        <AppText variant="heading" accessibilityRole="header">
          {t.tutorial.title}
        </AppText>
      </TopBar>

      <View style={styles.coach}>
        <CoachCard
          caption={t.tutorial.stepOf(stepNumber(step) ?? TUTORIAL_STEP_COUNT, TUTORIAL_STEP_COUNT)}
          message={message}
          tone={tone}
          candidates={candidates}
        />
      </View>

      <Board
        puzzle={puzzle}
        tiles={placedTiles(game)}
        walls={wallPairs(game)}
        solved={solved}
        tool={wallButton.mode === 'off' ? 'domino' : 'wall'}
        onAction={act}
        highlight={hintHighlight(marks)}
        hint={marks}
        descriptions={descriptions}
        pips={pips}
        celebrateFrom={celebrateFrom}
        screenReader={
          pickMode
            ? {
                selected: selectedCell,
                onPick: onPickCell,
                actionsFor: (cell: CellIndex) => cellActions(game, cell, t),
              }
            : null
        }
      />

      <View style={[styles.toolbar, step === 'done' && styles.toolbarDone]}>
        {step === 'done' ? (
          <IconButton
            icon={then ? 'arrow-forward' : 'arrow-back'}
            label={then ? t.tutorial.play : t.tutorial.back}
            onPress={() => (then ? playLevel(then) : leave())}
            showLabel
            tone="primary"
          />
        ) : (
          <>
            <IconButton
              icon="arrow-undo"
              label={t.actions.undo}
              onPress={() => act({ type: 'undo' })}
              disabled={!guided('finish') || !canUndo(game)}
              showLabel
              compact
            />
            <WallToggle
              state={wallButton}
              onChange={setWallButton}
              say={say}
              disabled={!guided('wall') && !guided('finish')}
              tone={guided('wall') ? 'accent' : 'default'}
            />
            <IconButton
              icon="bulb-outline"
              label={t.actions.hint}
              onPress={onHint}
              disabled={!guided('hint') && !guided('finish')}
              tone={guided('hint') ? 'accent' : 'default'}
              showLabel
              compact
            />
          </>
        )}
      </View>

      <LiveRegion announcement={announcement} />

      {hintView && activeHint && (
        <HintSheet
          key={hintKey(activeHint.hint)}
          view={hintView}
          mistake={activeHint.hint.kind === 'mistake'}
          onNext={onHintNext}
          onClose={() => setHintState(null)}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  coach: { paddingTop: spacing.md, paddingBottom: spacing.sm },
  skip: {
    minWidth: 64,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  toolbarDone: { justifyContent: 'center' },
});
