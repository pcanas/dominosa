export {
  canUndo,
  coveredCellCount,
  createGame,
  gameReducer,
  hasWall,
  isBlank,
  isSolved,
  MAX_UNDO,
  placedTiles,
  wallPairs,
  type Change,
  type EdgeIndex,
  type GameAction,
  type GameState,
  type PlacedTile,
} from './game';
export { findMistakes, hintAction, hintFocus, nextHint, type Hint, type Mistake } from './hint';
export {
  loadProgress,
  PROGRESS_VERSION,
  recordSolve,
  type LevelProgress,
  type ProgressMap,
} from './progress';
export {
  decodeBoard,
  MAX_SAVED_GAMES,
  restoreGame,
  sanitizeSavedGames,
  saveGame,
  withoutSavedGame,
  withSavedGame,
  type SavedGame,
  type SavedGames,
} from './saved-game';
export { moveOutcome, type MoveOutcome } from './outcome';
export { boardStatus, type BoardStatus } from './status';
export {
  TUTORIAL_STEPS,
  tutorialBoard,
  tutorialPlan,
  tutorialSteps,
  type TutorialPlan,
  type TutorialStep,
} from './tutorial';
export { pairSlots, trackPairs, type PairSlots, type TrackedPair } from './tracker';
