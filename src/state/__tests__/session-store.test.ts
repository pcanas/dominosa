import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LEVELS } from '@/levels';

// Keep persistence in memory: the real adapter pulls in React Native.
vi.mock('@/platform/storage', () => {
  const data = new Map<string, string>();
  return {
    appStorage: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
      removeItem: (key: string) => void data.delete(key),
    },
  };
});

const { useSessionStore } = await import('../session-store');
const { useProgressStore } = await import('../progress-store');

const level = LEVELS[0]!;
const pairs = level.solution.flatMap((b, a) => (a < b ? [{ a, b }] : []));

function solveAll() {
  const { dispatch } = useSessionStore.getState();
  return pairs.map(({ a, b }) => dispatch({ type: 'place', a, b }));
}

describe('session store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-27T10:00:00Z'));
    useProgressStore.setState({ levels: {} });
    useSessionStore.setState({ levelId: null, game: null, startedAt: 0, solvedInMs: null });
  });

  it('records a solve with its time', () => {
    useSessionStore.getState().open(level);
    vi.advanceTimersByTime(42_000);
    const outcomes = solveAll();
    expect(outcomes.at(-1)).toBe('solved');
    expect(outcomes.slice(0, -1).every((o) => o === 'placed')).toBe(true);
    expect(useSessionStore.getState().solvedInMs).toBe(42_000);
    expect(useProgressStore.getState().levels[level.id]).toMatchObject({ bestMs: 42_000, timesSolved: 1 });
  });

  it('does not record a fake solve after replay + undo', () => {
    useSessionStore.getState().open(level);
    vi.advanceTimersByTime(60_000);
    solveAll();
    const { dispatch } = useSessionStore.getState();
    expect(dispatch({ type: 'reset' })).toBe('removed');
    expect(useSessionStore.getState().solvedInMs).toBeNull();
    expect(dispatch({ type: 'undo' })).toBe('unchanged');
    expect(useProgressStore.getState().levels[level.id]).toMatchObject({ bestMs: 60_000, timesSolved: 1 });
  });

  it('resumes an unsolved level and starts fresh after leaving a solved one', () => {
    const store = useSessionStore.getState();
    store.open(level);
    store.dispatch({ type: 'place', a: pairs[0]!.a, b: pairs[0]!.b });
    store.open(level);
    expect(useSessionStore.getState().game?.past).toHaveLength(1);

    solveAll();
    useSessionStore.getState().leave(level.id);
    useSessionStore.getState().open(level);
    expect(useSessionStore.getState().game?.partner.every((p) => p === -1)).toBe(true);
  });
});
