/**
 * Draws every icon file from the art in `icon-art.ts`:
 *
 *   npm run icons
 *
 *  - iOS: `icon.png` (1024, no alpha), plus the dark and tinted variants iOS
 *    shows when the home screen uses them (`icon-dark.png`: the board at night;
 *    `icon-tinted.png`: greys only, as iOS requires).
 *  - Android: adaptive icon in two layers, the board behind (`background`) and
 *    the domino in front (`foreground`), so launchers that move the layers apart
 *    lift the domino off its slot; plus the themed (monochrome) layer. The domino
 *    stays inside the safe zone launchers never crop.
 *  - Splash screen, web favicon (the domino alone), PWA icons (incl. maskable)
 *    and the apple-touch-icon used when the web app is added to the home screen.
 *  - `assets/brand/icon.svg`: the main icon as SVG, for reference.
 *
 * Deterministic: same art, same files.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { Resvg } from '@resvg/resvg-js';

import { ADAPTIVE, iconSvg, MASKABLE, type IconOptions } from './icon-art';
import { encodePng } from './png';

const FONT = resolve('node_modules/@expo-google-fonts/nunito/800ExtraBold/Nunito_800ExtraBold.ttf');

interface Output {
  readonly file: string;
  readonly size: number;
  readonly art: IconOptions;
  /** Opaque PNG without an alpha channel (iOS app icon, apple-touch-icon). */
  readonly opaque?: boolean;
}

const OUTPUTS: readonly Output[] = [
  { file: 'assets/images/icon.png', size: 1024, art: { board: 'light' }, opaque: true },
  { file: 'assets/images/icon-dark.png', size: 1024, art: { board: 'dark' }, opaque: true },
  { file: 'assets/images/icon-tinted.png', size: 1024, art: { board: 'grey' }, opaque: true },
  {
    file: 'assets/images/android-icon-background.png',
    size: 1024,
    art: { board: 'light', piece: false, scale: ADAPTIVE },
    opaque: true,
  },
  { file: 'assets/images/android-icon-foreground.png', size: 1024, art: { board: 'none', scale: ADAPTIVE } },
  {
    file: 'assets/images/android-icon-monochrome.png',
    size: 1024,
    art: { board: 'none', centered: true, scale: ADAPTIVE, silhouette: true },
  },
  { file: 'assets/images/splash-icon.png', size: 512, art: { board: 'none', centered: true, scale: 1.05 } },
  {
    file: 'assets/images/favicon.png',
    size: 48,
    art: { board: 'none', centered: true, scale: 1.1, shadow: false },
  },
  { file: 'public/apple-touch-icon.png', size: 180, art: { board: 'light' }, opaque: true },
  { file: 'public/icons/icon-192.png', size: 192, art: { board: 'light' } },
  { file: 'public/icons/icon-512.png', size: 512, art: { board: 'light' } },
  { file: 'public/icons/icon-maskable-512.png', size: 512, art: { board: 'light', scale: MASKABLE } },
];

function render(svg: string, size: number, opaque: boolean): Uint8Array {
  const image = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    font: { fontFiles: [FONT], loadSystemFonts: false, defaultFontFamily: 'Nunito' },
  }).render();
  // Opaque art covers every pixel, so dropping the alpha channel loses nothing.
  return opaque ? encodePng(image.pixels, image.width, image.height, { alpha: false }) : image.asPng();
}

function write(file: string, data: Uint8Array | string): void {
  const path = resolve(file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data);
}

for (const { file, size, art, opaque = false } of OUTPUTS) {
  write(file, render(iconSvg(art), size, opaque));
  console.log(`✓ ${file} (${size}×${size}${opaque ? ', no alpha' : ''})`);
}
write('assets/brand/icon.svg', `${iconSvg({ board: 'light' })}\n`);
console.log('✓ assets/brand/icon.svg');
