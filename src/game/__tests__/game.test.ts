import { describe, expect, it } from 'vitest';

import { createPuzzle } from '@/core';

import {
  canUndo,
  coveredCellCount,
  createGame,
  gameReducer,
  isSolved,
  MAX_UNDO,
  placedTiles,
  type GameAction,
  type GameState,
} from '../game';
import { recordSolve } from '../progress';
import { boardStatus } from '../status';

/*
 * 3×2 order-1 board, unique solution [0,2] [1,3] [4,5]:
 *   0 1
 *   0 1
 *   1 0
 */
const puzzle = createPuzzle(1, 3, 2, [0, 1, 0, 1, 1, 0]);

const play = (...actions: GameAction[]): GameState => actions.reduce(gameReducer, createGame(puzzle));
const place = (a: number, b: number): GameAction => ({ type: 'place', a, b });

describe('gameReducer', () => {
  it('starts empty', () => {
    const game = createGame(puzzle);
    expect(coveredCellCount(game)).toBe(0);
    expect(canUndo(game)).toBe(false);
    expect(isSolved(game)).toBe(false);
  });

  it('places a domino on adjacent cells, in either order', () => {
    expect(play(place(2, 0)).partner).toEqual([2, -1, 0, -1, -1, -1]);
    expect(placedTiles(play(place(2, 0)))).toEqual([{ a: 0, b: 2, domino: 0, duplicate: false }]);
  });

  it('ignores invalid placements and returns the same state', () => {
    const game = play(place(0, 2));
    for (const action of [place(0, 3), place(1, 2), place(-1, 0), place(5, 6), place(2, 0)]) {
      expect(gameReducer(game, action)).toBe(game);
    }
  });

  it('replaces every domino that overlaps a new placement', () => {
    const game = play(place(0, 2), place(1, 3), place(0, 1));
    expect(game.partner).toEqual([1, 0, -1, -1, -1, -1]);
  });

  it('removes the domino covering a cell', () => {
    const game = play(place(0, 2), { type: 'remove', cell: 2 });
    expect(coveredCellCount(game)).toBe(0);
    const empty = createGame(puzzle);
    expect(gameReducer(empty, { type: 'remove', cell: 0 })).toBe(empty);
  });

  it('flags duplicated dominoes', () => {
    // [0,1] and [2,3] are both 0-1.
    const tiles = placedTiles(play(place(0, 1), place(2, 3)));
    expect(tiles.map((t) => t.duplicate)).toEqual([true, true]);
  });

  it('undoes step by step, including replacements', () => {
    const game = play(place(0, 2), place(1, 3), place(0, 1), { type: 'undo' });
    expect(game.partner).toEqual([2, 3, 0, 1, -1, -1]);
    const back = play(place(0, 2), { type: 'undo' }, { type: 'undo' });
    expect(coveredCellCount(back)).toBe(0);
    expect(canUndo(back)).toBe(false);
  });

  it('resets and lets the reset be undone', () => {
    const game = play(place(0, 2), place(1, 3), { type: 'reset' });
    expect(coveredCellCount(game)).toBe(0);
    expect(coveredCellCount(gameReducer(game, { type: 'undo' }))).toBe(4);
    const empty = createGame(puzzle);
    expect(gameReducer(empty, { type: 'reset' })).toBe(empty);
  });

  it('detects the solved state and locks the board until reset', () => {
    const solved = play(place(0, 2), place(1, 3), place(4, 5));
    expect(isSolved(solved)).toBe(true);
    expect(canUndo(solved)).toBe(false);
    expect(gameReducer(solved, { type: 'remove', cell: 0 })).toBe(solved);
    expect(gameReducer(solved, { type: 'undo' })).toBe(solved);
    expect(isSolved(gameReducer(solved, { type: 'reset' }))).toBe(false);
  });

  it('starts a fresh attempt when a solved board is reset, so undo cannot restore the solve', () => {
    const solved = play(place(0, 2), place(1, 3), place(4, 5));
    const fresh = gameReducer(solved, { type: 'reset' });
    expect(fresh.past).toEqual([]);
    expect(canUndo(fresh)).toBe(false);
    expect(gameReducer(fresh, { type: 'undo' })).toBe(fresh);
  });

  it('does not count a full board with duplicates as solved', () => {
    const full = play(place(0, 1), place(2, 3), place(4, 5));
    expect(coveredCellCount(full)).toBe(6);
    expect(isSolved(full)).toBe(false);
  });

  it('caps the undo history', () => {
    let game = createGame(puzzle);
    for (let i = 0; i < MAX_UNDO + 20; i++) {
      game = gameReducer(game, i % 2 === 0 ? place(0, 2) : place(0, 1));
    }
    expect(game.past.length).toBe(MAX_UNDO);
  });
});

describe('recordSolve', () => {
  const now = new Date('2026-09-27T10:00:00Z');

  it('stores the first solve', () => {
    expect(recordSolve({}, 'l1', 61_234.4, now)).toEqual({
      l1: { bestMs: 61_234, timesSolved: 1, firstSolvedAt: '2026-09-27T10:00:00.000Z' },
    });
  });

  it('keeps the best time and the first date', () => {
    const first = recordSolve({}, 'l1', 50_000, now);
    const slower = recordSolve(first, 'l1', 90_000, new Date('2026-09-28T10:00:00Z'));
    expect(slower.l1).toEqual({ bestMs: 50_000, timesSolved: 2, firstSolvedAt: '2026-09-27T10:00:00.000Z' });
    expect(recordSolve(slower, 'l1', 40_000, now).l1?.bestMs).toBe(40_000);
  });
});

describe('boardStatus', () => {
  it('describes each phase of a game', () => {
    expect(boardStatus(play())).toEqual({ kind: 'empty' });
    expect(boardStatus(play(place(0, 2)))).toEqual({ kind: 'progress', placed: 1, total: 3 });
    expect(boardStatus(play(place(0, 1), place(2, 3)))).toEqual({ kind: 'duplicates', full: false });
    expect(boardStatus(play(place(0, 1), place(2, 3), place(4, 5)))).toEqual({
      kind: 'duplicates',
      full: true,
    });
    expect(boardStatus(play(place(0, 2), place(1, 3), place(4, 5)))).toEqual({ kind: 'solved' });
  });
});
