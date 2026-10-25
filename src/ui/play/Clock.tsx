import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { formatDuration, useStrings } from '@/i18n';
import { elapsedNow, useSessionStore } from '@/state/session-store';
import { useSettingsStore } from '@/state/settings-store';
import { AppText } from '@/ui/components/AppText';

/** Time played, under the level title, when the "show time" setting is on. Ticks on its own. */
export function Clock({ levelId }: { readonly levelId: string }) {
  const t = useStrings();
  const show = useSettingsStore((s) => s.showTimer);
  const session = useSessionStore((s) => (s.levelId === levelId ? s : null));
  const running = show && session !== null && session.runningSince !== null;
  // The current time lives in state: the React Compiler memoizes pure-looking calls, so reading
  // Date.now() during render would freeze the clock on its first value.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);
  if (!show || !session) return null;
  const time = formatDuration(session.solvedInMs ?? elapsedNow(session, now));
  return (
    <AppText
      variant="caption"
      tone="secondary"
      maxFontSizeMultiplier={1.4}
      accessibilityLabel={t.a11y.timer(time)}
      style={styles.clock}>
      {` · ${time}`}
    </AppText>
  );
}

const styles = StyleSheet.create({ clock: { fontVariant: ['tabular-nums'] } });
