import { create } from 'zustand';

import {
  coveredCellCount,
  createGame,
  gameReducer,
  hasWall,
  isBlank,
  isSolved,
  restoreGame,
  type GameAction,
  type GameState,
} from '@/game';
import type { Level } from '@/levels';

import { useProgressStore } from './progress-store';
import { useSavedGamesStore } from './saved-games-store';

/** What a dispatched action did, so the UI can pick the right feedback. */
export type DispatchOutcome = 'unchanged' | 'blocked' | 'placed' | 'removed' | 'wall' | 'solved';

interface SessionStore {
  readonly levelId: string | null;
  readonly game: GameState | null;
  /** Time played before the clock last started. */
  readonly elapsedMs: number;
  /** Epoch ms when the clock last started, or null while it is stopped. */
  readonly runningSince: number | null;
  /** Time taken, set once the board is solved. */
  readonly solvedInMs: number | null;
  /**
   * Opens a level: resumes it if it is the unsolved level already open,
   * otherwise restores its saved game or starts a new one. Starts the clock.
   * Call it once saved games are loaded (`useSavedGamesStore().ready`).
   */
  open(level: Level): void;
  /** Stops the clock and saves the game (app in the background, screen left). */
  pause(): void;
  /** Restarts the clock after a pause. */
  resume(): void;
  /** Pauses and saves; a solved level is discarded, so coming back starts a fresh board. */
  leave(levelId: string): void;
  dispatch(action: GameAction): DispatchOutcome;
}

const EMPTY = { levelId: null, game: null, elapsedMs: 0, runningSince: null, solvedInMs: null } as const;

/** Time played in the current attempt. */
export function elapsedNow(
  state: Pick<SessionStore, 'elapsedMs' | 'runningSince'>,
  now: number = Date.now(),
): number {
  return state.elapsedMs + (state.runningSince === null ? 0 : Math.max(0, now - state.runningSince));
}

/** The game currently being played. Unsolved games are saved on every change and on pause. */
export const useSessionStore = create<SessionStore>()((set, get) => {
  /** Writes the current game to the saved games (or drops it when there is nothing worth keeping). */
  const persist = () => {
    const { levelId, game } = get();
    if (!levelId || !game) return;
    const saved = useSavedGamesStore.getState();
    if (isSolved(game) || (isBlank(game) && game.past.length === 0)) saved.discard(levelId);
    else saved.save(levelId, game, elapsedNow(get()));
  };

  return {
    ...EMPTY,

    open: (level) => {
      const { levelId, game } = get();
      if (levelId === level.id && game && !isSolved(game)) {
        get().resume();
        return;
      }
      get().pause();

      const saved = useSavedGamesStore.getState().games[level.id];
      const restored = saved ? restoreGame(level.puzzle, saved) : null;
      if (saved && !restored) useSavedGamesStore.getState().discard(level.id);
      set({
        levelId: level.id,
        game: restored?.game ?? createGame(level.puzzle),
        elapsedMs: restored?.elapsedMs ?? 0,
        runningSince: Date.now(),
        solvedInMs: null,
      });
    },

    pause: () => {
      const state = get();
      if (state.runningSince === null) return;
      set({ elapsedMs: elapsedNow(state), runningSince: null });
      persist();
    },

    resume: () => {
      const { game, runningSince } = get();
      if (game && !isSolved(game) && runningSince === null) set({ runningSince: Date.now() });
    },

    leave: (levelId) => {
      const { levelId: current, game } = get();
      if (current !== levelId || !game) return;
      if (isSolved(game)) set(EMPTY);
      else get().pause();
    },

    dispatch: (action) => {
      const { game, levelId } = get();
      if (!game || !levelId) return 'unchanged';
      const next = gameReducer(game, action);
      if (next === game) {
        return action.type === 'place' && hasWall(game, action.a, action.b) ? 'blocked' : 'unchanged';
      }

      // Only a placement can complete the board (undo never restores a solved one).
      if (action.type === 'place' && isSolved(next)) {
        const solvedInMs = elapsedNow(get());
        set({ game: next, solvedInMs, elapsedMs: solvedInMs, runningSince: null });
        useProgressStore.getState().recordSolve(levelId, solvedInMs);
        useSavedGamesStore.getState().discard(levelId);
        return 'solved';
      }

      if (action.type === 'reset' && isSolved(game)) {
        // Replaying a solved board starts a new, timed attempt.
        set({ game: next, elapsedMs: 0, runningSince: Date.now(), solvedInMs: null });
      } else {
        // Playing while paused (e.g. a missed "app active" event) restarts the clock.
        set(get().runningSince === null ? { game: next, runningSince: Date.now() } : { game: next });
      }
      persist();

      if (action.type === 'toggleWall') return 'wall';
      return action.type === 'place' || coveredCellCount(next) > coveredCellCount(game)
        ? 'placed'
        : 'removed';
    },
  };
});
