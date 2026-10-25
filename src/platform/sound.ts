/**
 * Sound effects, in game terms, like `haptics`. Best-effort: a sound that
 * cannot play is skipped silently. The web build has its own version
 * (`sound.web.ts`).
 *
 * Native: one expo-audio player per clip, created on first use and kept. The
 * audio session mixes with other apps (their music keeps playing) and follows
 * the silent switch on iOS; on Android, silent and vibrate modes mute it too.
 */
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import { SOUND_SOURCES, type SoundEffect } from './sound-sources';

let players: Map<SoundEffect, AudioPlayer> | null = null;

function load(): Map<SoundEffect, AudioPlayer> {
  if (players) return players;
  players = new Map();
  setAudioModeAsync({
    playsInSilentMode: false,
    interruptionMode: 'mixWithOthers',
    shouldPlayInBackground: false,
  }).catch(() => {});
  for (const name of Object.keys(SOUND_SOURCES) as SoundEffect[]) {
    try {
      players.set(name, createAudioPlayer(SOUND_SOURCES[name]));
    } catch {
      // No player for this clip: it stays silent.
    }
  }
  return players;
}

function play(name: SoundEffect): void {
  const player = load().get(name);
  if (!player) return;
  try {
    // Back to the start, so a quick second move is heard too.
    player.seekTo(0).catch(() => {});
    player.play();
  } catch {
    // Best-effort, like haptics.
  }
}

export const sound = {
  /** Loads the clips before the first move needs them. */
  prepare: (): void => void load(),
  /** A domino snaps into place. */
  place: () => play('place'),
  /** A domino or a wall is removed. */
  remove: () => play('remove'),
  /** A wall mark is drawn. */
  wall: () => play('wall'),
  /** The puzzle is solved. */
  solved: () => play('solved'),
};
