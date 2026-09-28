/**
 * Saving and restoring a game in progress: dominoes, walls, undo history and
 * time played. The stored shape is compact JSON; restoring validates all of it,
 * because stored data may come from an older build or from a level whose
 * content has changed since.
 */
import { areAdjacent, encodeCells, getTopology, type CellIndex, type Puzzle } from '@/core';

import { createGame, isSolved, MAX_UNDO, revert, type Change, type GameState } from './game';

export interface SavedGame {
  /** Pips of the puzzle it was played on, so a level whose content changed is never restored. */
  readonly cells: string;
  /** One character per cell: direction of its partner (R, L, D, U) or "." when empty. */
  readonly board: string;
  /** Walled edges, ascending. */
  readonly walls: readonly number[];
  /** Undo history, oldest first. */
  readonly past: readonly Change[];
  /** Time played so far, in milliseconds. */
  readonly elapsedMs: number;
  /** ISO date of the last save. */
  readonly savedAt: string;
}

export type SavedGames = Readonly<Record<string, SavedGame>>;

/** Games in progress kept on the device; beyond this, the least recently played are dropped. */
export const MAX_SAVED_GAMES = 30;

export function saveGame(game: GameState, elapsedMs: number, now: Date): SavedGame {
  const { puzzle } = game;
  const walls: number[] = [];
  game.walls.forEach((w, edge) => {
    if (w) walls.push(edge);
  });
  return {
    cells: encodeCells(puzzle.cells),
    board: encodeBoard(game.partner, puzzle.cols),
    walls,
    past: game.past,
    elapsedMs: Math.max(0, Math.round(elapsedMs)),
    savedAt: now.toISOString(),
  };
}

/**
 * Rebuilds a saved game for `puzzle`, or returns null when the data does not
 * belong to it, is malformed, or is already solved. A damaged undo history
 * only loses its broken (oldest) part; the board itself is kept.
 */
export function restoreGame(
  puzzle: Puzzle,
  saved: unknown,
): { readonly game: GameState; readonly elapsedMs: number } | null {
  if (!isRecord(saved) || saved.cells !== encodeCells(puzzle.cells)) return null;
  if (typeof saved.board !== 'string') return null;

  const partner = decodeBoard(saved.board, puzzle.cols, puzzle.cells.length);
  if (!partner) return null;

  const topo = getTopology(puzzle.rows, puzzle.cols);
  const walls = new Array<boolean>(topo.edgeCount).fill(false);
  if (!Array.isArray(saved.walls)) return null;
  for (const edge of saved.walls) {
    if (!isIndex(edge, topo.edgeCount)) return null;
    // A domino never lies on a walled edge.
    if (partner[topo.edgeA[edge]!] === topo.edgeB[edge]) return null;
    walls[edge] = true;
  }

  const base = createGame(puzzle);
  const game: GameState = { ...base, partner, walls, past: [] };
  if (isSolved(game)) return null;

  const past = Array.isArray(saved.past) ? validHistory(game, saved.past) : [];
  const elapsed =
    typeof saved.elapsedMs === 'number' && Number.isFinite(saved.elapsedMs) ? saved.elapsedMs : 0;
  return { game: { ...game, past }, elapsedMs: Math.max(0, Math.round(elapsed)) };
}

/** Adds or replaces a saved game, dropping the least recently saved ones beyond the cap. */
export function withSavedGame(
  games: SavedGames,
  levelId: string,
  saved: SavedGame,
  max: number = MAX_SAVED_GAMES,
): SavedGames {
  const next: Record<string, SavedGame> = { ...games, [levelId]: saved };
  const ids = Object.keys(next);
  if (ids.length > max) {
    ids
      .filter((id) => id !== levelId)
      .sort((x, y) => next[x]!.savedAt.localeCompare(next[y]!.savedAt))
      .slice(0, ids.length - max)
      .forEach((id) => delete next[id]);
  }
  return next;
}

export function withoutSavedGame(games: SavedGames, levelId: string): SavedGames {
  if (!(levelId in games)) return games;
  const next = { ...games };
  delete next[levelId];
  return next;
}

/**
 * Saved games loaded from storage, keeping only entries with the right basic
 * shape. Each game is fully validated later, by {@link restoreGame}.
 */
export function sanitizeSavedGames(value: unknown): SavedGames {
  if (!isRecord(value)) return {};
  const games: Record<string, SavedGame> = {};
  for (const [id, game] of Object.entries(value)) {
    if (
      isRecord(game) &&
      typeof game.cells === 'string' &&
      typeof game.board === 'string' &&
      typeof game.savedAt === 'string'
    ) {
      games[id] = game as unknown as SavedGame;
    }
  }
  return games;
}

/** Dominoes on the board of a saved game. */
export function savedPlacedCount(saved: SavedGame): number {
  let covered = 0;
  for (const ch of saved.board) if (ch !== '.') covered++;
  return covered / 2;
}

// --- Encoding ------------------------------------------------------------------

export function encodeBoard(partner: readonly CellIndex[], cols: number): string {
  return partner
    .map((p, cell) => {
      if (p < 0) return '.';
      switch (p - cell) {
        case 1:
          return 'R';
        case -1:
          return 'L';
        case cols:
          return 'D';
        case -cols:
          return 'U';
        default:
          throw new RangeError(`Cells ${cell} and ${p} are not adjacent`);
      }
    })
    .join('');
}

/** Partner array for an encoded board, or null when it is malformed or inconsistent. */
export function decodeBoard(text: string, cols: number, size: number): CellIndex[] | null {
  if (text.length !== size) return null;
  const offsets: Record<string, number> = { R: 1, L: -1, D: cols, U: -cols };
  const partner = Array.from(text, (ch, cell) => {
    if (ch === '.') return -1;
    const offset = offsets[ch];
    return offset === undefined ? Number.NaN : cell + offset;
  });
  return isConsistent(partner, cols) ? partner : null;
}

// --- Validation ----------------------------------------------------------------

function isConsistent(partner: readonly number[], cols: number): boolean {
  const size = partner.length;
  return partner.every(
    (p, cell) => p === -1 || (isIndex(p, size) && partner[p] === cell && areAdjacent(cell, p, cols)),
  );
}

/**
 * The most recent part of `history` that can be undone step by step from
 * `game` through consistent boards (capped at {@link MAX_UNDO}).
 */
function validHistory(game: GameState, history: readonly unknown[]): Change[] {
  const size = game.partner.length;
  const edges = game.walls.length;
  const topo = getTopology(game.puzzle.rows, game.puzzle.cols);
  const kept: Change[] = [];
  let { partner, walls }: { partner: readonly CellIndex[]; walls: readonly boolean[] } = game;

  for (let i = history.length - 1; i >= 0 && kept.length < MAX_UNDO; i--) {
    const change = toChange(history[i], size, edges);
    if (!change) break;
    const before = revert(partner, walls, change);
    if (!isConsistent(before.partner, game.puzzle.cols)) break;
    const wallUnderDomino = before.walls.some(
      (w, e) => w && before.partner[topo.edgeA[e]!] === topo.edgeB[e],
    );
    if (wallUnderDomino) break;
    kept.push(change);
    ({ partner, walls } = before);
  }
  return kept.reverse();
}

function toChange(value: unknown, size: number, edges: number): Change | null {
  if (!isRecord(value)) return null;
  const { cells, partners, walls } = value;
  if (!Array.isArray(cells) || !Array.isArray(partners) || !Array.isArray(walls)) return null;
  if (cells.length !== partners.length || cells.length + walls.length === 0) return null;
  if (!cells.every((c) => isIndex(c, size))) return null;
  if (!partners.every((p) => p === -1 || isIndex(p, size))) return null;
  if (!walls.every((e) => isIndex(e, edges))) return null;
  return { cells, partners, walls } as Change;
}

function isIndex(value: unknown, size: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < size;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
