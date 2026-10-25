/**
 * Haptic feedback, in game terms. On the web this is a no-op (iOS Safari has no
 * vibration API), so callers never need to branch on the platform.
 */
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** Vibration only exists in the native app: Safari and other browsers cannot vibrate. */
export const hapticsAvailable = Platform.OS === 'ios' || Platform.OS === 'android';

const run = (effect: () => Promise<void>): void => {
  if (!hapticsAvailable) return;
  effect().catch(() => {
    // Haptics are best-effort; a device without them is not an error.
  });
};

export const haptics = {
  /** A domino snaps into place. */
  place: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** A domino or a wall is removed. */
  remove: () => run(() => Haptics.selectionAsync()),
  /** A wall mark is drawn. */
  wall: () => run(() => Haptics.selectionAsync()),
  /** A placement was refused because a wall is in the way. */
  blocked: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  /** The puzzle is solved. */
  solved: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
};
