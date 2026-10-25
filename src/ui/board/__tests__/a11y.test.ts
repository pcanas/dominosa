import { describe, expect, it, vi } from 'vitest';

import { createPuzzle } from '@/core';
import { createGame, gameReducer, type GameAction, type GameState } from '@/game';

// The real strings module is pure, but `@/i18n` pulls in Expo; load the table directly.
vi.mock('@/i18n', async () => ({ ...(await import('@/i18n/strings')) }));
const { STRINGS } = await import('@/i18n/strings');
const { announcementFor, cellActions, describeCells } = await import('../a11y');

const t = STRINGS.es;

/*
 * 3×2 order-1 board:
 *   0 1
 *   0 1
 *   1 0
 */
const puzzle = createPuzzle(1, 3, 2, [0, 1, 0, 1, 1, 0]);
const play = (...actions: GameAction[]): GameState => actions.reduce(gameReducer, createGame(puzzle));

describe('describeCells', () => {
  it('says position and number of an empty cell', () => {
    expect(describeCells(play(), null, t)[3]).toBe('Fila 2, columna 2: 1');
  });

  it('adds the domino, its direction, repeats, walls and selection', () => {
    // 0–1 placed twice (repeated), wall between 4 and 5, cell 2 selected.
    const game = play(
      { type: 'place', a: 0, b: 1 },
      { type: 'place', a: 2, b: 3 },
      { type: 'addWall', a: 4, b: 5 },
    );
    const cells = describeCells(game, 2, t);
    expect(cells[0]).toBe('Fila 1, columna 1: 0, ficha 0 y 1 hacia la derecha, repetida');
    expect(cells[3]).toBe('Fila 2, columna 2: 1, ficha 0 y 1 hacia la izquierda, repetida');
    expect(cells[2]).toBe('Fila 2, columna 1: 0, ficha 0 y 1 hacia la derecha, repetida, seleccionada');
    expect(cells[4]).toBe('Fila 3, columna 1: 1, muro a la derecha');
    expect(describeCells(play({ type: 'place', a: 0, b: 2 }), null, t)[2]).toBe(
      'Fila 2, columna 1: 0, ficha 0 y 0 hacia arriba',
    );
  });
});

describe('cellActions', () => {
  it('offers joining and walling each neighbour, and removing what is there', () => {
    const game = play({ type: 'place', a: 0, b: 2 }, { type: 'addWall', a: 2, b: 3 });
    expect(cellActions(game, 2, t).map((a) => a.label)).toEqual([
      'Muro con la de arriba',
      'Unir con la de abajo',
      'Muro con la de abajo',
      'Quitar el muro con la de la derecha',
      'Quitar la ficha',
    ]);
    const join = cellActions(game, 2, t).find((a) => a.name === 'join-down');
    expect(join?.action).toEqual({ type: 'place', a: 2, b: 4 });
  });
});

describe('announcementFor', () => {
  const place = (a: number, b: number): GameAction => ({ type: 'place', a, b });

  it('describes each kind of move', () => {
    const once = play(place(0, 2));
    expect(announcementFor(place(0, 2), 'placed', once, t, '')).toBe('Ficha 0 y 0 colocada');
    const twice = play(place(0, 1), place(2, 3));
    expect(announcementFor(place(2, 3), 'placed', twice, t, '')).toBe('Ficha 0 y 1 colocada. Está repetida');
    expect(announcementFor({ type: 'remove', cell: 0 }, 'removed', play(), t, '')).toBe('Ficha quitada');
    expect(announcementFor({ type: 'undo' }, 'removed', play(), t, '')).toBe('Deshecho');
    expect(announcementFor({ type: 'reset' }, 'removed', play(), t, '')).toBe('Tablero vacío');
    expect(announcementFor({ type: 'addWall', a: 0, b: 1 }, 'wallAdded', play(), t, '')).toBe('Muro puesto');
    expect(announcementFor(place(0, 1), 'blocked', play(), t, '')).toBe('Hay un muro entre esas celdas');
    expect(announcementFor(place(0, 1), 'solved', play(), t, '¡Resuelto!')).toBe('¡Resuelto!');
    expect(announcementFor(place(0, 1), 'unchanged', play(), t, '')).toBeNull();
  });
});
