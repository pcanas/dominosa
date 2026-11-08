import type { MoveOutcome } from '@/game';
import { haptics } from '@/platform/haptics';
import { sound } from '@/platform/sound';

/** Vibration for each kind of move. */
const HAPTICS: Partial<Record<MoveOutcome, () => void>> = {
  placed: haptics.place,
  removed: haptics.remove,
  wallAdded: haptics.wall,
  wallRemoved: haptics.remove,
  blocked: haptics.blocked,
  solved: haptics.solved,
};

/** Sound for each kind of move (a placement refused by a wall only vibrates). */
const SOUNDS: Partial<Record<MoveOutcome, () => void>> = {
  placed: sound.place,
  removed: sound.remove,
  wallAdded: sound.wall,
  wallRemoved: sound.remove,
  solved: sound.solved,
};

/** Vibration and sound for a move on the board, as far as the settings allow. */
export function moveFeedback(
  outcome: MoveOutcome,
  settings: { readonly sound: boolean; readonly vibration: boolean },
): void {
  if (settings.vibration) HAPTICS[outcome]?.();
  if (settings.sound) SOUNDS[outcome]?.();
}
