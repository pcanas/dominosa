import { describe, expect, it } from 'vitest';

import { createPuzzle, dominoId, type Deduction } from '@/core';
import { createGame, gameReducer, nextHint, type GameAction, type Hint } from '@/game';
import { STRINGS } from '@/i18n/strings';

import { describeHint } from '../hint-text';

const t = STRINGS.es;

/*
 * 3×2 order-1 board, unique solution [0,2] [1,3] [4,5]:
 *   0 1
 *   0 1
 *   1 0
 */
const puzzle = createPuzzle(1, 3, 2, [0, 1, 0, 1, 1, 0]);
const solution = [2, 3, 0, 1, 5, 4];
const play = (...actions: GameAction[]) => actions.reduce(gameReducer, createGame(puzzle));
const empty = createGame(puzzle);
const visual = { pickMode: false };

const step = (deduction: Partial<Deduction>): Hint => ({
  kind: 'step',
  step: {
    technique: 'cell-single',
    level: 1,
    place: null,
    eliminate: [],
    focus: [0],
    domino: dominoId(0, 1, 1),
    ...deduction,
  },
});

describe('describeHint', () => {
  it('first only says where to look, and names the cells for screen readers', () => {
    const hint = nextHint(empty, solution)!;
    const view = describeHint(hint, 1, empty, t, visual);
    expect(view).toMatchObject({ text: t.hint.look, next: t.hint.why });
    expect(view.marks.cells.length).toBeGreaterThan(0);
    expect(view.marks.place).toBeNull();

    const spoken = describeHint(step({ focus: [3] }), 1, empty, t, { pickMode: true });
    expect(spoken.text).toBe(t.hint.lookAt(t.a11y.cell(2, 2, 1)));
  });

  it('then explains the step with its numbers and shows where the domino goes', () => {
    const hint = step({
      technique: 'cell-single',
      focus: [0],
      place: { a: 0, b: 2 },
      domino: dominoId(0, 0, 1),
    });
    const view = describeHint(hint, 2, empty, t, visual);
    expect(view).toMatchObject({ text: t.hint.cellSingle(0, 0), next: t.hint.doIt });
    expect(view.marks).toMatchObject({ cells: [0], place: { a: 0, b: 2 }, walls: [] });
  });

  it('says why a free neighbour is ruled out: a domino already placed, or a wall', () => {
    const single = step({ technique: 'cell-single', focus: [0], place: { a: 0, b: 2 } });
    // The 0–1 is down at the bottom: the 1 next to this 0 would make it again.
    const used = play({ type: 'place', a: 4, b: 5 });
    expect(describeHint(single, 2, used, t, visual).text).toBe(
      'Este 0 solo puede ir con el 0: con el 1 sería la ficha 0–1, que ya está puesta',
    );
    expect(describeHint(single, 2, used, t, visual).spoken).toBe(
      t.hint.cellSingleBecause(0, 0, [t.hint.becauseUsed([{ neighbour: 1, pair: t.a11y.pairSpoken(0, 1) }])]),
    );
    const walled = play({ type: 'addWall', a: 0, b: 1 });
    expect(describeHint(single, 2, walled, t, visual).text).toBe(
      'Este 0 solo puede ir con el 0: un muro lo separa del 1',
    );
  });

  it('puts several reasons in one sentence', () => {
    const used = [
      { neighbour: 3, pair: '1–3' },
      { neighbour: 2, pair: '1–2' },
    ] as const;
    expect(t.hint.cellSingleBecause(1, 1, [t.hint.becauseUsed(used), t.hint.becauseWalls([0, 4])])).toBe(
      'Este 1 solo puede ir con el 1: con el 3 sería la ficha 1–3 y con el 2 la 1–2, que ya están puestas y unos muros lo separan del 0 y del 4',
    );
    expect(STRINGS.en.hint.becauseUsed(used)).toBe(
      'with the 3 it would be the 1–3 and with the 2 the 1–2, which are already placed',
    );
    expect(STRINGS.fr.hint.becauseWalls([0])).toBe('un mur le sépare du 0');
  });

  it('has a sentence for every technique', () => {
    const walls = [{ a: 0, b: 1 }];
    const d01 = dominoId(0, 1, 1);
    const d11 = dominoId(1, 1, 1);
    const cases: [Partial<Deduction>, string][] = [
      [{ technique: 'domino-single', place: { a: 0, b: 1 }, focus: [0, 1] }, t.hint.dominoSingle('0–1')],
      [{ technique: 'domino-shared-cell', eliminate: walls, focus: [1] }, t.hint.sharedCell('0–1', 1)],
      [
        { technique: 'dead-end', eliminate: walls, focus: [0, 1, 3], starved: { cell: 3 } },
        t.hint.deadEndCell('0–1', 1),
      ],
      [
        { technique: 'dead-end', eliminate: walls, focus: [0, 1], starved: { domino: d11 } },
        t.hint.deadEndDomino('0–1', '1–1'),
      ],
      [{ technique: 'lookahead', eliminate: walls, focus: [0, 1] }, t.hint.lookahead('0–1')],
    ];
    for (const [deduction, text] of cases) {
      const view = describeHint(step({ domino: d01, ...deduction }), 2, empty, t, visual);
      expect(view.text).toBe(text);
      expect(view.marks.walls).toEqual(deduction.place ? [] : walls);
    }
  });

  it('says pairs aloud as two numbers', () => {
    const view = describeHint(
      step({ technique: 'lookahead', eliminate: [{ a: 0, b: 1 }] }),
      2,
      empty,
      t,
      visual,
    );
    expect(view.text).toBe(t.hint.lookahead('0–1'));
    expect(view.spoken).toBe(t.hint.lookahead(t.a11y.pairSpoken(0, 1)));
  });

  it('first says there is a mistake, then shows it', () => {
    // The wall first, then the domino: the most recent mistake is shown first.
    const game = play({ type: 'addWall', a: 4, b: 5 }, { type: 'place', a: 0, b: 1 });
    const hint = nextHint(game, solution)!;
    expect(describeHint(hint, 1, game, t, visual)).toMatchObject({
      text: t.hint.mistakes(2),
      next: t.hint.where,
      marks: { cells: [] },
    });
    expect(describeHint(hint, 2, game, t, visual)).toMatchObject({
      text: t.hint.wrongDomino('0–1'),
      next: t.hint.removeDomino,
      marks: { cells: [0, 1], wrongDomino: { a: 0, b: 1 } },
    });

    const wallOnly = play({ type: 'addWall', a: 4, b: 5 });
    const wallHint = nextHint(wallOnly, solution)!;
    expect(describeHint(wallHint, 1, wallOnly, t, visual).text).toBe(t.hint.mistake);
    expect(describeHint(wallHint, 2, wallOnly, t, visual)).toMatchObject({
      text: t.hint.wrongWall,
      next: t.hint.removeWall,
      marks: { wrongWall: { a: 4, b: 5 } },
    });
  });

  it('reveals a domino with its numbers', () => {
    const hint: Hint = { kind: 'reveal', pair: { a: 4, b: 5 }, domino: dominoId(1, 0, 1) };
    expect(describeHint(hint, 2, empty, t, visual)).toMatchObject({
      text: t.hint.reveal('0–1'),
      next: t.hint.doIt,
      marks: { cells: [4, 5], place: { a: 4, b: 5 } },
    });
  });
});
