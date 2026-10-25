import { describe, expect, it } from 'vitest';

import { pickCell, type PickContext } from '../tap-select';

// 3 columns: cell 4 has neighbours 1, 3, 5 and 7. Domino on 0–1, wall between 4 and 5.
const ctx = (wallMode = false): PickContext => ({
  cols: 3,
  partnerOf: (cell) => (cell === 0 ? 1 : cell === 1 ? 0 : -1),
  hasWall: (a, b) => (a === 4 && b === 5) || (a === 5 && b === 4),
  wallMode,
});

describe('pickCell', () => {
  it('selects the first cell picked', () => {
    expect(pickCell(null, 4, ctx())).toEqual({ selected: 4, action: null });
  });

  it('places a domino on a selected cell and its neighbour', () => {
    expect(pickCell(4, 7, ctx())).toEqual({ selected: null, action: { type: 'place', a: 4, b: 7 } });
    expect(pickCell(4, 3, ctx())).toEqual({ selected: null, action: { type: 'place', a: 4, b: 3 } });
  });

  it('moves the selection to a cell that is not a neighbour', () => {
    expect(pickCell(4, 8, ctx())).toEqual({ selected: 8, action: null });
    // Same row index arithmetic, different rows: 2 and 3 are not neighbours.
    expect(pickCell(2, 3, ctx())).toEqual({ selected: 3, action: null });
  });

  it('removes the domino when its cell is picked twice, and deselects an empty one', () => {
    expect(pickCell(0, 0, ctx())).toEqual({ selected: null, action: { type: 'remove', cell: 0 } });
    expect(pickCell(4, 4, ctx())).toEqual({ selected: null, action: null });
  });

  it('draws or removes walls with the wall button on', () => {
    expect(pickCell(4, 7, ctx(true))).toEqual({ selected: null, action: { type: 'addWall', a: 4, b: 7 } });
    expect(pickCell(5, 4, ctx(true))).toEqual({ selected: null, action: { type: 'removeWall', a: 5, b: 4 } });
  });
});
