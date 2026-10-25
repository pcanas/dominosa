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
export { recordSolve, type LevelProgress, type ProgressMap } from './progress';
export {
  decodeBoard,
  encodeBoard,
  MAX_SAVED_GAMES,
  restoreGame,
  sanitizeSavedGames,
  saveGame,
  savedPlacedCount,
  withoutSavedGame,
  withSavedGame,
  type SavedGame,
  type SavedGames,
} from './saved-game';
export { boardStatus, type BoardStatus } from './status';
export { pairSlots, trackPairs, type PairSlots, type TrackedPair } from './tracker';
