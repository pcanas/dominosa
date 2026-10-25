import { describe, expect, it } from 'vitest';

import { encodeWav, RECIPES, renderSound, SAMPLE_RATE, type SoundName } from '../sounds';

const NAMES = Object.keys(RECIPES) as SoundName[];

describe.each(NAMES)('%s sound', (name) => {
  const samples = renderSound(name);

  it('never clips and peaks where its recipe says', () => {
    const peak = samples.reduce((max, x) => Math.max(max, Math.abs(x)), 0);
    expect(20 * Math.log10(peak)).toBeCloseTo(RECIPES[name].peakDb, 1);
  });

  it('starts and ends in silence, so it never clicks', () => {
    expect(Math.abs(samples[0]!)).toBeLessThan(1e-3);
    expect(Math.abs(samples.at(-1)!)).toBeLessThan(1e-3);
  });

  it('is short enough not to overlap the next move', () => {
    expect(samples.length / SAMPLE_RATE).toBeLessThanOrEqual(name === 'solved' ? 2 : 0.2);
  });

  it('comes out the same every time', () => {
    expect(renderSound(name)).toEqual(samples);
  });
});

describe('encodeWav', () => {
  it('writes a 16-bit mono PCM file', () => {
    const bytes = encodeWav(Float32Array.from([0, 1, -1, 0.5]), 22_050);
    const view = new DataView(bytes.buffer);
    const text = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
    expect(text(0, 4)).toBe('RIFF');
    expect(text(8, 16)).toBe('WAVEfmt ');
    expect(view.getUint32(4, true)).toBe(bytes.length - 8);
    expect(view.getUint16(20, true)).toBe(1);
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(22_050);
    expect(view.getUint16(34, true)).toBe(16);
    expect(view.getUint32(40, true)).toBe(8);
    expect([0, 1, 2, 3].map((i) => view.getInt16(44 + i * 2, true))).toEqual([0, 32767, -32767, 16384]);
  });
});
