import { describe, expect, it } from 'vitest';

import { generatePuzzle, randomTiling } from '../generator';
import { gradePuzzle } from '../grader';
import { DeductionBoard } from '../logic';
import { checkSolution } from '../puzzle';
import { createRng } from '../rng';
import { countSolutions, hasUniqueSolution, solve } from '../solver';
import { getTopology } from '../topology';
import { ORDER1_AMBIGUOUS, ORDER1_UNIQUE, ORDER1_UNIQUE_SOLUTION } from './fixtures';

describe('solver', () => {
  it('finds the single solution of a unique puzzle', () => {
    const result = countSolutions(ORDER1_UNIQUE, 10);
    expect(result).toEqual({ count: 1, capped: false, first: ORDER1_UNIQUE_SOLUTION });
    expect(hasUniqueSolution(ORDER1_UNIQUE)).toBe(true);
  });

  it('counts every solution of an ambiguous puzzle', () => {
    expect(countSolutions(ORDER1_AMBIGUOUS, 10).count).toBe(2);
    expect(hasUniqueSolution(ORDER1_AMBIGUOUS)).toBe(false);
  });

  it('stops at the limit', () => {
    const result = countSolutions(ORDER1_AMBIGUOUS, 1);
    expect(result.count).toBe(1);
    expect(result.capped).toBe(true);
  });

  it('only returns valid solutions', () => {
    const solution = solve(ORDER1_AMBIGUOUS);
    expect(solution).not.toBeNull();
    expect(checkSolution(ORDER1_AMBIGUOUS, solution!)).toEqual({ ok: true });
  });
});

describe('randomTiling', () => {
  it('covers every cell exactly once with adjacent pairs', () => {
    const rng = createRng('tiling');
    for (const [rows, cols] of [
      [5, 4],
      [10, 9],
      [11, 10],
    ] as const) {
      const tiles = randomTiling(rows, cols, rng);
      const topo = getTopology(rows, cols);
      const covered = new Set<number>();
      for (const [a, b] of tiles) {
        expect(topo.edgeBetween(a, b)).toBeGreaterThanOrEqual(0);
        covered.add(a);
        covered.add(b);
      }
      expect(covered.size).toBe(rows * cols);
      expect(tiles.length).toBe((rows * cols) / 2);
    }
  });
});

describe('generatePuzzle', () => {
  it.each([3, 4, 5, 6, 7, 8])(
    'generates a unique order-%i puzzle whose solution is the planted one',
    (order) => {
      const { puzzle, solution } = generatePuzzle({ order, seed: `test-${order}` });
      expect(puzzle.rows).toBe(order + 2);
      expect(puzzle.cols).toBe(order + 1);
      expect(checkSolution(puzzle, solution)).toEqual({ ok: true });
      const result = countSolutions(puzzle, 2);
      expect(result.count).toBe(1);
      expect(result.first).toEqual(solution);
    },
  );

  it('rejects a solution cap that cannot detect ambiguity', () => {
    expect(() => generatePuzzle({ order: 3, seed: 'x', solutionCap: 1 })).toThrow(RangeError);
  });

  it('is reproducible for a seed', () => {
    const a = generatePuzzle({ order: 5, seed: 'same' });
    const b = generatePuzzle({ order: 5, seed: 'same' });
    expect(b.puzzle).toEqual(a.puzzle);
  });
});

describe('logical solver and grader', () => {
  it.each([3, 5, 7])('makes only sound deductions on an order-%i puzzle', (order) => {
    const { puzzle, solution } = generatePuzzle({ order, seed: `logic-${order}` });
    const board = DeductionBoard.fromPuzzle(puzzle);
    for (;;) {
      const step = board.next(3);
      if (!step) break;
      if (step.place) expect(solution[step.place.a]).toBe(step.place.b);
      for (const pair of step.eliminate) expect(solution[pair.a]).not.toBe(pair.b);
      board.apply(step);
      expect(board.hasContradiction).toBe(false);
    }
  });

  it('grades a tiny puzzle as singles-only', () => {
    const result = gradePuzzle(ORDER1_UNIQUE);
    expect(result).toMatchObject({ solved: true, grade: 1 });
    expect(result.steps.filter((s) => s.place)).toHaveLength(3);
  });

  it('reports the hardest level used and counts steps per level', () => {
    const { puzzle } = generatePuzzle({ order: 6, seed: 'grade' });
    const result = gradePuzzle(puzzle);
    if (result.grade !== null) {
      expect(result.solved).toBe(true);
      const deepest = Math.max(...result.steps.map((s) => s.level));
      expect(result.grade).toBe(deepest);
    }
    expect(result.stepsByLevel.reduce((x, y) => x + y, 0)).toBe(result.steps.length);
  });

  it('never needs a lower level technique it skipped', () => {
    // With maxLevel = 1, the solver must stall exactly where the full grader first used level 2+.
    const { puzzle } = generatePuzzle({ order: 6, seed: 'levels' });
    const full = gradePuzzle(puzzle);
    const firstHard = full.steps.findIndex((s) => s.level > 1);
    const board = DeductionBoard.fromPuzzle(puzzle);
    let applied = 0;
    for (let step = board.next(1); step; step = board.next(1)) {
      board.apply(step);
      applied++;
      if (applied > 10_000) throw new Error('runaway');
    }
    if (firstHard === -1) expect(board.isSolved).toBe(true);
    else expect(applied).toBe(firstHard);
  });
});
