import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { announce } from '@/platform/screen-reader';

/**
 * Messages for screen readers: VoiceOver gets `announce`, TalkBack and screen
 * readers on the web read the visually hidden `LiveRegion` showing the last one.
 */
export function useAnnouncer(): { readonly announcement: string; readonly say: (message: string) => void } {
  const [announcement, setAnnouncement] = useState('');
  const say = (message: string) => {
    // Alternate a zero-width space so the same message twice is still read twice.
    setAnnouncement((previous) => (previous.endsWith('​') ? message : `${message}​`));
    announce(message);
  };
  return { announcement, say };
}

/** Visually hidden, polite live region for `useAnnouncer`'s last message. */
export function LiveRegion({ announcement }: { readonly announcement: string }) {
  return (
    <Text accessibilityLiveRegion="polite" aria-live="polite" style={styles.srOnly}>
      {announcement}
    </Text>
  );
}

const styles = StyleSheet.create({
  srOnly: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 },
});
