/**
 * The wall button works like the iPhone's shift key:
 *  - one tap arms it for a single wall (`once`): drawing that wall turns it off;
 *  - a quick second tap keeps it on (`locked`) until it is tapped again;
 *  - a tap while it is on turns it off.
 */
export type WallMode = 'off' | 'once' | 'locked';

/** Two taps on the button closer than this are a double tap. */
export const DOUBLE_TAP_MS = 350;

export interface WallButton {
  readonly mode: WallMode;
  /** Epoch ms of the last tap on the button. */
  readonly lastTapAt: number;
}

export const WALL_BUTTON_OFF: WallButton = { mode: 'off', lastTapAt: Number.NEGATIVE_INFINITY };

export function tapWallButton(button: WallButton, now: number): WallButton {
  if (button.mode === 'once' && now - button.lastTapAt <= DOUBLE_TAP_MS)
    return { mode: 'locked', lastTapAt: now };
  return { mode: button.mode === 'off' ? 'once' : 'off', lastTapAt: now };
}

/** After a wall has been drawn: a single-use wall mode switches itself off. */
export function afterWallDrawn(button: WallButton): WallButton {
  return button.mode === 'once' ? { ...button, mode: 'off' } : button;
}
