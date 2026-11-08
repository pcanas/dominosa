import { describe, expect, it } from 'vitest';

import { createPuzzle, createRng, getTopology, type CellIndex, type Pair } from '@/core';
import { LEVELS, type Level } from '@/levels';

import { createGame, gameReducer, hasWall, isSolved, type GameAction, type GameState } from '../game';
import { findMistakes, hintAction, hintFocus, nextHint, type Hint } from '../hint';

/*
 * 3×2 order-1 board, unique solution [0,2] [1,3] [4,5]:
 *   0 1
 *   0 1
 *   1 0
 */
const puzzle = createPuzzle(1, 3, 2, [0, 1, 0, 1, 1, 0]);
const solution: CellIndex[] = [2, 3, 0, 1, 5, 4];

const play = (...actions: GameAction[]): GameState => actions.reduce(gameReducer, createGame(puzzle));
const place = (a: number, b: number): GameAction => ({ type: 'place', a, b });
const wall = (a: number, b: number): GameAction => ({ type: 'addWall', a, b });

const inSolution = (sol: readonly CellIndex[], { a, b }: Pair) => sol[a] === b;

describe('nextHint', () => {
  it('starts with a logical step that places a domino of the solution', () => {
    const hint = nextHint(createGame(puzzle), solution);
    expect(hint?.kind).toBe('step');
    if (hint?.kind !== 'step') return;
    expect(hint.step.place).not.toBeNull();
    expect(inSolution(solution, hint.step.place!)).toBe(true);
    expect(hintFocus(hint).length).toBeGreaterThan(0);
  });

  it('points at a wrong domino before anything else', () => {
    const game = play(place(0, 1));
    const hint = nextHint(game, solution);
    expect(hint).toMatchObject({
      kind: 'mistake',
      count: 1,
      mistake: { kind: 'domino', pair: { a: 0, b: 1 } },
    });
    expect(hintAction(hint!)).toEqual({ type: 'remove', cell: 0 });
  });

  it('points at a wall between two cells the solution joins', () => {
    const game = play(wall(4, 5));
    const hint = nextHint(game, solution);
    expect(hint).toMatchObject({ kind: 'mistake', mistake: { kind: 'wall', pair: { a: 4, b: 5 } } });
    expect(hintAction(hint!)).toEqual({ type: 'removeWall', a: 4, b: 5 });
  });

  it('shows the most recent mistake first, and counts them all', () => {
    // Wrong wall first, then a wrong domino on the other side of the board.
    const game = play(wall(4, 5), place(0, 1));
    const mistakes = findMistakes(game, solution);
    expect(mistakes.map((m) => m.kind)).toEqual(['domino', 'wall']);
    expect(nextHint(game, solution)).toMatchObject({
      kind: 'mistake',
      count: 2,
      mistake: { kind: 'domino' },
    });
  });

  it('builds on correct dominoes and walls without calling them mistakes', () => {
    const game = play(place(0, 2), wall(2, 3));
    expect(findMistakes(game, solution)).toEqual([]);
    const hint = nextHint(game, solution);
    expect(hint?.kind).toBe('step');
  });

  it('has nothing to say once the board is solved', () => {
    expect(nextHint(play(place(0, 2), place(1, 3), place(4, 5)), solution)).toBeNull();
  });

  it('reveals a domino of the solution when no step is found', () => {
    // Capped at singles, a deep level runs out of steps somewhere: that is when the fallback shows.
    const level = LEVELS.find((l) => l.grade === 3)!;
    let game = createGame(level.puzzle);
    let reveal: Hint | null = null;
    for (let i = 0; i < 200 && !reveal; i++) {
      const hint = nextHint(game, level.solution, 1);
      if (!hint) break;
      if (hint.kind === 'reveal') reveal = hint;
      game = gameReducer(game, hintAction(hint));
    }
    expect(reveal?.kind).toBe('reveal');
    if (reveal?.kind !== 'reveal') return;
    expect(inSolution(level.solution, reveal.pair)).toBe(true);
  });
});

describe('hint actions', () => {
  it('draws every wall a step rules out as a single move to undo', () => {
    const game = createGame(puzzle);
    const pairs = [
      { a: 0, b: 1 },
      { a: 2, b: 3 },
    ];
    const after = gameReducer(game, { type: 'addWalls', pairs });
    expect(hasWall(after, 0, 1) && hasWall(after, 2, 3)).toBe(true);
    expect(after.past).toHaveLength(1);
    const undone = gameReducer(after, { type: 'undo' });
    expect(hasWall(undone, 0, 1) || hasWall(undone, 2, 3)).toBe(false);
  });

  it('removes a domino lying on a new wall, skips cells that are not neighbours, and ignores walls already there', () => {
    const game = play(place(0, 1), wall(2, 3));
    const after = gameReducer(game, {
      type: 'addWalls',
      pairs: [
        { a: 0, b: 1 },
        { a: 0, b: 5 },
      ],
    });
    expect(after.partner[0]).toBe(-1);
    expect(hasWall(after, 0, 1)).toBe(true);
    expect(gameReducer(after, { type: 'addWalls', pairs: [{ a: 2, b: 3 }] })).toBe(after);
  });
});

/**
 * Plays every bundled level by hints alone, from random partial positions that
 * include a few mistakes: each hint must be right, and the board must end solved
 * without ever needing the reveal fallback.
 */
describe('hints on every bundled level', () => {
  const rng = createRng('hints');

  /** From an empty board (`fresh`) or with part of the solution already found; with a few mistakes either way. */
  function randomStart(level: Level, fresh: boolean): GameState {
    const { puzzle: p, solution: sol } = level;
    const topo = getTopology(p.rows, p.cols);
    let game = createGame(p);
    const keep = fresh ? 0 : rng.next() * 0.7;
    const walls = fresh ? 0 : rng.next() * 0.4;
    sol.forEach((b, a) => {
      if (b > a && rng.next() < keep) game = gameReducer(game, place(a, b));
    });
    for (let e = 0; e < topo.edgeCount; e++) {
      const a = topo.edgeA[e]!;
      const b = topo.edgeB[e]!;
      if (sol[a] !== b && game.partner[a] === -1 && game.partner[b] === -1 && rng.next() < walls) {
        game = gameReducer(game, wall(a, b));
      }
    }
    // A couple of mistakes on free cells: a wrong domino, a wall where the solution joins two cells.
    for (let k = rng.int(3); k > 0; k--) {
      const e = rng.int(topo.edgeCount);
      const a = topo.edgeA[e]!;
      const b = topo.edgeB[e]!;
      if (game.partner[a] !== -1 || game.partner[b] !== -1) continue;
      game = gameReducer(game, sol[a] === b ? wall(a, b) : place(a, b));
    }
    return game;
  }

  it.each(LEVELS.map((level) => [level.id, level] as const))('%s', (_id, level) => {
    for (const fresh of [true, false]) {
      let game = randomStart(level, fresh);
      const limit = level.puzzle.cells.length * 4;
      let moves = 0;
      for (; moves < limit && !isSolved(game); moves++) {
        const hint = nextHint(game, level.solution)!;
        expect(hint.kind).not.toBe('reveal');
        if (hint.kind === 'mistake') {
          expect(findMistakes(game, level.solution)).toContainEqual(hint.mistake);
        } else if (hint.kind === 'step') {
          if (hint.step.place) expect(inSolution(level.solution, hint.step.place)).toBe(true);
          for (const pair of hint.step.eliminate) expect(inSolution(level.solution, pair)).toBe(false);
        }
        const next = gameReducer(game, hintAction(hint));
        expect(next).not.toBe(game);
        game = next;
      }
      expect(isSolved(game)).toBe(true);
    }
  });
});
