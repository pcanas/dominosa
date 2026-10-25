/**
 * Draws every icon file from the art in `icon-art.ts`:
 *
 *   npm run icons
 *
 *  - iOS: `icon.png` (1024, no alpha), plus the dark and tinted variants iOS
 *    shows when the home screen uses them (`icon-dark.png`, `icon-tinted.png`).
 *  - Android: adaptive foreground and themed (monochrome) layers, with the
 *    domino inside the safe zone launchers never crop.
 *  - Splash screen, web favicon, PWA icons (incl. maskable) and the
 *    apple-touch-icon used when the web app is added to the home screen.
 *  - `assets/brand/icon.svg`: the main icon as SVG, for reference.
 *
 * Deterministic: same art, same files.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { Resvg } from '@resvg/resvg-js';

import { iconSvg, type IconOptions } from './icon-art';
import { encodePng } from './png';

const FONT = resolve('node_modules/@expo-google-fonts/nunito/800ExtraBold/Nunito_800ExtraBold.ttf');

interface Output {
  readonly file: string;
  readonly size: number;
  readonly art: IconOptions;
  /** Opaque PNG without an alpha channel (iOS app icon, apple-touch-icon). */
  readonly opaque?: boolean;
}

/**
 * Android crops adaptive icons to the central 72 of 108 dp (a circle on many
 * launchers): at this scale the tilted domino and its shadow sit well inside it.
 */
const ADAPTIVE = 0.6;
/** Maskable PWA icons may be cropped to a circle of 80 % of the size. */
const MASKABLE = 0.82;

const OUTPUTS: readonly Output[] = [
  { file: 'assets/images/icon.png', size: 1024, art: { background: 'light' }, opaque: true },
  { file: 'assets/images/icon-dark.png', size: 1024, art: { background: 'none' } },
  {
    file: 'assets/images/icon-tinted.png',
    size: 1024,
    art: { background: 'black', grey: true },
    opaque: true,
  },
  {
    file: 'assets/images/android-icon-foreground.png',
    size: 1024,
    art: { background: 'none', scale: ADAPTIVE },
  },
  {
    file: 'assets/images/android-icon-monochrome.png',
    size: 1024,
    art: { background: 'none', scale: ADAPTIVE, silhouette: true },
  },
  { file: 'assets/images/splash-icon.png', size: 512, art: { background: 'none', scale: 1.05 } },
  { file: 'assets/images/favicon.png', size: 48, art: { background: 'none', scale: 1.1, shadow: false } },
  { file: 'public/apple-touch-icon.png', size: 180, art: { background: 'light' }, opaque: true },
  { file: 'public/icons/icon-192.png', size: 192, art: { background: 'light' } },
  { file: 'public/icons/icon-512.png', size: 512, art: { background: 'light' } },
  { file: 'public/icons/icon-maskable-512.png', size: 512, art: { background: 'light', scale: MASKABLE } },
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
write('assets/brand/icon.svg', `${iconSvg({ background: 'light' })}\n`);
console.log('✓ assets/brand/icon.svg');
