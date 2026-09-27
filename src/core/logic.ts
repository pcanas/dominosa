import { dominoCount, dominoId } from './dominoes';
import { getTopology, type Topology } from './topology';
import type { CellIndex, Pair, Puzzle } from './types';

/**
 * Human-style deduction techniques, from easiest to hardest.
 *
 * Level 1 – singles
 *   - `cell-single`: a cell has only one possible partner left.
 *   - `domino-single`: a domino has only one possible slot left.
 * Level 2 – local reasoning
 *   - `domino-shared-cell`: every slot left for a domino shares one cell, so that
 *     cell belongs to the domino and its other slots are ruled out.
 *   - `dead-end`: placing a domino here would leave a neighbouring cell, or
 *     another domino, with no options at all.
 * Level 3 – lookahead
 *   - `lookahead`: assuming this slot and following the singles it forces leads
 *     to a contradiction.
 */
export type Technique = 'cell-single' | 'domino-single' | 'domino-shared-cell' | 'dead-end' | 'lookahead';

export type TechniqueLevel = 1 | 2 | 3;

export const TECHNIQUE_LEVEL: Readonly<Record<Technique, TechniqueLevel>> = {
  'cell-single': 1,
  'domino-single': 1,
  'domino-shared-cell': 2,
  'dead-end': 2,
  lookahead: 3,
};

/** One logical step. This is also the unit a graduated hint will explain. */
export interface Deduction {
  readonly technique: Technique;
  readonly level: TechniqueLevel;
  /** Domino placed by this step, if any. */
  readonly place: Pair | null;
  /** Slots ruled out by this step. */
  readonly eliminate: readonly Pair[];
  /** Cells a hint should point at first. */
  readonly focus: readonly CellIndex[];
}

/**
 * Candidate-tracking board for logical solving: which slots are still possible,
 * which dominoes are placed. Mutable on purpose (it is an internal working
 * structure); use {@link DeductionBoard.clone} for what-if reasoning.
 */
export class DeductionBoard {
  readonly puzzle: Puzzle;
  private readonly topo: Topology;
  private readonly edgeDomino: Int32Array;
  private readonly dominoEdges: readonly (readonly number[])[];
  private readonly live: Uint8Array;
  private readonly cellDone: Uint8Array;
  private readonly dominoDone: Uint8Array;
  private placedCount: number;

  private constructor(
    puzzle: Puzzle,
    topo: Topology,
    edgeDomino: Int32Array,
    dominoEdges: readonly (readonly number[])[],
    live: Uint8Array,
    cellDone: Uint8Array,
    dominoDone: Uint8Array,
    placedCount: number,
  ) {
    this.puzzle = puzzle;
    this.topo = topo;
    this.edgeDomino = edgeDomino;
    this.dominoEdges = dominoEdges;
    this.live = live;
    this.cellDone = cellDone;
    this.dominoDone = dominoDone;
    this.placedCount = placedCount;
  }

  static fromPuzzle(puzzle: Puzzle): DeductionBoard {
    const topo = getTopology(puzzle.rows, puzzle.cols);
    const total = dominoCount(puzzle.order);
    const edgeDomino = new Int32Array(topo.edgeCount);
    const dominoEdges: number[][] = Array.from({ length: total }, () => []);
    for (let e = 0; e < topo.edgeCount; e++) {
      const d = dominoId(puzzle.cells[topo.edgeA[e]!]!, puzzle.cells[topo.edgeB[e]!]!, puzzle.order);
      edgeDomino[e] = d;
      dominoEdges[d]!.push(e);
    }
    return new DeductionBoard(
      puzzle,
      topo,
      edgeDomino,
      dominoEdges,
      new Uint8Array(topo.edgeCount).fill(1),
      new Uint8Array(topo.cellCount),
      new Uint8Array(total),
      0,
    );
  }

  clone(): DeductionBoard {
    return new DeductionBoard(
      this.puzzle,
      this.topo,
      this.edgeDomino,
      this.dominoEdges,
      this.live.slice(),
      this.cellDone.slice(),
      this.dominoDone.slice(),
      this.placedCount,
    );
  }

  get isSolved(): boolean {
    return this.placedCount === this.dominoEdges.length;
  }

  /** True if some free cell or unplaced domino has no possible slot left. */
  get hasContradiction(): boolean {
    for (let c = 0; c < this.topo.cellCount; c++) {
      if (!this.cellDone[c] && this.countLive(this.topo.cellEdges[c]!) === 0) return true;
    }
    for (let d = 0; d < this.dominoEdges.length; d++) {
      if (!this.dominoDone[d] && this.countLive(this.dominoEdges[d]!) === 0) return true;
    }
    return false;
  }

  /** Places the domino covering `pair` and rules out every slot it conflicts with. */
  place(pair: Pair): void {
    const e = this.edgeOf(pair);
    const { edgeA, edgeB, cellEdges } = this.topo;
    const a = edgeA[e]!;
    const b = edgeB[e]!;
    const d = this.edgeDomino[e]!;
    for (const x of cellEdges[a]!) this.live[x] = 0;
    for (const x of cellEdges[b]!) this.live[x] = 0;
    for (const x of this.dominoEdges[d]!) this.live[x] = 0;
    this.cellDone[a] = 1;
    this.cellDone[b] = 1;
    this.dominoDone[d] = 1;
    this.placedCount += 1;
  }

  eliminate(pair: Pair): void {
    this.live[this.edgeOf(pair)] = 0;
  }

  apply(step: Deduction): void {
    for (const pair of step.eliminate) this.eliminate(pair);
    if (step.place) this.place(step.place);
  }

  /** Finds the easiest available deduction, up to `maxLevel`. */
  next(maxLevel: TechniqueLevel = 3): Deduction | null {
    return (
      this.findSingle() ??
      (maxLevel >= 2 ? (this.findSharedCell() ?? this.findDeadEnd()) : null) ??
      (maxLevel >= 3 ? this.findLookahead() : null)
    );
  }

  // --- Level 1 -------------------------------------------------------------

  private findSingle(): Deduction | null {
    const { cellEdges, cellCount } = this.topo;
    for (let c = 0; c < cellCount; c++) {
      if (this.cellDone[c]) continue;
      const only = this.onlyLive(cellEdges[c]!);
      if (only >= 0) {
        const pair = this.pairOf(only);
        return { technique: 'cell-single', level: 1, place: pair, eliminate: [], focus: [c] };
      }
    }
    for (let d = 0; d < this.dominoEdges.length; d++) {
      if (this.dominoDone[d]) continue;
      const only = this.onlyLive(this.dominoEdges[d]!);
      if (only >= 0) {
        const pair = this.pairOf(only);
        return { technique: 'domino-single', level: 1, place: pair, eliminate: [], focus: [pair.a, pair.b] };
      }
    }
    return null;
  }

  // --- Level 2 -------------------------------------------------------------

  private findSharedCell(): Deduction | null {
    const { edgeA, edgeB, cellEdges } = this.topo;
    for (let d = 0; d < this.dominoEdges.length; d++) {
      if (this.dominoDone[d]) continue;
      const slots = this.dominoEdges[d]!.filter((e) => this.live[e]);
      if (slots.length < 2) continue;
      const first = slots[0]!;
      for (const shared of [edgeA[first]!, edgeB[first]!]) {
        if (!slots.every((e) => edgeA[e] === shared || edgeB[e] === shared)) continue;
        const eliminate = cellEdges[shared]!.filter((e) => this.live[e] && this.edgeDomino[e] !== d).map(
          (e) => this.pairOf(e),
        );
        if (eliminate.length > 0) {
          return { technique: 'domino-shared-cell', level: 2, place: null, eliminate, focus: [shared] };
        }
      }
    }
    return null;
  }

  private findDeadEnd(): Deduction | null {
    const { edgeA, edgeB, cellEdges, edgeCount } = this.topo;
    for (let e = 0; e < edgeCount; e++) {
      if (!this.live[e]) continue;
      const a = edgeA[e]!;
      const b = edgeB[e]!;
      const d = this.edgeDomino[e]!;
      const removed = new Set<number>([...cellEdges[a]!, ...cellEdges[b]!, ...this.dominoEdges[d]!]);

      // Cells that would lose slots: neighbours of a and b, and cells of d's other slots.
      const cells = new Set<number>();
      const dominoes = new Set<number>();
      for (const x of removed) {
        if (!this.live[x]) continue;
        cells.add(edgeA[x]!);
        cells.add(edgeB[x]!);
        dominoes.add(this.edgeDomino[x]!);
      }
      cells.delete(a);
      cells.delete(b);
      dominoes.delete(d);

      const starves = (edges: readonly number[]): boolean =>
        !edges.some((x) => this.live[x] && !removed.has(x));

      for (const c of cells) {
        if (!this.cellDone[c] && starves(cellEdges[c]!)) {
          return {
            technique: 'dead-end',
            level: 2,
            place: null,
            eliminate: [this.pairOf(e)],
            focus: [a, b, c],
          };
        }
      }
      for (const other of dominoes) {
        if (!this.dominoDone[other] && starves(this.dominoEdges[other]!)) {
          return { technique: 'dead-end', level: 2, place: null, eliminate: [this.pairOf(e)], focus: [a, b] };
        }
      }
    }
    return null;
  }

  // --- Level 3 -------------------------------------------------------------

  private findLookahead(): Deduction | null {
    for (let e = 0; e < this.topo.edgeCount; e++) {
      if (!this.live[e]) continue;
      const pair = this.pairOf(e);
      const trial = this.clone();
      trial.place(pair);
      if (trial.propagateSingles()) {
        return { technique: 'lookahead', level: 3, place: null, eliminate: [pair], focus: [pair.a, pair.b] };
      }
    }
    return null;
  }

  /** Applies singles until none are left. Returns true if a contradiction appears. */
  private propagateSingles(): boolean {
    for (;;) {
      if (this.hasContradiction) return true;
      const step = this.findSingle();
      if (!step) return false;
      this.apply(step);
    }
  }

  // --- Helpers -------------------------------------------------------------

  private countLive(edges: readonly number[]): number {
    let n = 0;
    for (const e of edges) if (this.live[e]) n++;
    return n;
  }

  /** The only live edge in the list, or -1 if there are zero or several. */
  private onlyLive(edges: readonly number[]): number {
    let found = -1;
    for (const e of edges) {
      if (!this.live[e]) continue;
      if (found >= 0) return -1;
      found = e;
    }
    return found;
  }

  private pairOf(e: number): Pair {
    return { a: this.topo.edgeA[e]!, b: this.topo.edgeB[e]! };
  }

  private edgeOf(pair: Pair): number {
    const e = this.topo.edgeBetween(pair.a, pair.b);
    if (e < 0) throw new RangeError(`Cells ${pair.a} and ${pair.b} are not adjacent`);
    return e;
  }
}
