/**
 * What the board says to screen readers: a description of every cell, the
 * actions VoiceOver offers on a cell, and the message after each move.
 * Pure (strings come in as an argument), so it is tested without a device.
 */
import { DIRECTIONS, dominoId, dominoPips, neighbourOf, type CellIndex, type Direction } from '@/core';
import { hasWall, placedTiles, type GameAction, type GameState } from '@/game';
import type { Strings } from '@/i18n';
import type { DispatchOutcome } from '@/state/session-store';

function directionTo(from: CellIndex, to: CellIndex, cols: number): Direction {
  if (to === from - cols) return 'up';
  if (to === from + cols) return 'down';
  return to === from - 1 ? 'left' : 'right';
}

/** "3 y 5" for the domino on two cells, lower pip first. */
export function spokenPair(game: GameState, a: CellIndex, b: CellIndex, t: Strings): string {
  const { cells, order } = game.puzzle;
  const [lo, hi] = dominoPips(dominoId(cells[a]!, cells[b]!, order), order);
  return t.a11y.pairSpoken(lo, hi);
}

/**
 * One description per cell: position and number, the domino on it (and which
 * way it goes, and whether it is repeated), its walls, and whether it is selected.
 */
export function describeCells(game: GameState, selected: CellIndex | null, t: Strings): string[] {
  const { rows, cols, cells } = game.puzzle;
  const duplicates = new Set(
    placedTiles(game)
      .filter((tile) => tile.duplicate)
      .map((tile) => tile.a),
  );
  return cells.map((pip, cell) => {
    const parts = [t.a11y.cell(Math.floor(cell / cols) + 1, (cell % cols) + 1, pip)];
    const partner = game.partner[cell]!;
    if (partner >= 0) {
      parts.push(
        t.a11y.domino(spokenPair(game, cell, partner, t), t.a11y.towards[directionTo(cell, partner, cols)]),
      );
      if (duplicates.has(Math.min(cell, partner))) parts.push(t.a11y.duplicate);
    }
    for (const dir of DIRECTIONS) {
      const n = neighbourOf(cell, dir, rows, cols);
      if (n >= 0 && hasWall(game, cell, n)) parts.push(t.a11y.wallAt[dir]);
    }
    if (cell === selected) parts.push(t.a11y.cellSelected);
    return parts.join(', ');
  });
}

export interface CellAction {
  /** Stable id passed back by the screen reader. */
  readonly name: string;
  readonly label: string;
  readonly action: GameAction;
}

/**
 * Actions a screen reader offers on a cell (VoiceOver: swipe up or down):
 * join with or wall off each neighbour, remove a wall, remove the domino.
 */
export function cellActions(game: GameState, cell: CellIndex, t: Strings): CellAction[] {
  const { rows, cols } = game.puzzle;
  const actions: CellAction[] = [];
  for (const dir of DIRECTIONS) {
    const n = neighbourOf(cell, dir, rows, cols);
    if (n < 0) continue;
    const neighbour = t.a11y.neighbour[dir];
    if (hasWall(game, cell, n)) {
      actions.push({
        name: `unwall-${dir}`,
        label: t.a11y.removeWallWith(neighbour),
        action: { type: 'removeWall', a: cell, b: n },
      });
      continue;
    }
    if (game.partner[cell] !== n) {
      actions.push({
        name: `join-${dir}`,
        label: t.a11y.joinWith(neighbour),
        action: { type: 'place', a: cell, b: n },
      });
    }
    actions.push({
      name: `wall-${dir}`,
      label: t.a11y.wallWith(neighbour),
      action: { type: 'addWall', a: cell, b: n },
    });
  }
  if (game.partner[cell]! >= 0) {
    actions.push({ name: 'remove', label: t.a11y.removeDomino, action: { type: 'remove', cell } });
  }
  return actions;
}

/** What to say after a move, or null when nothing happened. `solved` is the solve message. */
export function announcementFor(
  action: GameAction,
  outcome: DispatchOutcome,
  after: GameState,
  t: Strings,
  solved: string,
): string | null {
  switch (outcome) {
    case 'unchanged':
      return null;
    case 'blocked':
      return t.announce.blocked;
    case 'solved':
      return solved;
    case 'wallAdded':
      return t.announce.wallAdded;
    case 'wallRemoved':
      return t.announce.wallRemoved;
    case 'placed':
    case 'removed':
      if (action.type === 'undo') return t.announce.undone;
      if (action.type === 'reset') return t.announce.reset;
      if (action.type === 'place') {
        const pair = spokenPair(after, action.a, action.b, t);
        const tile = placedTiles(after).find((p) => p.a === Math.min(action.a, action.b));
        return tile?.duplicate ? t.announce.placedDuplicate(pair) : t.announce.placed(pair);
      }
      return t.announce.removed;
  }
}
