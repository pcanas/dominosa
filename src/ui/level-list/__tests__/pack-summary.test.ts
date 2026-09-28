import { describe, expect, it } from 'vitest';

import type { SavedGame } from '@/game';
import { PACKS } from '@/levels';

import { packSummary } from '../pack-summary';

describe('packSummary', () => {
  const intro = PACKS[0]!;
  const [first, second, third] = intro.levels;

  it('counts solved and in-progress levels and lists the board sizes', () => {
    const progress = {
      [first!.id]: { bestMs: 1, timesSolved: 1, firstSolvedAt: '2026-09-28T00:00:00Z' },
      'other-01': { bestMs: 1, timesSolved: 1, firstSolvedAt: '2026-09-28T00:00:00Z' },
    };
    const saved = { [second!.id]: {} as SavedGame, [third!.id]: {} as SavedGame };
    expect(packSummary(intro, progress, saved)).toEqual({
      total: 12,
      solved: 1,
      inProgress: 2,
      sizes: [
        [4, 5],
        [5, 6],
      ],
      maxGrade: 1,
    });
  });

  it('starts empty', () => {
    expect(packSummary(PACKS.at(-1)!, {}, {})).toMatchObject({ solved: 0, inProgress: 0, sizes: [[9, 10]] });
  });
});
