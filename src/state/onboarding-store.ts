import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ProgressMap, SavedGames } from '@/game';
import { appStorage } from '@/platform/storage';

import { useProgressStore } from './progress-store';
import { useSavedGamesStore } from './saved-games-store';

interface OnboardingStore {
  /** The tutorial was finished or skipped once. */
  readonly tutorialSeen: boolean;
  /** True once the stored value has loaded (or loading failed). */
  readonly ready: boolean;
  markTutorialSeen(): void;
}

/**
 * First-run state, persisted on the device. Hydration is manual
 * (`skipHydration`) like the other stores; the root layout calls `rehydrate()`.
 */
export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      tutorialSeen: false,
      ready: false,
      markTutorialSeen: () => set({ tutorialSeen: true }),
    }),
    {
      name: 'dominosa.onboarding',
      version: 1,
      storage: createJSONStorage(() => appStorage),
      partialize: (state) => ({ tutorialSeen: state.tutorialSeen }),
      merge: (stored, current) => ({
        ...current,
        tutorialSeen: (stored as { tutorialSeen?: unknown } | undefined)?.tutorialSeen === true,
      }),
      skipHydration: true,
      // Runs after loading, whether it worked or not.
      onRehydrateStorage: () => () => {
        useOnboardingStore.setState({ ready: true });
      },
    },
  ),
);

export interface FirstRun {
  /** The tutorial flag, progress and saved games have all loaded. */
  readonly loaded: boolean;
  readonly tutorialSeen: boolean;
  readonly progress: ProgressMap;
  readonly savedGames: SavedGames;
}

/**
 * Whether opening a level should first show the tutorial: never seen, and the
 * player has not played yet (people who played before it existed skip it; it
 * stays one tap away under "How to play").
 */
export function needsTutorial({ loaded, tutorialSeen, progress, savedGames }: FirstRun): boolean {
  return (
    loaded && !tutorialSeen && Object.keys(progress).length === 0 && Object.keys(savedGames).length === 0
  );
}

/** `needsTutorial` for what is stored right now: read when a level is tapped. */
export function tutorialDue(): boolean {
  const onboarding = useOnboardingStore.getState();
  const saved = useSavedGamesStore.getState();
  return needsTutorial({
    loaded: onboarding.ready && saved.ready && useProgressStore.persist.hasHydrated(),
    tutorialSeen: onboarding.tutorialSeen,
    progress: useProgressStore.getState().levels,
    savedGames: saved.games,
  });
}
