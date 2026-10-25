import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Base path of the web build. GitHub Pages serves a project site from
 * /<repo-name>, so CI sets BASE_URL=/<repo-name>; locally it is empty.
 */
const baseUrl = (process.env.BASE_URL ?? '').replace(/\/+$/, '');

const BACKGROUND = '#F4EDE2';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Dominosa',
  slug: 'dominosa',
  version: '0.3.2',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'dominosa',
  userInterfaceStyle: 'automatic',
  backgroundColor: BACKGROUND,
  ios: {
    supportsTablet: true,
  },
  android: {
    adaptiveIcon: {
      backgroundColor: BACKGROUND,
      foregroundImage: './assets/images/android-icon-foreground.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
    name: 'Dominosa',
    shortName: 'Dominosa',
    backgroundColor: BACKGROUND,
    themeColor: BACKGROUND,
  },
  plugins: [
    // Async routes became the web default in SDK 58; one bundle keeps the offline PWA and the
    // first paint as they were.
    ['expo-router', { asyncRoutes: { web: false } }],
    'expo-localization',
    [
      'expo-splash-screen',
      {
        backgroundColor: BACKGROUND,
        image: './assets/images/splash-icon.png',
        imageWidth: 96,
        dark: { backgroundColor: '#2B2622', image: './assets/images/splash-icon.png' },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
    baseUrl,
  },
});
