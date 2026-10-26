import { describe, expect, it, vi } from 'vitest';

import type { LevelProgress, SavedGame } from '@/game';

// Keep persistence in memory: the real adapter pulls in React Native.
vi.mock('@/platform/storage', () => {
  const data = new Map<string, string>();
  return {
    storageData: data,
    appStorage: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
      removeItem: (key: string) => void data.delete(key),
    },
  };
});

const { storageData } = (await import('@/platform/storage')) as unknown as {
  storageData: Map<string, string>;
};
const { needsTutorial, tutorialDue, useOnboardingStore } = await import('../onboarding-store');
const { useProgressStore } = await import('../progress-store');
const { useSavedGamesStore } = await import('../saved-games-store');

const solve: LevelProgress = {
  bestMs: 1,
  timesSolved: 1,
  firstSolvedAt: '2026-10-01T00:00:00Z',
  perfect: true,
};

describe('needsTutorial', () => {
  const fresh = { loaded: true, tutorialSeen: false, progress: {}, savedGames: {} };

  it('shows the tutorial to a new player only', () => {
    expect(needsTutorial(fresh)).toBe(true);
    expect(needsTutorial({ ...fresh, tutorialSeen: true })).toBe(false);
    expect(needsTutorial({ ...fresh, progress: { 'intro-01': solve } })).toBe(false);
    expect(needsTutorial({ ...fresh, savedGames: { 'intro-02': {} as SavedGame } })).toBe(false);
  });

  it('waits until everything stored has loaded', () => {
    expect(needsTutorial({ ...fresh, loaded: false })).toBe(false);
  });
});

describe('tutorialDue', () => {
  it('reads the stores once they have all loaded', async () => {
    // Nothing loaded yet: an existing player's progress could still be on its way.
    expect(tutorialDue()).toBe(false);
    await useOnboardingStore.persist.rehydrate();
    await useSavedGamesStore.persist.rehydrate();
    expect(tutorialDue()).toBe(false);
    await useProgressStore.persist.rehydrate();
    expect(tutorialDue()).toBe(true);

    useProgressStore.getState().recordSolve('intro-01', 1000);
    expect(tutorialDue()).toBe(false);
    useProgressStore.setState({ levels: {} });
    useOnboardingStore.getState().markTutorialSeen();
    expect(tutorialDue()).toBe(false);
  });
});

describe('onboarding store', () => {
  it('remembers that the tutorial was seen', async () => {
    useOnboardingStore.getState().markTutorialSeen();
    const stored = storageData.get('dominosa.onboarding')!;
    expect(JSON.parse(stored)).toMatchObject({ state: { tutorialSeen: true } });

    // A fresh start: the in-memory state is gone (resetting it writes too, so put the save back).
    useOnboardingStore.setState({ tutorialSeen: false, ready: false });
    storageData.set('dominosa.onboarding', stored);
    await useOnboardingStore.persist.rehydrate();
    expect(useOnboardingStore.getState()).toMatchObject({ tutorialSeen: true, ready: true });
  });
});
