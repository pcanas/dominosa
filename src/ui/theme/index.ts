import { useColorScheme } from 'react-native';

import { useHydrated } from '@/platform/use-hydrated';

import { fonts } from './fonts';
import { palettes, type Palette } from './palette';

export { fontAssets, fonts } from './fonts';
export { palettes, type Palette } from './palette';

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export interface Theme {
  readonly scheme: 'light' | 'dark';
  readonly palette: Palette;
  readonly fonts: typeof fonts;
}

/**
 * Current theme. On the web the first render is always light, matching the
 * pre-rendered HTML; the real scheme applies right after hydration.
 */
export function useTheme(): Theme {
  const system = useColorScheme();
  const hydrated = useHydrated();
  const scheme = hydrated && system === 'dark' ? 'dark' : 'light';
  return { scheme, palette: palettes[scheme], fonts };
}
