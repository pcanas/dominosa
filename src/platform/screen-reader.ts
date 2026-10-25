/**
 * Whether a screen reader (VoiceOver, TalkBack) is on. When it is, the board
 * is played by picking cells one by one instead of swiping.
 *
 * Native only: browsers do not tell pages whether a screen reader is running
 * (react-native-web always answers "yes"), so on the web it stays off. Test
 * builds (EXPO_PUBLIC_TEST_HOOKS=1) expose `window.__dominosaTest` to switch
 * it on and check that mode in a browser.
 */
import { useSyncExternalStore } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

let enabled = false;
const listeners = new Set<() => void>();

function setEnabled(next: boolean): void {
  if (next === enabled) return;
  enabled = next;
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

if (Platform.OS !== 'web') {
  AccessibilityInfo.isScreenReaderEnabled()
    .then(setEnabled)
    .catch(() => {});
  AccessibilityInfo.addEventListener('screenReaderChanged', setEnabled);
} else if (process.env.EXPO_PUBLIC_TEST_HOOKS === '1' && typeof window !== 'undefined') {
  (window as unknown as { __dominosaTest?: unknown }).__dominosaTest = { setScreenReader: setEnabled };
}

export function useScreenReader(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => enabled,
    () => false,
  );
}

/**
 * Speaks a message on iOS. Android and the web read the visually hidden live
 * region the play screen keeps for the same messages.
 */
export function announce(message: string): void {
  if (Platform.OS === 'ios' && enabled) AccessibilityInfo.announceForAccessibility(message);
}
