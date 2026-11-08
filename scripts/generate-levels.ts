/**
 * Offline level pipeline: generates, grades and writes the level packs that
 * ship inside the app.
 *
 *   npm run levels            # regenerate every pack
 *   npm run levels -- easy    # only the named packs
 *
 * Output is deterministic (seeded), so regenerating without changing the specs
 * or the engine yields identical files. No puzzle appears twice, even across
 * packs.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { encodeCells, encodeSolution, generatePuzzle, gradePuzzle, type GradeResult } from '@/core';
import { tutorialPlan } from '@/game/tutorial';
import type { LevelPackFile, LevelRecord } from '@/levels/types';

import { PACKS, TUTORIAL, type LevelGroup, type PackSpec } from './level-packs';

const MAX_SEEDS = 2_000;
const HARDEST_POOL = 3;

interface Candidate {
  readonly seed: string;
  readonly cells: string;
  readonly solution: string;
  readonly rows: number;
  readonly cols: number;
  readonly grade: GradeResult;
}

/** Sort key: deductions at the group's depth, then the whole solve length. */
const effort = (c: Candidate, level: number) => [c.grade.stepsByLevel[level - 1]!, c.grade.steps.length];

function compareEffort(level: number) {
  return (x: Candidate, y: Candidate) => {
    const [xa, xb] = effort(x, level);
    const [ya, yb] = effort(y, level);
    return xa! - ya! || xb! - yb!;
  };
}

function findGroup(pack: PackSpec, index: number, group: LevelGroup, used: Set<string>): Candidate[] {
  const wanted = group.pick === 'hardest' ? group.count * HARDEST_POOL : group.count;
  const found: Candidate[] = [];

  for (let k = 0; k < MAX_SEEDS && found.length < wanted; k++) {
    const seed = `${pack.id}/g${index}/${k}`;
    const { puzzle, solution } = generatePuzzle({ order: group.order, seed });
    const cells = encodeCells(puzzle.cells);
    if (used.has(cells)) continue;
    const grade = gradePuzzle(puzzle);
    if (grade.grade !== group.grade) continue;
    used.add(cells);
    found.push({
      seed,
      cells,
      solution: encodeSolution(solution, puzzle.cols),
      rows: puzzle.rows,
      cols: puzzle.cols,
      grade,
    });
  }

  if (found.length < wanted) {
    throw new Error(
      `${pack.id} group ${index}: only ${found.length}/${wanted} grade-${group.grade} puzzles ` +
        `of order ${group.order} in ${MAX_SEEDS} seeds`,
    );
  }
  const byEffort = compareEffort(group.grade);
  const chosen = group.pick === 'hardest' ? [...found].sort(byEffort).slice(-group.count) : found;
  // Easiest first inside the group; ties keep seed order (stable sort).
  return [...chosen].sort(byEffort);
}

function generatePack(pack: PackSpec, used: Set<string>): void {
  const started = performance.now();
  const levels: LevelRecord[] = [];

  pack.groups.forEach((group, index) => {
    for (const candidate of findGroup(pack, index, group, used)) {
      const id = `${pack.id}-${String(levels.length + 1).padStart(2, '0')}`;
      const [s1, s2, s3] = candidate.grade.stepsByLevel;
      console.log(
        `  ${id.padEnd(10)} ${`${candidate.cols}×${candidate.rows}`.padEnd(6)} grade ${group.grade}` +
          `  steps L1/L2/L3 ${s1}/${s2}/${s3}  seed ${candidate.seed}`,
      );
      levels.push({
        id,
        difficulty: pack.difficulty,
        order: group.order,
        rows: candidate.rows,
        cols: candidate.cols,
        grade: group.grade,
        cells: candidate.cells,
        solution: candidate.solution,
        seed: candidate.seed,
      });
    }
  });

  const file: LevelPackFile = { id: pack.id, formatVersion: 1, levels };
  const output = resolve(process.cwd(), pack.output);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(file, null, 2)}\n`);
  console.log(
    `✓ ${pack.id}: ${levels.length} levels → ${pack.output} (${Math.round(performance.now() - started)} ms)`,
  );
}

/** At least two dominoes each way, so the tutorial board looks like a real one rather than a pattern. */
function mixed(solution: readonly number[], cols: number): boolean {
  let across = 0;
  let down = 0;
  solution.forEach((b, a) => {
    if (b === a + 1) across++;
    else if (b === a + cols) down++;
  });
  return across >= 2 && down >= 2;
}

/** The tutorial's board: the first seed with the right depth, mixed dominoes, and a script that works on it. */
function generateTutorial(): void {
  for (let k = 0; k < MAX_SEEDS; k++) {
    const seed = `${TUTORIAL.id}/${k}`;
    const { puzzle, solution } = generatePuzzle({ order: TUTORIAL.order, seed });
    if (gradePuzzle(puzzle).grade !== TUTORIAL.grade || !mixed(solution, puzzle.cols)) continue;
    if (!tutorialPlan(puzzle, solution)) continue;
    const level: LevelRecord = {
      id: `${TUTORIAL.id}-01`,
      difficulty: TUTORIAL.difficulty,
      order: TUTORIAL.order,
      rows: puzzle.rows,
      cols: puzzle.cols,
      grade: TUTORIAL.grade,
      cells: encodeCells(puzzle.cells),
      solution: encodeSolution(solution, puzzle.cols),
      seed,
    };
    const file: LevelPackFile = { id: TUTORIAL.id, formatVersion: 1, levels: [level] };
    const output = resolve(process.cwd(), TUTORIAL.output);
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, `${JSON.stringify(file, null, 2)}\n`);
    console.log(`✓ ${TUTORIAL.id}: ${puzzle.cols}×${puzzle.rows}, seed ${seed} → ${TUTORIAL.output}`);
    return;
  }
  throw new Error(`No tutorial board in ${MAX_SEEDS} seeds`);
}

const requested = process.argv.slice(2);
const known = [...PACKS.map((p) => p.id), TUTORIAL.id];
const unknown = requested.filter((id) => !known.includes(id));
if (unknown.length > 0) {
  console.error(`Unknown pack(s): ${unknown.join(', ')}. Known: ${known.join(', ')}`);
  process.exit(1);
}

// Every pack is generated in order, even when only some are written, so the
// "no repeated puzzle" set is the same and output stays identical.
const used = new Set<string>();
for (const pack of PACKS) {
  const write = requested.length === 0 || requested.includes(pack.id);
  if (write) console.log(`Generating ${pack.id}…`);
  if (write) generatePack(pack, used);
  else for (const [index, group] of pack.groups.entries()) findGroup(pack, index, group, used);
}
// Its own order, so it never collides with a pack's board.
if (requested.length === 0 || requested.includes(TUTORIAL.id)) generateTutorial();
