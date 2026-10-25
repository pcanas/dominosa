/**
 * Sound effects on the web, with the same API as `sound.ts`.
 *
 * Uses the Web Audio API rather than `<audio>` elements: clips are decoded
 * once and start without delay, and on iOS Safari Web Audio mixes with other
 * apps' music and follows the silent switch, where an `<audio>` element would
 * pause the music and ignore the switch. Browsers only let audio start after
 * a user gesture, so the context is resumed on the first tap or key press.
 */
import { Asset } from 'expo-asset';

import { SOUND_SOURCES, type SoundEffect } from './sound-sources';

type AudioContextConstructor = new () => AudioContext;

let context: AudioContext | null = null;
let loading: Promise<void> | null = null;
const buffers = new Map<SoundEffect, AudioBuffer>();

const GESTURES = ['pointerup', 'touchend', 'click', 'keydown'] as const;

function getContext(): AudioContext | null {
  if (context || typeof window === 'undefined') return context;
  const Constructor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
  if (!Constructor) return null;
  try {
    // Safari 16.4+: ask for "ambient" audio explicitly (mixes with music, follows the silent switch).
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session) session.type = 'ambient';
    context = new Constructor();
  } catch {
    return null;
  }
  return context;
}

/** Resumes the context on the first gesture; browsers keep it suspended until then. */
function unlockOnGesture(ctx: AudioContext): void {
  const unlock = () => {
    ctx
      .resume()
      .then(() => {
        if (ctx.state === 'running')
          GESTURES.forEach((type) => window.removeEventListener(type, unlock, true));
      })
      .catch(() => {});
  };
  GESTURES.forEach((type) => window.addEventListener(type, unlock, true));
}

function load(): Promise<void> {
  if (loading) return loading;
  const ctx = getContext();
  if (!ctx) return Promise.resolve();
  if (ctx.state === 'suspended') unlockOnGesture(ctx);
  loading = Promise.all(
    (Object.keys(SOUND_SOURCES) as SoundEffect[]).map(async (name) => {
      const response = await fetch(Asset.fromModule(SOUND_SOURCES[name]).uri);
      buffers.set(name, await ctx.decodeAudioData(await response.arrayBuffer()));
    }),
  ).then(
    () => undefined,
    () => undefined,
  );
  return loading;
}

function play(name: SoundEffect): void {
  const ctx = getContext();
  const buffer = buffers.get(name);
  if (!ctx || !buffer) {
    void load();
    return;
  }
  try {
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
  } catch {
    // Best-effort.
  }
}

export const sound = {
  prepare: (): void => void load(),
  place: () => play('place'),
  remove: () => play('remove'),
  wall: () => play('wall'),
  solved: () => play('solved'),
};
