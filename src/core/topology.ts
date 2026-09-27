import type { CellIndex, Pair } from './types';

/**
 * Precomputed adjacency for a rows × cols grid.
 *
 * Every domino slot (two orthogonally adjacent cells) gets a dense edge index,
 * so solvers can keep per-slot state in flat typed arrays.
 */
export interface Topology {
  readonly rows: number;
  readonly cols: number;
  readonly cellCount: number;
  readonly edgeCount: number;
  /** Lower (top/left) cell of each edge. */
  readonly edgeA: Int32Array;
  /** Upper (bottom/right) cell of each edge. */
  readonly edgeB: Int32Array;
  /** Edges touching each cell (2 to 4 per cell). */
  readonly cellEdges: readonly (readonly number[])[];
  /** Edge index between two cells, or -1 if they are not orthogonally adjacent. */
  edgeBetween(a: CellIndex, b: CellIndex): number;
}

const cache = new Map<string, Topology>();

export function getTopology(rows: number, cols: number): Topology {
  const key = `${rows}x${cols}`;
  let topology = cache.get(key);
  if (!topology) {
    topology = buildTopology(rows, cols);
    cache.set(key, topology);
  }
  return topology;
}

function buildTopology(rows: number, cols: number): Topology {
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1) {
    throw new RangeError(`Invalid grid ${rows}x${cols}`);
  }
  const cellCount = rows * cols;
  const rightEdge = new Int32Array(cellCount).fill(-1);
  const downEdge = new Int32Array(cellCount).fill(-1);
  const as: number[] = [];
  const bs: number[] = [];
  const cellEdges: number[][] = Array.from({ length: cellCount }, () => []);

  const addEdge = (a: number, b: number): number => {
    const e = as.length;
    as.push(a);
    bs.push(b);
    cellEdges[a]!.push(e);
    cellEdges[b]!.push(e);
    return e;
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      if (c + 1 < cols) rightEdge[i] = addEdge(i, i + 1);
      if (r + 1 < rows) downEdge[i] = addEdge(i, i + cols);
    }
  }

  const edgeBetween = (x: CellIndex, y: CellIndex): number => {
    if (x < 0 || y < 0 || x >= cellCount || y >= cellCount) return -1;
    const a = x < y ? x : y;
    const b = x < y ? y : x;
    if (b === a + 1 && a % cols !== cols - 1) return rightEdge[a]!;
    if (b === a + cols) return downEdge[a]!;
    return -1;
  };

  return {
    rows,
    cols,
    cellCount,
    edgeCount: as.length,
    edgeA: Int32Array.from(as),
    edgeB: Int32Array.from(bs),
    cellEdges,
    edgeBetween,
  };
}

/** Whether two cells of a grid with `cols` columns are orthogonally adjacent. */
export function areAdjacent(a: CellIndex, b: CellIndex, cols: number): boolean {
  const lo = a < b ? a : b;
  const hi = a < b ? b : a;
  return (hi === lo + 1 && lo % cols !== cols - 1) || hi === lo + cols;
}

/** Normalised pair (a < b). */
export function makePair(x: CellIndex, y: CellIndex): Pair {
  return x < y ? { a: x, b: y } : { a: y, b: x };
}
