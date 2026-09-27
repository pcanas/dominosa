import { getLocales } from 'expo-localization';

import { useHydrated } from '@/platform/use-hydrated';

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

/**
 * Strings for the device language. On the web the first render uses the
 * default locale, matching the pre-rendered HTML.
 */
export function useStrings(): Strings {
  const hydrated = useHydrated();
  return STRINGS[hydrated ? deviceLocale() : DEFAULT_LOCALE];
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
