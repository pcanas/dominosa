import { coveredCellCount, hasWall, isSolved, type GameAction, type GameState } from './game';

/** What a move did, so the UI can pick the right sound, vibration and announcement. */
export type MoveOutcome =
  'unchanged' | 'blocked' | 'placed' | 'removed' | 'wallAdded' | 'wallRemoved' | 'solved';

/** Classifies the move from `before` to `after` (the reducer's result for `action`). */
export function moveOutcome(before: GameState, after: GameState, action: GameAction): MoveOutcome {
  if (after === before) {
    return action.type === 'place' && hasWall(before, action.a, action.b) ? 'blocked' : 'unchanged';
  }
  // Only a placement can complete the board (undo never restores a solved one).
  if (action.type === 'place' && isSolved(after)) return 'solved';
  if (action.type === 'addWall' || action.type === 'addWalls') return 'wallAdded';
  if (action.type === 'removeWall') return 'wallRemoved';
  return action.type === 'place' || coveredCellCount(after) > coveredCellCount(before) ? 'placed' : 'removed';
}
