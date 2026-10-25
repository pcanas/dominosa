/**
 * Public API of the Dominosa engine. App code imports from `@/core` only.
 */
export type { CellIndex, DominoId, Pair, Pip, Puzzle, Solution } from './types';
export { dominoCount, dominoId, dominoPips, gridShape } from './dominoes';
export {
  areAdjacent,
  DIRECTIONS,
  getTopology,
  makePair,
  neighbourOf,
  type Direction,
  type Topology,
} from './topology';
export {
  checkSolution,
  createPuzzle,
  decodeCells,
  decodePartners,
  decodeSolution,
  encodeCells,
  encodePartners,
  encodeSolution,
  type SolutionCheck,
} from './puzzle';
export { createRng, type Rng } from './rng';
export { countSolutions, hasUniqueSolution, solve, type SolveResult } from './solver';
export { generatePuzzle, randomTiling, type GenerateOptions, type GeneratedPuzzle } from './generator';
export {
  DeductionBoard,
  TECHNIQUE_LEVEL,
  type Deduction,
  type Technique,
  type TechniqueLevel,
} from './logic';
export { gradePuzzle, type GradeResult } from './grader';
