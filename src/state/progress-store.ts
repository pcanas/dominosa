import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { recordSolve, type ProgressMap } from '@/game';
import { appStorage } from '@/platform/storage';

interface ProgressStore {
  readonly levels: ProgressMap;
  recordSolve(levelId: string, elapsedMs: number): void;
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
      recordSolve: (levelId, elapsedMs) =>
        set((state) => ({ levels: recordSolve(state.levels, levelId, elapsedMs, new Date()) })),
    }),
    {
      name: 'dominosa.progress',
      version: 1,
      storage: createJSONStorage(() => appStorage),
      partialize: (state) => ({ levels: state.levels }),
      skipHydration: true,
    },
  ),
);
