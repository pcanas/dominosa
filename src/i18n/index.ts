import { getLocales } from 'expo-localization';

import { useHydrated } from '@/platform/use-hydrated';
import { useSettingsStore } from '@/state/settings-store';

import { DEFAULT_LOCALE, isLocale, STRINGS, type Locale, type Strings } from './strings';

export { STRINGS, type Locale, type Strings } from './strings';

/** First device language we support, or Spanish. */
export function deviceLocale(): Locale {
  try {
    const match = getLocales()
      .map((l) => l.languageCode)
      .find(isLocale);
    return match ?? DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

/** Language in use: the player's choice in settings, or the device's. */
export function useLocale(): Locale {
  const hydrated = useHydrated();
  const setting = useSettingsStore((s) => s.language);
  if (!hydrated) return DEFAULT_LOCALE;
  return setting === 'system' ? deviceLocale() : setting;
}

/**
 * Strings for the current language. On the web the first render uses the
 * default locale, matching the pre-rendered HTML.
 */
export function useStrings(): Strings {
  return STRINGS[useLocale()];
}

/** Formats milliseconds as m:ss (or h:mm:ss). */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
