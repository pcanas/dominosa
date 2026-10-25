import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { appStorage } from '@/platform/storage';

export type ThemeSetting = 'system' | 'light' | 'dark';
export type LanguageSetting = 'system' | 'es' | 'en' | 'fr';
/** How the board shows each cell's value: digits, or domino pips (only up to 6, see `MAX_PIPS`). */
export type NumberStyle = 'digits' | 'pips';

export interface Settings {
  /** Sound effects on placements, walls and solves. On iOS they follow the silent switch. */
  readonly sound: boolean;
  /** Haptic feedback on placements, walls and solves (native app only). */
  readonly vibration: boolean;
  /** Show the running time while playing. Off by default: the game is relaxed, time is still recorded. */
  readonly showTimer: boolean;
  readonly theme: ThemeSetting;
  readonly language: LanguageSetting;
  readonly numberStyle: NumberStyle;
}

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  vibration: true,
  showTimer: false,
  theme: 'system',
  language: 'system',
  numberStyle: 'digits',
};

const THEMES: readonly ThemeSetting[] = ['system', 'light', 'dark'];
const LANGUAGES: readonly LanguageSetting[] = ['system', 'es', 'en', 'fr'];
const NUMBER_STYLES: readonly NumberStyle[] = ['digits', 'pips'];

/** Stored settings with every unknown or malformed value replaced by its default. */
export function sanitizeSettings(value: unknown): Settings {
  const v = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
  return {
    sound: typeof v.sound === 'boolean' ? v.sound : DEFAULT_SETTINGS.sound,
    vibration: typeof v.vibration === 'boolean' ? v.vibration : DEFAULT_SETTINGS.vibration,
    showTimer: typeof v.showTimer === 'boolean' ? v.showTimer : DEFAULT_SETTINGS.showTimer,
    theme: THEMES.includes(v.theme as ThemeSetting) ? (v.theme as ThemeSetting) : DEFAULT_SETTINGS.theme,
    language: LANGUAGES.includes(v.language as LanguageSetting)
      ? (v.language as LanguageSetting)
      : DEFAULT_SETTINGS.language,
    numberStyle: NUMBER_STYLES.includes(v.numberStyle as NumberStyle)
      ? (v.numberStyle as NumberStyle)
      : DEFAULT_SETTINGS.numberStyle,
  };
}

interface SettingsStore extends Settings {
  update(patch: Partial<Settings>): void;
}

/**
 * Player settings, persisted on the device. Hydration is manual
 * (`skipHydration`) like the other stores; until it finishes, defaults apply.
 */
export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SETTINGS,
      update: (patch: Partial<Settings>) => {
        set(sanitizeSettings({ ...pickSettings(get()), ...patch }));
      },
    }),
    {
      name: 'dominosa.settings',
      version: 1,
      storage: createJSONStorage(() => appStorage),
      partialize: (state) => pickSettings(state),
      merge: (stored, current) => ({ ...current, ...sanitizeSettings(stored) }),
      skipHydration: true,
    },
  ),
);

function pickSettings(state: Settings): Settings {
  const { sound, vibration, showTimer, theme, language, numberStyle } = state;
  return { sound, vibration, showTimer, theme, language, numberStyle };
}
