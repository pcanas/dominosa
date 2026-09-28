import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BoardInput, TAP_MAX_MS, type BoardTool } from '../board-input';
import { computeMetrics, tapTargetAt } from '../geometry';

// 5 rows × 4 cols, cell 50, gap 6, padding 8: cell 5 is at (64..114, 64..114).
const metrics = computeMetrics(5, 4, 234, 1000, { gap: 6, padding: 8, maxCell: 50 });

/** Board with a wall between cells 5 and 6 and nothing else. */
const hitTest = (x: number, y: number) =>
  tapTargetAt(metrics, x, y, {
    hasWall: (a, b) => (a === 5 && b === 6) || (a === 6 && b === 5),
    isCovered: () => false,
  });

function setup(tool: BoardTool = 'domino') {
  const onPlace = vi.fn();
  const onWall = vi.fn();
  const onTap = vi.fn();
  const input = new BoardInput();
  input.configure({ metrics, tool, onPlace, onWall, onTap, hitTest });
  const changes = vi.fn();
  input.subscribe(changes);
  return { input, onPlace, onWall, onTap, changes };
}

describe('BoardInput', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('places a domino after a long enough drag', () => {
    const { input, onPlace } = setup();
    input.begin(70, 80);
    expect(input.getDrag()).toEqual({
      start: 5,
      target: -1,
      tool: 'domino',
      press: { kind: 'cell', cell: 5 },
    });
    input.startSwipe();
    input.move(10, 2);
    expect(input.getDrag()).toEqual({ start: 5, target: -1, tool: 'domino', press: null });
    input.move(30, 4);
    expect(input.getDrag()).toEqual({ start: 5, target: 6, tool: 'domino', press: null });
    input.end();
    input.finalize();
    expect(onPlace).toHaveBeenCalledWith(5, 6);
    expect(input.getDrag()).toBeNull();
  });

  it('cancels when the finger slides back before releasing', () => {
    const { input, onPlace } = setup();
    input.begin(80, 80);
    input.move(0, 40);
    expect(input.getDrag()?.target).toBe(9);
    input.move(0, 5);
    input.end();
    input.finalize();
    expect(onPlace).not.toHaveBeenCalled();
  });

  it('ignores drags that start outside the grid', () => {
    const { input, onPlace } = setup();
    input.begin(1, 1);
    input.move(40, 0);
    input.end();
    expect(input.getDrag()).toBeNull();
    expect(onPlace).not.toHaveBeenCalled();
  });

  it('draws walls when the wall tool is selected', () => {
    const { input, onPlace, onWall } = setup('wall');
    input.begin(70, 80);
    input.move(0, 30);
    expect(input.getDrag()).toMatchObject({ start: 5, target: 9, tool: 'wall' });
    input.end();
    input.finalize();
    expect(onWall).toHaveBeenCalledWith(5, 9);
    expect(onPlace).not.toHaveBeenCalled();
  });

  it('never switches tools by holding the finger still', () => {
    const { input, onPlace, onWall } = setup();
    input.begin(70, 80);
    vi.advanceTimersByTime(2_000);
    input.startSwipe();
    input.move(30, 0);
    input.end();
    expect(onPlace).toHaveBeenCalledWith(5, 6);
    expect(onWall).not.toHaveBeenCalled();
  });

  it('reports what a tap is aimed at: a wall near it, otherwise the cell', () => {
    const { input, onTap } = setup();
    input.tap(110, 90); // close to the wall 5–6
    input.tap(70, 90); // far side of cell 5
    input.tap(1, 1); // outside the grid
    expect(onTap.mock.calls).toEqual([[{ kind: 'wall', a: 5, b: 6 }], [{ kind: 'cell', cell: 5 }]]);
  });

  it('shows the wall a resting finger would remove, until it moves or rests too long', () => {
    const { input } = setup();
    input.begin(110, 90);
    expect(input.getDrag()?.press).toEqual({ kind: 'wall', a: 5, b: 6 });
    input.startSwipe();
    expect(input.getDrag()?.press).toBeNull();

    input.finalize();
    input.begin(110, 90);
    vi.advanceTimersByTime(TAP_MAX_MS);
    expect(input.getDrag()?.press).toBeNull();
  });

  it('notifies subscribers only when the drag feedback changes', () => {
    const { input, changes } = setup();
    input.begin(70, 80); // start
    input.startSwipe(); // no longer a tap
    input.move(30, 0); // target 6
    input.move(35, 0); // still 6: no change
    input.finalize(); // cleared
    expect(changes).toHaveBeenCalledTimes(4);
  });

  it('does nothing before it has metrics', () => {
    const input = new BoardInput();
    input.begin(80, 80);
    input.tap(80, 80);
    expect(input.getDrag()).toBeNull();
  });
});
