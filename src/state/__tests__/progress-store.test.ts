import { beforeEach, describe, expect, it, vi } from 'vitest';

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
const { useProgressStore } = await import('../progress-store');

const KEY = 'dominosa.progress';
const entry = { bestMs: 42_000, timesSolved: 1, firstSolvedAt: '2026-10-01T10:00:00.000Z' };

describe('progress store', () => {
  beforeEach(() => {
    storageData.clear();
    useProgressStore.setState({ levels: {} });
  });

  it('upgrades progress saved before hints existed: every solve was perfect', async () => {
    storageData.set(KEY, JSON.stringify({ state: { levels: { 'intro-01': entry } }, version: 1 }));
    await useProgressStore.persist.rehydrate();
    expect(useProgressStore.getState().levels).toEqual({ 'intro-01': { ...entry, perfect: true } });
  });

  it('loads current progress as stored, dropping broken entries', async () => {
    const levels = { 'intro-01': { ...entry, perfect: false }, broken: { bestMs: 'x' } };
    storageData.set(KEY, JSON.stringify({ state: { levels }, version: 2 }));
    await useProgressStore.persist.rehydrate();
    expect(useProgressStore.getState().levels).toEqual({ 'intro-01': { ...entry, perfect: false } });
  });

  it('saves solves with the hints they used', () => {
    useProgressStore.getState().recordSolve('intro-01', 30_000, 1);
    const saved = JSON.parse(storageData.get(KEY)!) as {
      state: { levels: Record<string, unknown> };
      version: number;
    };
    expect(saved.version).toBe(2);
    expect(saved.state.levels['intro-01']).toMatchObject({ bestMs: 30_000, perfect: false });
  });
});
