import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BoardInput, HOLD_MS, type BoardTool } from '../board-input';
import { computeMetrics } from '../geometry';

// 5 rows × 4 cols, cell 50, gap 6, padding 8: cell 5 is at (64..114, 64..114).
const metrics = computeMetrics(5, 4, 234, 1000, { gap: 6, padding: 8, maxCell: 50 });

function setup(tool: BoardTool = 'domino') {
  const onPlace = vi.fn();
  const onWall = vi.fn();
  const onTap = vi.fn();
  const onHold = vi.fn();
  const input = new BoardInput();
  input.configure({ metrics, tool, onPlace, onWall, onTap, onHold });
  const changes = vi.fn();
  input.subscribe(changes);
  return { input, onPlace, onWall, onTap, onHold, changes };
}

describe('BoardInput', () => {
  it('places a domino after a long enough drag', () => {
    const { input, onPlace } = setup();
    input.begin(80, 80);
    expect(input.getDrag()).toEqual({ start: 5, target: -1, tool: 'domino' });
    input.move(10, 2);
    expect(input.getDrag()?.target).toBe(-1);
    input.move(30, 4);
    expect(input.getDrag()).toEqual({ start: 5, target: 6, tool: 'domino' });
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

  it('toggles walls when the wall tool is selected', () => {
    const { input, onPlace, onWall } = setup('wall');
    input.begin(80, 80);
    input.move(0, 30);
    expect(input.getDrag()).toEqual({ start: 5, target: 9, tool: 'wall' });
    input.end();
    input.finalize();
    expect(onWall).toHaveBeenCalledWith(5, 9);
    expect(onPlace).not.toHaveBeenCalled();
  });

  describe('hold, then swipe', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('switches to the other tool when the finger rests before moving', () => {
      const { input, onPlace, onWall, onHold } = setup();
      input.begin(80, 80);
      vi.advanceTimersByTime(HOLD_MS);
      expect(input.getDrag()).toEqual({ start: 5, target: -1, tool: 'wall' });
      expect(onHold).toHaveBeenCalledWith('wall');
      input.activate();
      input.move(30, 0);
      input.end();
      input.finalize();
      expect(onWall).toHaveBeenCalledWith(5, 6);
      expect(onPlace).not.toHaveBeenCalled();
    });

    it('places dominoes with a hold while the wall tool is selected', () => {
      const { input, onPlace, onHold } = setup('wall');
      input.begin(80, 80);
      vi.advanceTimersByTime(HOLD_MS);
      expect(onHold).toHaveBeenCalledWith('domino');
      input.move(30, 0);
      input.end();
      expect(onPlace).toHaveBeenCalledWith(5, 6);
    });

    it('does not switch once the finger has started moving', () => {
      const { input, onHold, onPlace } = setup();
      input.begin(80, 80);
      vi.advanceTimersByTime(HOLD_MS / 2);
      input.activate();
      vi.advanceTimersByTime(HOLD_MS);
      input.move(30, 0);
      input.end();
      expect(onHold).not.toHaveBeenCalled();
      expect(onPlace).toHaveBeenCalledWith(5, 6);
    });

    it('does not switch after the touch ends, and a held touch is not a tap', () => {
      const { input, onHold, onTap } = setup();
      input.begin(80, 80);
      input.tap(80, 80);
      input.finalize();
      vi.advanceTimersByTime(HOLD_MS * 2);
      expect(onHold).not.toHaveBeenCalled();
      expect(onTap).toHaveBeenCalledTimes(1);

      input.begin(80, 80);
      vi.advanceTimersByTime(HOLD_MS);
      input.tap(80, 80);
      input.finalize();
      expect(onTap).toHaveBeenCalledTimes(1);
    });
  });

  it('does nothing before it has metrics', () => {
    const input = new BoardInput();
    input.begin(80, 80);
    input.tap(80, 80);
    expect(input.getDrag()).toBeNull();
  });
});
