import { describe, expect, it } from 'vitest';

import { createPuzzle, dominoId } from '@/core';

import { createGame, gameReducer, type GameAction, type GameState } from '../game';
import { pairSlots, trackPairs } from '../tracker';

/*
 * 3×2 order-1 board, unique solution [0,2] [1,3] [4,5]:
 *   0 1
 *   0 1
 *   1 0
 * Dominoes: 0-0 (id 0), 0-1 (id 1), 1-1 (id 2).
 */
const puzzle = createPuzzle(1, 3, 2, [0, 1, 0, 1, 1, 0]);
const play = (...actions: GameAction[]): GameState => actions.reduce(gameReducer, createGame(puzzle));
const place = (a: number, b: number): GameAction => ({ type: 'place', a, b });
const wall = (a: number, b: number): GameAction => ({ type: 'addWall', a, b });

describe('trackPairs', () => {
  it('lists the whole set in order, with how many times each is placed', () => {
    expect(trackPairs(play())).toEqual([
      { domino: 0, pips: [0, 0], placed: 0 },
      { domino: 1, pips: [0, 1], placed: 0 },
      { domino: 2, pips: [1, 1], placed: 0 },
    ]);
    // [0,1] and [2,3] are both 0-1.
    expect(trackPairs(play(place(0, 1), place(2, 3))).map((p) => p.placed)).toEqual([0, 2, 0]);
    expect(trackPairs(play(place(0, 2))).map((p) => p.placed)).toEqual([1, 0, 0]);
  });
});

describe('pairSlots', () => {
  const zeroOne = dominoId(0, 1, 1);

  it('finds every free slot showing the pair', () => {
    // 0-1 shows up on 0–1, 2–3, 2–4, 3–5 and 4–5.
    expect(pairSlots(play(), zeroOne)).toEqual({
      placed: [],
      open: [
        { a: 0, b: 1 },
        { a: 2, b: 3 },
        { a: 2, b: 4 },
        { a: 3, b: 5 },
        { a: 4, b: 5 },
      ],
    });
  });

  it('leaves out walled slots and slots with a covered cell, and reports where it is placed', () => {
    const game = play(wall(0, 1), place(4, 5));
    expect(pairSlots(game, zeroOne)).toEqual({
      placed: [{ a: 4, b: 5 }],
      open: [{ a: 2, b: 3 }],
    });
    expect(pairSlots(game, dominoId(0, 0, 1)).open).toEqual([{ a: 0, b: 2 }]);
  });
});
