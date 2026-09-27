import { describe, expect, it, vi } from 'vitest';

import { BoardInput } from '../board-input';
import { computeMetrics } from '../geometry';

// 5 rows × 4 cols, cell 50, gap 6, padding 8: cell 5 is at (64..114, 64..114).
const metrics = computeMetrics(5, 4, 234, 1000, { gap: 6, padding: 8, maxCell: 50 });

function setup() {
  const onPlace = vi.fn();
  const onTap = vi.fn();
  const input = new BoardInput();
  input.configure({ metrics, onPlace, onTap });
  const changes = vi.fn();
  input.subscribe(changes);
  return { input, onPlace, onTap, changes };
}

describe('BoardInput', () => {
  it('places a domino after a long enough drag', () => {
    const { input, onPlace } = setup();
    input.begin(80, 80);
    expect(input.getDrag()).toEqual({ start: 5, target: -1 });
    input.move(10, 2);
    expect(input.getDrag()?.target).toBe(-1);
    input.move(30, 4);
    expect(input.getDrag()).toEqual({ start: 5, target: 6 });
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

  it('reports taps on cells only', () => {
    const { input, onTap } = setup();
    input.tap(80, 80);
    input.tap(1, 1);
    expect(onTap).toHaveBeenCalledTimes(1);
    expect(onTap).toHaveBeenCalledWith(5);
  });

  it('notifies subscribers only when the drag feedback changes', () => {
    const { input, changes } = setup();
    input.begin(80, 80); // start
    input.move(30, 0); // target 6
    input.move(35, 0); // still 6: no change
    input.finalize(); // cleared
    expect(changes).toHaveBeenCalledTimes(3);
  });

  it('does nothing before it has metrics', () => {
    const input = new BoardInput();
    input.begin(80, 80);
    input.tap(80, 80);
    expect(input.getDrag()).toBeNull();
  });
});
