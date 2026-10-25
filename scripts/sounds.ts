/**
 * The game's sound effects, synthesised from a few decaying tones and a short
 * burst of noise (no recordings, no licences). `npm run sounds` writes them to
 * `assets/sounds/`; replacing a WAV there with a real recording works too.
 *
 *   place   a domino lands: a short wooden "clack"
 *   remove  a domino or a wall is taken away: a lighter tick
 *   wall    a wall is drawn: a muted knock
 *   solved  the board is solved: a soft four-note marimba chime
 */
import { createRng, type Rng } from '@/core';

export const SAMPLE_RATE = 44_100;

export type SoundName = 'place' | 'remove' | 'wall' | 'solved';

interface Tone {
  readonly freq: number;
  readonly amp: number;
  /** Exponential decay time constant, in seconds. */
  readonly decay: number;
  /** Start, in seconds. */
  readonly at?: number;
  /** Linear fade-in, in seconds (a mallet is softer than a tile edge). */
  readonly attack?: number;
}

interface Noise {
  readonly amp: number;
  readonly decay: number;
  readonly at?: number;
  /** One-pole high-pass corner, in Hz. */
  readonly highpass?: number;
  /** One-pole low-pass corner, in Hz. */
  readonly lowpass?: number;
}

interface Recipe {
  readonly seconds: number;
  readonly tones: readonly Tone[];
  readonly noise: readonly Noise[];
  /** Loudest sample, in dBFS: the quieter sounds are the ones heard most often. */
  readonly peakDb: number;
  /** Faint copies of the sound (delay in seconds, gain): a little room around the chime. */
  readonly echoes?: readonly (readonly [number, number])[];
}

/** Partials of a marimba bar: the fundamental and two quickly fading overtones. */
function marimbaNote(freq: number, at: number, amp: number): Tone[] {
  return [
    { freq, amp, decay: 0.42, at, attack: 0.004 },
    { freq: freq * 3.93, amp: amp * 0.2, decay: 0.08, at, attack: 0.002 },
    { freq: freq * 9.4, amp: amp * 0.05, decay: 0.025, at, attack: 0.001 },
  ];
}

const G5 = 783.99;
const B5 = 987.77;
const D6 = 1174.66;
const G6 = 1567.98;

export const RECIPES: Readonly<Record<SoundName, Recipe>> = {
  place: {
    seconds: 0.14,
    peakDb: -4,
    tones: [
      { freq: 165, amp: 0.55, decay: 0.022 },
      { freq: 420, amp: 0.25, decay: 0.016 },
      { freq: 2350, amp: 0.42, decay: 0.011 },
      { freq: 3720, amp: 0.25, decay: 0.007 },
      { freq: 5310, amp: 0.15, decay: 0.004 },
    ],
    noise: [{ amp: 0.6, decay: 0.0012, highpass: 1500, lowpass: 9000 }],
  },
  remove: {
    seconds: 0.08,
    peakDb: -9,
    tones: [
      { freq: 320, amp: 0.15, decay: 0.01 },
      { freq: 1900, amp: 0.2, decay: 0.008 },
      { freq: 3100, amp: 0.4, decay: 0.006 },
      { freq: 4700, amp: 0.25, decay: 0.004 },
    ],
    noise: [{ amp: 0.35, decay: 0.0008, highpass: 2500 }],
  },
  wall: {
    seconds: 0.1,
    peakDb: -8,
    tones: [
      { freq: 760, amp: 0.5, decay: 0.016 },
      { freq: 1180, amp: 0.25, decay: 0.01 },
      { freq: 2050, amp: 0.12, decay: 0.005 },
    ],
    noise: [{ amp: 0.35, decay: 0.0015, lowpass: 4000 }],
  },
  solved: {
    seconds: 1.6,
    peakDb: -8,
    tones: [
      ...marimbaNote(G5, 0, 0.8),
      ...marimbaNote(B5, 0.09, 0.75),
      ...marimbaNote(D6, 0.18, 0.75),
      ...marimbaNote(G6, 0.3, 0.6),
    ],
    noise: [0, 0.09, 0.18, 0.3].map((at) => ({ amp: 0.06, decay: 0.002, at, highpass: 2000 })),
    echoes: [
      [0.023, 0.18],
      [0.041, 0.1],
    ],
  },
};

/** Renders a sound as samples in [-1, 1]. Deterministic: the noise is seeded by the sound's name. */
export function renderSound(name: SoundName): Float32Array {
  const recipe = RECIPES[name];
  const dry = new Float32Array(Math.round(recipe.seconds * SAMPLE_RATE));
  for (const tone of recipe.tones) addTone(dry, tone);
  const rng = createRng(`sound:${name}`);
  for (const noise of recipe.noise) addNoise(dry, noise, rng);

  const out = Float32Array.from(dry);
  for (const [delay, gain] of recipe.echoes ?? []) {
    const offset = Math.round(delay * SAMPLE_RATE);
    for (let i = offset; i < out.length; i++) out[i]! += dry[i - offset]! * gain;
  }

  fadeEdges(out, 0.0005, Math.min(0.15, recipe.seconds * 0.3));
  normalize(out, recipe.peakDb);
  return out;
}

function addTone(out: Float32Array, { freq, amp, decay, at = 0, attack = 0.0003 }: Tone): void {
  const start = Math.round(at * SAMPLE_RATE);
  for (let i = start; i < out.length; i++) {
    const t = (i - start) / SAMPLE_RATE;
    const envelope = Math.min(1, t / attack) * Math.exp(-t / decay);
    if (envelope < 1e-5 && t > attack) break;
    out[i]! += amp * envelope * Math.sin(2 * Math.PI * freq * t);
  }
}

function addNoise(out: Float32Array, { amp, decay, at = 0, highpass, lowpass }: Noise, rng: Rng): void {
  const start = Math.round(at * SAMPLE_RATE);
  const hp = highpass ? onePole(highpass) : 0;
  const lp = lowpass ? onePole(lowpass) : 1;
  let low = 0;
  let slow = 0;
  for (let i = start; i < out.length; i++) {
    const t = (i - start) / SAMPLE_RATE;
    const envelope = Math.exp(-t / decay);
    if (envelope < 1e-5) break;
    let x = (rng.next() * 2 - 1) * envelope;
    low += lp * (x - low);
    x = low;
    slow += hp * (x - slow);
    if (highpass) x -= slow;
    out[i]! += amp * x;
  }
}

/** Smoothing coefficient of a one-pole filter with the given corner. */
function onePole(cornerHz: number): number {
  return 1 - Math.exp((-2 * Math.PI * cornerHz) / SAMPLE_RATE);
}

/** Cosine fades, so a sound never starts or stops with a click. */
function fadeEdges(out: Float32Array, fadeIn: number, fadeOut: number): void {
  const inLen = Math.max(1, Math.round(fadeIn * SAMPLE_RATE));
  const outLen = Math.max(1, Math.round(fadeOut * SAMPLE_RATE));
  for (let i = 0; i < inLen && i < out.length; i++) out[i]! *= 0.5 - 0.5 * Math.cos((Math.PI * i) / inLen);
  for (let i = 0; i < outLen && i < out.length; i++) {
    out[out.length - 1 - i]! *= 0.5 - 0.5 * Math.cos((Math.PI * i) / outLen);
  }
}

function normalize(out: Float32Array, peakDb: number): void {
  const peak = out.reduce((max, x) => Math.max(max, Math.abs(x)), 0);
  if (peak === 0) return;
  const gain = 10 ** (peakDb / 20) / peak;
  for (let i = 0; i < out.length; i++) out[i]! *= gain;
}

/** 16-bit PCM mono WAV: no decoder delay, so a tap is heard right away. */
export function encodeWav(samples: Float32Array, sampleRate = SAMPLE_RATE): Uint8Array {
  const data = samples.length * 2;
  const bytes = new Uint8Array(44 + data);
  const view = new DataView(bytes.buffer);
  const ascii = (offset: number, text: string) =>
    [...text].forEach((ch, i) => view.setUint8(offset + i, ch.charCodeAt(0)));
  ascii(0, 'RIFF');
  view.setUint32(4, 36 + data, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  ascii(36, 'data');
  view.setUint32(40, data, true);
  samples.forEach((x, i) =>
    view.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, x)) * 32767), true),
  );
  return bytes;
}
