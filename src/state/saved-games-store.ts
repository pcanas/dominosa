import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  sanitizeSavedGames,
  saveGame,
  withoutSavedGame,
  withSavedGame,
  type GameState,
  type SavedGames,
} from '@/game';
import { appStorage } from '@/platform/storage';

interface SavedGamesStore {
  /** Unsolved games, by level id. */
  readonly games: SavedGames;
  /**
   * True once stored games have been loaded (or loading failed). Nothing is
   * saved before that, so an early write can never wipe what is on disk.
   */
  readonly ready: boolean;
  save(levelId: string, game: GameState, elapsedMs: number): void;
  discard(levelId: string): void;
}

/**
 * Games in progress, persisted on the device so a level can be left and
 * resumed later, even after the app is closed.
 *
 * Hydration is manual (`skipHydration`), like the progress store; the root
 * layout calls `rehydrate()` on mount.
 */
export const useSavedGamesStore = create<SavedGamesStore>()(
  persist(
    (set, get) => ({
      games: {},
      ready: false,
      save: (levelId, game, elapsedMs) => {
        if (!get().ready) return;
        set((state) => ({
          games: withSavedGame(state.games, levelId, saveGame(game, elapsedMs, new Date())),
        }));
      },
      discard: (levelId) => {
        if (!get().ready) return;
        set((state) => ({ games: withoutSavedGame(state.games, levelId) }));
      },
    }),
    {
      name: 'dominosa.games',
      version: 1,
      storage: createJSONStorage(() => appStorage),
      partialize: (state) => ({ games: state.games }),
      merge: (stored, current) => ({
        ...current,
        games: sanitizeSavedGames((stored as { games?: unknown } | undefined)?.games),
      }),
      skipHydration: true,
      // Runs after loading, whether it worked or not.
      onRehydrateStorage: () => () => {
        useSavedGamesStore.setState({ ready: true });
      },
    },
  ),
);
