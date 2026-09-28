import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LEVELS } from '@/levels';

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
const { elapsedNow, useSessionStore } = await import('../session-store');
const { useProgressStore } = await import('../progress-store');
const { useSavedGamesStore } = await import('../saved-games-store');

const level = LEVELS[0]!;
const otherLevel = LEVELS[1]!;
const pairs = level.solution.flatMap((b, a) => (a < b ? [{ a, b }] : []));
const first = pairs[0]!;

function solveAll() {
  const { dispatch } = useSessionStore.getState();
  return pairs.map(({ a, b }) => dispatch({ type: 'place', a, b }));
}

/** Forgets the in-memory session, as when the app is closed and opened again. */
function restartApp() {
  useSessionStore.setState({ levelId: null, game: null, elapsedMs: 0, runningSince: null, solvedInMs: null });
}

const session = () => useSessionStore.getState();
const savedGame = (id = level.id) => useSavedGamesStore.getState().games[id];

describe('session store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-27T10:00:00Z'));
    storageData.clear();
    useProgressStore.setState({ levels: {} });
    useSavedGamesStore.setState({ games: {}, ready: true });
    restartApp();
  });

  it('records a solve with its time', () => {
    session().open(level);
    vi.advanceTimersByTime(42_000);
    const outcomes = solveAll();
    expect(outcomes.at(-1)).toBe('solved');
    expect(outcomes.slice(0, -1).every((o) => o === 'placed')).toBe(true);
    expect(session().solvedInMs).toBe(42_000);
    expect(useProgressStore.getState().levels[level.id]).toMatchObject({ bestMs: 42_000, timesSolved: 1 });
  });

  it('does not count paused time', () => {
    session().open(level);
    vi.advanceTimersByTime(10_000);
    session().pause();
    vi.advanceTimersByTime(600_000);
    expect(elapsedNow(session())).toBe(10_000);
    session().resume();
    vi.advanceTimersByTime(5_000);
    solveAll();
    expect(session().solvedInMs).toBe(15_000);
  });

  it('restarts a stopped clock when the player makes a move', () => {
    session().open(level);
    session().pause();
    vi.advanceTimersByTime(60_000);
    session().dispatch({ type: 'place', a: first.a, b: first.b });
    vi.advanceTimersByTime(3_000);
    expect(elapsedNow(session())).toBe(3_000);
  });

  it('does not record a fake solve after replay + undo', () => {
    session().open(level);
    vi.advanceTimersByTime(60_000);
    solveAll();
    expect(session().dispatch({ type: 'reset' })).toBe('removed');
    expect(session().solvedInMs).toBeNull();
    expect(session().dispatch({ type: 'undo' })).toBe('unchanged');
    expect(useProgressStore.getState().levels[level.id]).toMatchObject({ bestMs: 60_000, timesSolved: 1 });
  });

  it('resumes an unsolved level and starts fresh after leaving a solved one', () => {
    session().open(level);
    session().dispatch({ type: 'place', a: first.a, b: first.b });
    session().open(level);
    expect(session().game?.past).toHaveLength(1);

    solveAll();
    session().leave(level.id);
    session().open(level);
    expect(session().game?.partner.every((p) => p === -1)).toBe(true);
  });

  it('reports walls and placements blocked by a wall', () => {
    session().open(level);
    expect(session().dispatch({ type: 'toggleWall', a: first.a, b: first.b })).toBe('wall');
    expect(session().dispatch({ type: 'place', a: first.a, b: first.b })).toBe('blocked');
    expect(session().dispatch({ type: 'place', a: first.a, b: first.a })).toBe('unchanged');
  });

  it('saves the game on every change and restores it after a restart, with undo and time', () => {
    session().open(level);
    vi.advanceTimersByTime(20_000);
    session().dispatch({ type: 'place', a: first.a, b: first.b });
    const second = pairs[1]!;
    session().dispatch({ type: 'toggleWall', a: second.a, b: second.b });
    expect(savedGame()?.past).toHaveLength(2);

    vi.advanceTimersByTime(7_000);
    session().pause(); // the app goes to the background
    restartApp();
    vi.advanceTimersByTime(3_600_000);

    session().open(level);
    const game = session().game!;
    expect(game.partner[first.a]).toBe(first.b);
    expect(game.walls.some(Boolean)).toBe(true);
    expect(game.past).toHaveLength(2);
    expect(elapsedNow(session())).toBe(27_000);

    session().dispatch({ type: 'undo' });
    session().dispatch({ type: 'undo' });
    expect(session().game?.partner.every((p) => p === -1)).toBe(true);
  });

  it('keeps one saved game per level when switching levels', () => {
    session().open(level);
    session().dispatch({ type: 'place', a: first.a, b: first.b });
    session().open(otherLevel);
    session().dispatch({ type: 'place', a: 0, b: 1 });
    expect(Object.keys(useSavedGamesStore.getState().games).sort()).toEqual([level.id, otherLevel.id].sort());
    session().open(level);
    expect(session().game?.partner[first.a]).toBe(first.b);
  });

  it('forgets the saved game once the level is solved', () => {
    session().open(level);
    session().dispatch({ type: 'place', a: first.a, b: first.b });
    expect(savedGame()).toBeDefined();
    solveAll();
    expect(savedGame()).toBeUndefined();
  });

  it('drops a saved game that no longer matches its level', () => {
    session().open(level);
    session().dispatch({ type: 'place', a: first.a, b: first.b });
    useSavedGamesStore.setState({ games: { [level.id]: { ...savedGame()!, cells: '000' } } });
    restartApp();
    session().open(level);
    expect(session().game?.partner.every((p) => p === -1)).toBe(true);
    expect(savedGame()).toBeUndefined();
  });

  it('writes nothing before the saved games are loaded', () => {
    useSavedGamesStore.setState({ ready: false });
    session().open(level);
    session().dispatch({ type: 'place', a: first.a, b: first.b });
    expect(savedGame()).toBeUndefined();
  });
});

describe('saved games store', () => {
  beforeEach(() => {
    storageData.clear();
    useSavedGamesStore.setState({ games: {}, ready: false });
    restartApp();
  });

  it('loads saved games from storage', async () => {
    useSavedGamesStore.setState({ ready: true });
    session().open(level);
    session().dispatch({ type: 'place', a: first.a, b: first.b });
    const stored = storageData.get('dominosa.games');
    expect(stored).toBeDefined();

    useSavedGamesStore.setState({ games: {}, ready: false });
    storageData.set('dominosa.games', stored!);
    await useSavedGamesStore.persist.rehydrate();
    expect(useSavedGamesStore.getState().ready).toBe(true);
    expect(savedGame()?.board).toContain('.');
  });

  it('becomes ready even when stored data is unreadable', async () => {
    storageData.set('dominosa.games', '{not json');
    await useSavedGamesStore.persist.rehydrate();
    expect(useSavedGamesStore.getState()).toMatchObject({ ready: true, games: {} });
  });
});
