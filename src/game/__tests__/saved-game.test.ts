import { describe, expect, it } from 'vitest';

import { createPuzzle } from '@/core';

import { createGame, gameReducer, isSolved, type GameAction, type GameState } from '../game';
import {
  decodeBoard,
  encodeBoard,
  restoreGame,
  sanitizeSavedGames,
  saveGame,
  savedPlacedCount,
  withoutSavedGame,
  withSavedGame,
  type SavedGame,
} from '../saved-game';

/*
 * 3×2 order-1 board, unique solution [0,2] [1,3] [4,5]:
 *   0 1
 *   0 1
 *   1 0
 */
const puzzle = createPuzzle(1, 3, 2, [0, 1, 0, 1, 1, 0]);
const other = createPuzzle(1, 3, 2, [1, 0, 1, 0, 0, 1]);

const play = (...actions: GameAction[]): GameState => actions.reduce(gameReducer, createGame(puzzle));
const place = (a: number, b: number): GameAction => ({ type: 'place', a, b });
const wall = (a: number, b: number): GameAction => ({ type: 'toggleWall', a, b });
const now = new Date('2026-09-28T10:00:00Z');

/** Saved game as it comes back from storage. */
const stored = (game: GameState, elapsedMs = 0): SavedGame =>
  JSON.parse(JSON.stringify(saveGame(game, elapsedMs, now))) as SavedGame;

describe('saveGame / restoreGame', () => {
  it('round-trips the board, walls, history and time', () => {
    const game = play(place(0, 2), wall(1, 3), place(0, 1), place(4, 5));
    const saved = stored(game, 61_234.4);
    expect(saved).toMatchObject({ board: 'RL..RL', walls: [2], elapsedMs: 61_234 });

    const restored = restoreGame(puzzle, saved);
    expect(restored?.elapsedMs).toBe(61_234);
    expect(restored?.game.partner).toEqual(game.partner);
    expect(restored?.game.walls).toEqual(game.walls);
    expect(restored?.game.past).toEqual(game.past);

    // Undo keeps working after a restore, all the way back to the empty board.
    let back = restored!.game;
    for (let i = 0; i < game.past.length; i++) back = gameReducer(back, { type: 'undo' });
    expect(back.partner.every((p) => p === -1)).toBe(true);
    expect(back.walls.every((w) => !w)).toBe(true);
  });

  it('never restores onto a different puzzle', () => {
    expect(restoreGame(other, stored(play(place(0, 2))))).toBeNull();
  });

  it('rejects malformed or impossible boards', () => {
    const base = stored(play(place(0, 2)));
    const broken: unknown[] = [
      null,
      'nope',
      { ...base, board: 'D.U..' }, // wrong length
      { ...base, board: 'X.....' }, // unknown letter
      { ...base, board: 'RR....' }, // partners disagree
      { ...base, board: '.R....' }, // cell 1 has no right neighbour
      { ...base, walls: [99] }, // no such edge
      { ...base, walls: [1] }, // wall under the domino 0–2
      { ...base, walls: 'x' },
    ];
    for (const value of broken) expect(restoreGame(puzzle, value)).toBeNull();
  });

  it('does not restore a solved board', () => {
    const solved = play(place(0, 2), place(1, 3), place(4, 5));
    expect(isSolved(solved)).toBe(true);
    expect(restoreGame(puzzle, stored(solved))).toBeNull();
  });

  it('keeps the board but drops the part of the history that no longer applies', () => {
    const game = play(place(0, 2), place(1, 3), wall(4, 5));
    const saved = stored(game);

    // Oldest step damaged: the two newer ones survive.
    const oldBroken = { ...saved, past: [{ cells: [0], partners: [9], walls: [] }, ...saved.past.slice(1)] };
    expect(restoreGame(puzzle, oldBroken)?.game.past).toEqual(game.past.slice(1));

    // Newest step inconsistent with the board: no history, board intact.
    const newBroken = {
      ...saved,
      past: [...saved.past.slice(0, -1), { cells: [4], partners: [5], walls: [] }],
    };
    const restored = restoreGame(puzzle, newBroken);
    expect(restored?.game.past).toEqual([]);
    expect(restored?.game.partner).toEqual(game.partner);

    expect(restoreGame(puzzle, { ...saved, past: 'x' })?.game.past).toEqual([]);
  });

  it('treats a missing or bad time as zero', () => {
    const saved = stored(play(place(0, 2)));
    expect(restoreGame(puzzle, { ...saved, elapsedMs: 'x' })?.elapsedMs).toBe(0);
    expect(restoreGame(puzzle, { ...saved, elapsedMs: -5 })?.elapsedMs).toBe(0);
  });
});

describe('board encoding', () => {
  it('writes one direction letter per cell', () => {
    expect(encodeBoard([2, 3, 0, 1, 5, 4], 2)).toBe('DDUURL');
    expect(encodeBoard([-1, -1, -1, -1, 5, 4], 2)).toBe('....RL');
    expect(decodeBoard('DDUURL', 2, 6)).toEqual([2, 3, 0, 1, 5, 4]);
    expect(decodeBoard('......', 2, 6)).toEqual([-1, -1, -1, -1, -1, -1]);
  });

  it('counts the dominoes of a saved game', () => {
    expect(savedPlacedCount(stored(play(place(0, 2), place(4, 5))))).toBe(2);
    expect(savedPlacedCount(stored(play(wall(0, 1))))).toBe(0);
  });
});

describe('saved game map', () => {
  const at = (iso: string): SavedGame => ({ ...stored(play()), savedAt: iso });

  it('adds and replaces games, dropping the least recently saved beyond the cap', () => {
    let games = withSavedGame({}, 'a', at('2026-09-01T00:00:00Z'), 2);
    games = withSavedGame(games, 'b', at('2026-09-03T00:00:00Z'), 2);
    games = withSavedGame(games, 'a', at('2026-09-04T00:00:00Z'), 2);
    games = withSavedGame(games, 'c', at('2026-09-05T00:00:00Z'), 2);
    expect(Object.keys(games).sort()).toEqual(['a', 'c']);
  });

  it('removes a game, and returns the same map when there is nothing to remove', () => {
    const games = withSavedGame({}, 'a', at('2026-09-01T00:00:00Z'));
    expect(withoutSavedGame(games, 'a')).toEqual({});
    expect(withoutSavedGame(games, 'zz')).toBe(games);
  });
});

describe('sanitizeSavedGames', () => {
  it('keeps only entries with the basic shape of a saved game', () => {
    const good = stored(play(place(0, 2)));
    expect(sanitizeSavedGames({ a: good, b: null, c: { board: 1 }, d: 'x' })).toEqual({ a: good });
    expect(sanitizeSavedGames(null)).toEqual({});
    expect(sanitizeSavedGames([good])).toEqual({});
  });
});
