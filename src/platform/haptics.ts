/**
 * Haptic feedback, in game terms. On the web this is a no-op (iOS Safari has no
 * vibration API), so callers never need to branch on the platform.
 */
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

const run = (effect: () => Promise<void>): void => {
  if (!enabled) return;
  effect().catch(() => {
    // Haptics are best-effort; a device without them is not an error.
  });
};

export const haptics = {
  /** A domino snaps into place. */
  place: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** A domino is removed or replaced. */
  remove: () => run(() => Haptics.selectionAsync()),
  /** The puzzle is solved. */
  solved: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
};
