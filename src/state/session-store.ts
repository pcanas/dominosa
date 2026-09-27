import { create } from 'zustand';

import { coveredCellCount, createGame, gameReducer, isSolved, type GameAction, type GameState } from '@/game';
import type { Level } from '@/levels';

import { useProgressStore } from './progress-store';

/** What a dispatched action did, so the UI can pick the right feedback. */
export type DispatchOutcome = 'unchanged' | 'placed' | 'removed' | 'solved';

interface SessionStore {
  readonly levelId: string | null;
  readonly game: GameState | null;
  /** Epoch ms when the current attempt started. */
  readonly startedAt: number;
  /** Time taken, set once the board is solved. */
  readonly solvedInMs: number | null;
  /** Opens a level, resuming it if it is the unsolved level already open. */
  open(level: Level): void;
  dispatch(action: GameAction): DispatchOutcome;
}

/** The game currently being played. Not persisted yet (planned for Hito 1). */
export const useSessionStore = create<SessionStore>()((set, get) => ({
  levelId: null,
  game: null,
  startedAt: 0,
  solvedInMs: null,

  open: (level) => {
    const { levelId, game } = get();
    if (levelId === level.id && game && !isSolved(game)) return;
    set({ levelId: level.id, game: createGame(level.puzzle), startedAt: Date.now(), solvedInMs: null });
  },

  dispatch: (action) => {
    const { game, levelId, startedAt } = get();
    if (!game || !levelId) return 'unchanged';
    const next = gameReducer(game, action);
    if (next === game) return 'unchanged';

    if (isSolved(next)) {
      const solvedInMs = Date.now() - startedAt;
      set({ game: next, solvedInMs });
      useProgressStore.getState().recordSolve(levelId, solvedInMs);
      return 'solved';
    }

    // Resetting a solved board starts a new attempt.
    const restarted = action.type === 'reset' && isSolved(game);
    set(restarted ? { game: next, startedAt: Date.now(), solvedInMs: null } : { game: next });
    return action.type === 'place' || coveredCellCount(next) > coveredCellCount(game) ? 'placed' : 'removed';
  },
}));
