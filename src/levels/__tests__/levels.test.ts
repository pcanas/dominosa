/**
 * Guards every level shipped with the app. Runs in CI on each push: a level
 * with more than one solution must never reach players.
 */
import { describe, expect, it } from 'vitest';

import { checkSolution, countSolutions, gradePuzzle } from '@/core';

import { DIFFICULTIES, getLevel, getPack, LEVELS, nextLevel, PACKS, parseLevel, type LevelRecord } from '..';

describe('bundled levels', () => {
  it('has unique ids, named after their pack and position', () => {
    const ids = LEVELS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const pack of PACKS) {
      pack.levels.forEach((level, i) => {
        expect(level.id).toBe(`${pack.id}-${String(i + 1).padStart(2, '0')}`);
        expect(level.packId).toBe(pack.id);
        expect(level.number).toBe(i + 1);
      });
    }
  });

  it('never repeats a puzzle, even across packs', () => {
    const boards = LEVELS.map((l) => l.puzzle.cells.join(''));
    expect(new Set(boards).size).toBe(boards.length);
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

  it('orders packs by difficulty, each with a single label', () => {
    const rank = (d: (typeof DIFFICULTIES)[number]) => DIFFICULTIES.indexOf(d);
    PACKS.forEach((pack, i) => {
      expect(pack.levels.length).toBeGreaterThan(0);
      expect(pack.levels.every((l) => l.difficulty === pack.difficulty)).toBe(true);
      if (i > 0) expect(rank(pack.difficulty)).toBeGreaterThan(rank(PACKS[i - 1]!.difficulty));
    });
  });

  it('ramps up inside each pack: never a smaller board, never less depth on the same board', () => {
    for (const pack of PACKS) {
      for (let i = 1; i < pack.levels.length; i++) {
        const prev = pack.levels[i - 1]!;
        const cur = pack.levels[i]!;
        expect(cur.puzzle.cells.length).toBeGreaterThanOrEqual(prev.puzzle.cells.length);
        if (cur.puzzle.cells.length === prev.puzzle.cells.length) {
          expect(cur.grade).toBeGreaterThanOrEqual(prev.grade);
        }
      }
    }
  });

  it('looks levels and packs up, and plays on into the next pack', () => {
    const [first, second] = LEVELS;
    expect(getLevel(first!.id)).toBe(first);
    expect(nextLevel(first!.id)).toBe(second);
    const [packA, packB] = PACKS;
    expect(getPack(packA!.id)).toBe(packA);
    expect(nextLevel(packA!.levels.at(-1)!.id)).toBe(packB!.levels[0]);
    expect(nextLevel(LEVELS[LEVELS.length - 1]!.id)).toBeUndefined();
    expect(getLevel('nope')).toBeUndefined();
    expect(getPack('nope')).toBeUndefined();
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
