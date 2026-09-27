/**
 * Guards every level shipped with the app. Runs in CI on each push: a level
 * with more than one solution must never reach players.
 */
import { describe, expect, it } from 'vitest';

import { checkSolution, countSolutions, gradePuzzle } from '@/core';

import { DIFFICULTIES, getLevel, LEVELS, nextLevel, parseLevel, type LevelRecord } from '..';

describe('bundled levels', () => {
  it('has unique ids', () => {
    const ids = LEVELS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  describe.each(LEVELS.map((level) => [level.id, level] as const))('%s', (_id, level) => {
    it('has exactly one solution, and it is the stored one', () => {
      const result = countSolutions(level.puzzle, 2);
      expect(result.count).toBe(1);
      expect(result.first).toEqual(level.solution);
      expect(checkSolution(level.puzzle, level.solution)).toEqual({ ok: true });
    });

    it('has the declared grade', () => {
      const result = gradePuzzle(level.puzzle);
      expect(result.solved).toBe(true);
      expect(result.grade).toBe(level.grade);
    });
  });

  it('ramps up in size and depth along the difficulty labels', () => {
    const rank = (d: (typeof DIFFICULTIES)[number]) => DIFFICULTIES.indexOf(d);
    for (let i = 1; i < LEVELS.length; i++) {
      const prev = LEVELS[i - 1]!;
      const cur = LEVELS[i]!;
      expect(rank(cur.difficulty)).toBeGreaterThanOrEqual(rank(prev.difficulty));
      expect(cur.puzzle.cells.length).toBeGreaterThanOrEqual(prev.puzzle.cells.length);
      expect(cur.grade).toBeGreaterThanOrEqual(prev.grade);
    }
  });

  it('looks levels up by id and in play order', () => {
    const [first, second] = LEVELS;
    expect(getLevel(first!.id)).toBe(first);
    expect(nextLevel(first!.id)).toBe(second);
    expect(nextLevel(LEVELS[LEVELS.length - 1]!.id)).toBeUndefined();
    expect(getLevel('nope')).toBeUndefined();
  });
});

describe('parseLevel', () => {
  const valid: LevelRecord = {
    id: 't',
    difficulty: 'tutorial',
    order: 1,
    rows: 3,
    cols: 2,
    grade: 1,
    cells: '010110',
    solution: 'DDUURL',
    seed: 'x',
  };

  it('parses a valid record', () => {
    const level = parseLevel(valid, 'p', 1);
    expect(level.puzzle.cells).toEqual([0, 1, 0, 1, 1, 0]);
    expect(level.solution).toEqual([2, 3, 0, 1, 5, 4]);
  });

  it('rejects malformed records', () => {
    expect(() => parseLevel({ ...valid, cells: '01011' }, 'p', 1)).toThrow();
    expect(() => parseLevel({ ...valid, solution: 'DDUURR' }, 'p', 1)).toThrow();
    expect(() => parseLevel({ ...valid, difficulty: 'wild' as never }, 'p', 1)).toThrow();
  });
});
