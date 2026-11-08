import { resolve } from 'node:path';

import { Resvg } from '@resvg/resvg-js';
import { describe, expect, it } from 'vitest';

import { ADAPTIVE, ADAPTIVE_SAFE_RADIUS, iconSvg, MASKABLE, type IconOptions } from '../icon-art';

const FONT = resolve('node_modules/@expo-google-fonts/nunito/800ExtraBold/Nunito_800ExtraBold.ttf');

function render(options: IconOptions, size: number) {
  return new Resvg(iconSvg(options), {
    fitTo: { mode: 'width', value: size },
    font: { fontFiles: [FONT], loadSystemFonts: false, defaultFontFamily: 'Nunito' },
  }).render();
}

const hexColours = (svg: string) => svg.match(/#[0-9a-f]{6}\b/gi) ?? [];

describe('iconSvg', () => {
  it('comes out the same every time', () => {
    expect(iconSvg({ board: 'light' })).toBe(iconSvg({ board: 'light' }));
  });

  it('draws the tinted iOS icon in greys only, as iOS requires', () => {
    const colours = hexColours(iconSvg({ board: 'grey' }));
    expect(colours.length).toBeGreaterThan(0);
    const notGrey = colours.filter((c) => c.slice(1, 3) !== c.slice(3, 5) || c.slice(3, 5) !== c.slice(5, 7));
    expect(notGrey).toEqual([]);
  });

  it('leaves the domino out of the Android background layer', () => {
    expect(iconSvg({ board: 'light', piece: false })).not.toContain('url(#face)');
  });

  it('leaves the layers that sit on something else transparent', () => {
    const image = render({ board: 'none', scale: ADAPTIVE }, 64);
    expect(image.pixels[3]).toBe(0);
  });

  // Every eighth of the canvas must show cells, not bare board: the board has to reach every
  // edge, including the Android background layer, which is drawn smaller to keep its proportions.
  it.each([1, MASKABLE, ADAPTIVE])('covers the whole canvas with cells at scale %s', (scale) => {
    const size = 64;
    const block = size / 8;
    const { pixels } = render({ board: 'light', piece: false, scale }, size);
    const base = [0xd3, 0xc1, 0xa2];
    const isBase = (i: number) => base.every((value, k) => Math.abs(pixels[i + k]! - value) <= 4);
    const bare: string[] = [];
    for (let by = 0; by < 8; by++) {
      for (let bx = 0; bx < 8; bx++) {
        let count = 0;
        for (let y = by * block; y < (by + 1) * block; y++) {
          for (let x = bx * block; x < (bx + 1) * block; x++) {
            if (isBase((y * size + x) * 4)) count++;
          }
        }
        // Between cells the board shows through, but only as thin lines.
        if (count / block ** 2 > 0.7) bare.push(`${bx},${by}`);
      }
    }
    expect(bare).toEqual([]);
  });

  it.each<[string, IconOptions]>([
    ['foreground', { board: 'none', scale: ADAPTIVE, shadow: false }],
    ['themed', { board: 'none', centered: true, scale: ADAPTIVE, silhouette: true }],
  ])('keeps the Android %s layer inside the safe zone', (_, options) => {
    const size = 256;
    const { pixels } = render(options, size);
    let farthest = 0;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (pixels[(y * size + x) * 4 + 3]! > 0) {
          farthest = Math.max(farthest, Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2));
        }
      }
    }
    expect(farthest * (1024 / size)).toBeLessThan(ADAPTIVE_SAFE_RADIUS);
  });
});
