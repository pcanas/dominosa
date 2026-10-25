import { describe, expect, it } from 'vitest';

import { formatDuration } from '@/i18n/format';
import { STRINGS } from '@/i18n/strings';

import { describeStatus, pairStatus, type StatusInput } from '../status';

const t = STRINGS.es;
const base: StatusInput = {
  status: { kind: 'empty' },
  wallMode: 'off',
  pickMode: false,
  pair: null,
  solvedInMs: null,
};
const text = (input: Partial<StatusInput>) => describeStatus({ ...base, ...input }, t).text;

describe('describeStatus', () => {
  it('explains swiping, or picking cells with a screen reader', () => {
    expect(text({})).toBe(t.status.start);
    expect(text({ pickMode: true })).toBe(t.status.startPick);
  });

  it('reminds of wall mode while playing, but not over a warning', () => {
    expect(text({ wallMode: 'once' })).toBe(t.status.wallOnce);
    expect(text({ wallMode: 'locked', status: { kind: 'progress', placed: 2, total: 10 } })).toBe(
      t.status.wallLocked,
    );
    expect(text({ wallMode: 'once', pickMode: true })).toBe(t.status.wallPick);
    expect(text({ wallMode: 'once', status: { kind: 'duplicates', full: false } })).toBe(t.status.duplicates);
  });

  it('shows the solve time', () => {
    const solved = describeStatus({ ...base, status: { kind: 'solved' }, solvedInMs: 83_000 }, t);
    expect(solved).toEqual({ text: '¡Resuelto en 1:23!', tone: 'success', icon: 'checkmark-circle' });
  });

  it('puts a picked pair first', () => {
    const pair = { label: '0–1', slots: { placed: [], open: [{ a: 0, b: 1 }] } };
    expect(text({ pair, wallMode: 'once' })).toBe(t.status.pairOpen('0–1', 1));
  });
});

describe('pairStatus', () => {
  it('says whether the pair is placed, stuck or how many slots it has', () => {
    const slot = { a: 0, b: 1 };
    expect(pairStatus({ label: '2–3', slots: { placed: [slot], open: [] } }, t).tone).toBe('success');
    expect(pairStatus({ label: '2–3', slots: { placed: [], open: [] } }, t)).toMatchObject({
      text: t.status.pairNone('2–3'),
      tone: 'accent',
    });
    expect(pairStatus({ label: '2–3', slots: { placed: [], open: [slot, slot] } }, t).text).toBe(
      t.status.pairOpen('2–3', 2),
    );
  });
});

describe('formatDuration', () => {
  it('writes m:ss, or h:mm:ss past an hour', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(65_400)).toBe('1:05');
    expect(formatDuration(3_725_000)).toBe('1:02:05');
  });
});
