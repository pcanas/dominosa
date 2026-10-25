/**
 * Writes the sound effects to `assets/sounds/` (see `sounds.ts`).
 *
 *   npm run sounds
 *
 * Deterministic: running it again without changing the recipes rewrites the
 * same bytes.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { encodeWav, RECIPES, renderSound, SAMPLE_RATE, type SoundName } from './sounds';

/** Run from the repo root, like the other scripts. */
const OUT = resolve('assets', 'sounds');

mkdirSync(OUT, { recursive: true });
for (const name of Object.keys(RECIPES) as SoundName[]) {
  const samples = renderSound(name);
  const file = join(OUT, `${name}.wav`);
  writeFileSync(file, encodeWav(samples));
  const ms = Math.round((samples.length / SAMPLE_RATE) * 1000);
  console.log(`✓ ${name}.wav  ${ms} ms, ${Math.round((44 + samples.length * 2) / 1024)} KB`);
}
