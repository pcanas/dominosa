import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { loadProgress, PROGRESS_VERSION, recordSolve, type ProgressMap } from '@/game';
import { appStorage } from '@/platform/storage';

interface ProgressStore {
  readonly levels: ProgressMap;
  /** True once stored progress has loaded (or loading failed). */
  readonly ready: boolean;
  /** Records a solve that took `elapsedMs` and used `hints` hints. */
  recordSolve(levelId: string, elapsedMs: number, hints?: number): void;
}

/**
 * Solved levels and best times, persisted on the device.
 *
 * Hydration is manual (`skipHydration`) so the pre-rendered web HTML and the
 * first client render agree; the root layout calls `rehydrate()` on mount.
 */
export const useProgressStore = create<ProgressStore>()(
  persist(
    (set) => ({
      levels: {},
      ready: false,
      recordSolve: (levelId, elapsedMs, hints = 0) =>
        set((state) => ({ levels: recordSolve(state.levels, levelId, elapsedMs, new Date(), hints) })),
    }),
    {
      name: 'dominosa.progress',
      version: PROGRESS_VERSION,
      storage: createJSONStorage(() => appStorage),
      partialize: (state) => ({ levels: state.levels }),
      // Version 1 had no hints: its solves become perfect ones.
      migrate: (stored, version) => ({
        levels: loadProgress((stored as { levels?: unknown } | null)?.levels, version),
      }),
      merge: (stored, current) => ({
        ...current,
        levels: loadProgress((stored as { levels?: unknown } | undefined)?.levels, PROGRESS_VERSION),
      }),
      skipHydration: true,
      // Runs after loading, whether it worked or not.
      onRehydrateStorage: () => () => {
        useProgressStore.setState({ ready: true });
      },
    },
  ),
);
