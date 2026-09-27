import { dominoCount, dominoPips, gridShape } from './dominoes';
import { createRng, type Rng } from './rng';
import { countSolutions } from './solver';
import type { CellIndex, Pip, Puzzle } from './types';

export interface GenerateOptions {
  /** Highest pip value (the puzzle uses the double-`order` set). */
  readonly order: number;
  /** Seed for reproducible output. */
  readonly seed: string | number;
  /** Hill-climbing steps before restarting from a new random board. Default 400. */
  readonly maxIterations?: number;
  /** Fresh boards to try before giving up. Default 50. */
  readonly maxRestarts?: number;
  /**
   * Solutions are counted up to this cap while climbing. Higher caps give a
   * smoother signal but cost more per step. Default 40.
   */
  readonly solutionCap?: number;
}

export interface GeneratedPuzzle {
  readonly puzzle: Puzzle;
  /** The unique solution, as a partner array. */
  readonly solution: CellIndex[];
  /** Hill-climbing steps used on the successful board. */
  readonly iterations: number;
  /** Boards discarded before the successful one. */
  readonly restarts: number;
}

/**
 * Generates a puzzle with a unique solution.
 *
 * 1. Tile the grid with random dominoes and deal the full set onto the tiles.
 *    This plants a known solution, but almost never a unique one.
 * 2. Hill-climb: swap the dominoes of two tiles or flip one tile, and keep the
 *    change if the number of solutions (capped) does not go up. Accepting
 *    sideways moves lets the search cross plateaus.
 * 3. Stop as soon as the planted solution is the only one.
 */
export function generatePuzzle(options: GenerateOptions): GeneratedPuzzle {
  const { order, seed, maxIterations = 400, maxRestarts = 50, solutionCap = 40 } = options;
  if (solutionCap < 2) throw new RangeError('solutionCap must be at least 2 to tell unique puzzles apart');
  const { rows, cols } = gridShape(order);
  const rng = createRng(seed);

  for (let restart = 0; restart <= maxRestarts; restart++) {
    const tiles = randomTiling(rows, cols, rng);
    const cells = dealDominoes(tiles, order, rows * cols, rng);
    const puzzleOf = (): Puzzle => ({ order, rows, cols, cells: [...cells] });

    let count = countSolutions(puzzleOf(), solutionCap).count;
    let iterations = 0;
    while (count > 1 && iterations < maxIterations) {
      iterations += 1;
      const undo = mutate(tiles, cells, rng);
      const next = countSolutions(puzzleOf(), solutionCap).count;
      if (next <= count) {
        count = next;
      } else {
        undo();
      }
    }

    if (count === 1) {
      const puzzle = puzzleOf();
      const partner = new Array<CellIndex>(rows * cols);
      for (const [a, b] of tiles) {
        partner[a] = b;
        partner[b] = a;
      }
      return { puzzle, solution: partner, iterations, restarts: restart };
    }
  }

  throw new Error(`Could not generate a unique order-${order} puzzle for seed "${seed}"`);
}

type Tile = [CellIndex, CellIndex];

/**
 * Random domino tiling of a rows × cols grid (rows * cols must be even).
 * Backtracking gives a valid tiling; random 2×2 flips then mix it so the
 * layout does not keep the backtracker's row-major bias.
 */
export function randomTiling(rows: number, cols: number, rng: Rng): Tile[] {
  const n = rows * cols;
  if (n % 2 !== 0) throw new RangeError('A grid with an odd number of cells cannot be tiled');
  const partner = new Int32Array(n).fill(-1);

  const fill = (from: number): boolean => {
    let i = from;
    while (i < n && partner[i] !== -1) i++;
    if (i === n) return true;
    const options: number[] = [];
    if (i % cols !== cols - 1 && partner[i + 1] === -1) options.push(i + 1);
    if (i + cols < n && partner[i + cols] === -1) options.push(i + cols);
    rng.shuffle(options);
    for (const j of options) {
      partner[i] = j;
      partner[j] = i;
      if (fill(i + 1)) return true;
      partner[i] = -1;
      partner[j] = -1;
    }
    return false;
  };
  fill(0);

  // Flip pairs of parallel dominoes inside random 2×2 blocks.
  const flips = n * 8;
  for (let k = 0; k < flips; k++) {
    const r = rng.int(rows - 1);
    const c = rng.int(cols - 1);
    const tl = r * cols + c;
    const tr = tl + 1;
    const bl = tl + cols;
    const br = bl + 1;
    if (partner[tl] === tr && partner[bl] === br) {
      partner[tl] = bl;
      partner[bl] = tl;
      partner[tr] = br;
      partner[br] = tr;
    } else if (partner[tl] === bl && partner[tr] === br) {
      partner[tl] = tr;
      partner[tr] = tl;
      partner[bl] = br;
      partner[br] = bl;
    }
  }

  const tiles: Tile[] = [];
  for (let i = 0; i < n; i++) {
    const j = partner[i]!;
    if (i < j) tiles.push([i, j]);
  }
  return tiles;
}

/** Deals every domino of the set onto the tiles, in random order and orientation. */
function dealDominoes(tiles: readonly Tile[], order: number, cellCount: number, rng: Rng): Pip[] {
  const total = dominoCount(order);
  if (tiles.length !== total) {
    throw new RangeError(`Expected ${total} tiles for order ${order}, got ${tiles.length}`);
  }
  const ids = rng.shuffle(Array.from({ length: total }, (_, i) => i));
  const cells = new Array<Pip>(cellCount).fill(0);
  tiles.forEach(([a, b], t) => {
    const [x, y] = dominoPips(ids[t]!, order);
    const flip = rng.next() < 0.5;
    cells[a] = flip ? y : x;
    cells[b] = flip ? x : y;
  });
  return cells;
}

/** Applies a random change to the pips and returns a function that reverts it. */
function mutate(tiles: readonly Tile[], cells: Pip[], rng: Rng): () => void {
  if (rng.next() < 0.7) {
    // Swap the dominoes on two tiles (with random orientation on arrival).
    const [a1, b1] = tiles[rng.int(tiles.length)]!;
    const [a2, b2] = tiles[rng.int(tiles.length)]!;
    const before = [cells[a1]!, cells[b1]!, cells[a2]!, cells[b2]!] as const;
    const flip1 = rng.next() < 0.5;
    const flip2 = rng.next() < 0.5;
    cells[a1] = flip1 ? before[3] : before[2];
    cells[b1] = flip1 ? before[2] : before[3];
    cells[a2] = flip2 ? before[1] : before[0];
    cells[b2] = flip2 ? before[0] : before[1];
    return () => {
      cells[a1] = before[0];
      cells[b1] = before[1];
      cells[a2] = before[2];
      cells[b2] = before[3];
    };
  }
  // Flip the orientation of a single tile.
  const [a, b] = tiles[rng.int(tiles.length)]!;
  const swap = (): void => {
    const tmp = cells[a]!;
    cells[a] = cells[b]!;
    cells[b] = tmp;
  };
  swap();
  return swap;
}
