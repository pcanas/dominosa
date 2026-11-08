import { useStrings } from '@/i18n';
import { tapWallButton, toggleWallLock, type WallButton } from '@/ui/board/wall-mode';
import { IconButton } from '@/ui/components/IconButton';

interface WallToggleProps {
  readonly state: WallButton;
  readonly onChange: (next: WallButton) => void;
  /** Speaks the lock being set or released from the VoiceOver / TalkBack action. */
  readonly say: (message: string) => void;
  readonly disabled?: boolean;
  /** Drawn in terracotta while the tutorial asks for it. */
  readonly tone?: 'default' | 'accent';
}

/**
 * The toolbar's wall button: a tap arms one wall, a double tap keeps it on (see
 * `wall-mode.ts`); screen readers lock it with an action instead.
 */
export function WallToggle({ state, onChange, say, disabled, tone }: WallToggleProps) {
  const t = useStrings();
  return (
    <IconButton
      icon="ban-outline"
      label={t.actions.wall}
      accessibilityLabel={
        state.mode === 'locked' ? t.a11y.wallLocked : state.mode === 'once' ? t.a11y.wallOnce : t.actions.wall
      }
      onPress={() => onChange(tapWallButton(state, Date.now()))}
      accessibilityActions={[
        { name: 'lock', label: state.mode === 'locked' ? t.a11y.wallUnlock : t.a11y.wallLock },
      ]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName !== 'lock') return;
        const next = toggleWallLock(state, Date.now());
        onChange(next);
        say(next.mode === 'locked' ? t.announce.wallLocked : t.announce.wallOff);
      }}
      selected={state.mode !== 'off'}
      badge={state.mode === 'locked' ? 'lock-closed' : undefined}
      disabled={disabled}
      tone={tone}
      showLabel
      compact
    />
  );
}
