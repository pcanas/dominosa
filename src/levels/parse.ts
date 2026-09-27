import { createPuzzle, decodeCells, decodeSolution } from '@/core';

import { DIFFICULTIES, type Level, type LevelPackFile, type LevelRecord } from './types';

/** Turns a stored record into a playable level. Throws on malformed data. */
export function parseLevel(record: LevelRecord, packId: string, number: number): Level {
  if (!DIFFICULTIES.includes(record.difficulty)) {
    throw new SyntaxError(`Level ${record.id}: unknown difficulty "${record.difficulty}"`);
  }
  const puzzle = createPuzzle(record.order, record.rows, record.cols, decodeCells(record.cells));
  const solution = decodeSolution(record.solution, record.cols);
  if (solution.length !== puzzle.cells.length) {
    throw new SyntaxError(`Level ${record.id}: solution length does not match the grid`);
  }
  return {
    id: record.id,
    packId,
    number,
    difficulty: record.difficulty,
    grade: record.grade,
    puzzle,
    solution,
  };
}

export function parsePack(file: LevelPackFile): Level[] {
  if (file.formatVersion !== 1) {
    throw new SyntaxError(`Pack ${file.id}: unsupported format version ${String(file.formatVersion)}`);
  }
  return file.levels.map((record, i) => parseLevel(record, file.id, i + 1));
}
