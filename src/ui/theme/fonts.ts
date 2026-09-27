/**
 * Bundled fonts: Nunito for numbers and UI (rounded, very legible digits, and
 * identical on iOS and Android), Fraunces as the soft serif for titles.
 * Each weight is imported on its own so unused weights are not bundled.
 */
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces/600SemiBold';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';

export const fontAssets = {
  Fraunces_600SemiBold,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
};

export const fonts = {
  title: 'Fraunces_600SemiBold',
  body: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
  number: 'Nunito_800ExtraBold',
} as const;
