/**
 * Offline level pipeline: generates, grades and writes the level packs that
 * ship inside the app.
 *
 *   npm run levels            # regenerate every pack
 *   npm run levels -- hito0   # only the named packs
 *
 * Output is deterministic (seeded), so regenerating without changing the specs
 * or the engine yields identical files.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { encodeCells, encodeSolution, generatePuzzle, gradePuzzle, type GradeResult } from '@/core';
import type { LevelPackFile, LevelRecord } from '@/levels/types';

import { PACKS, type LevelSpec, type PackSpec } from './level-packs';

const MAX_SEEDS = 500;
const HARDEST_CANDIDATES = 12;

interface Candidate {
  readonly record: LevelRecord;
  readonly grade: GradeResult;
}

function findLevel(pack: PackSpec, spec: LevelSpec): Candidate {
  const wanted = spec.pick === 'hardest' ? HARDEST_CANDIDATES : 1;
  const found: Candidate[] = [];

  for (let k = 0; k < MAX_SEEDS && found.length < wanted; k++) {
    const seed = `${pack.id}/${spec.id}/${k}`;
    const { puzzle, solution } = generatePuzzle({ order: spec.order, seed });
    const grade = gradePuzzle(puzzle);
    if (grade.grade !== spec.grade) continue;
    found.push({
      grade,
      record: {
        id: spec.id,
        difficulty: spec.difficulty,
        order: puzzle.order,
        rows: puzzle.rows,
        cols: puzzle.cols,
        grade: spec.grade,
        cells: encodeCells(puzzle.cells),
        solution: encodeSolution(solution, puzzle.cols),
        seed,
      },
    });
  }

  if (found.length === 0) {
    throw new Error(
      `No grade-${spec.grade} puzzle of order ${spec.order} in ${MAX_SEEDS} seeds (${spec.id})`,
    );
  }
  // Most steps at the required level first; ties keep seed order (stable sort).
  const level = spec.grade - 1;
  found.sort((x, y) => y.grade.stepsByLevel[level]! - x.grade.stepsByLevel[level]!);
  return found[0]!;
}

function generatePack(pack: PackSpec): void {
  const started = performance.now();
  const levels = pack.levels.map((spec) => {
    const { record, grade } = findLevel(pack, spec);
    const [s1, s2, s3] = grade.stepsByLevel;
    console.log(
      `  ${record.id.padEnd(10)} ${`${record.cols}×${record.rows}`.padEnd(6)} grade ${record.grade}` +
        `  steps L1/L2/L3 ${s1}/${s2}/${s3}  seed ${record.seed}`,
    );
    return record;
  });

  const file: LevelPackFile = { id: pack.id, formatVersion: 1, levels };
  const output = resolve(process.cwd(), pack.output);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(file, null, 2)}\n`);
  console.log(
    `✓ ${pack.id}: ${levels.length} levels → ${pack.output} (${Math.round(performance.now() - started)} ms)`,
  );
}

const requested = process.argv.slice(2);
const packs = requested.length > 0 ? PACKS.filter((p) => requested.includes(p.id)) : PACKS;
if (packs.length === 0) {
  console.error(`Unknown pack(s): ${requested.join(', ')}. Known: ${PACKS.map((p) => p.id).join(', ')}`);
  process.exit(1);
}
for (const pack of packs) {
  console.log(`Generating ${pack.id}…`);
  generatePack(pack);
}
