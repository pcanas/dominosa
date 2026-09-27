// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

/** Layers that must stay free of React / React Native so they run anywhere (app, Node, tests). */
const PURE_LAYERS = ['src/core/**', 'src/game/**', 'src/levels/**', 'scripts/**'];

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*', 'coverage/*'],
  },
  {
    files: PURE_LAYERS,
    ignores: ['**/__tests__/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react-native',
                'react-native-*',
                'expo',
                'expo-*',
                '@expo/*',
                'zustand',
                '@/ui/*',
                '@/state/*',
                '@/platform/*',
                '@/app/*',
              ],
              message: 'Keep this layer pure TypeScript: no UI, platform or state imports.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/core/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/*', 'react', 'react-*', 'expo', 'expo-*', '@expo/*', 'zustand'],
              message: 'src/core depends on nothing: only relative imports inside core.',
            },
          ],
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Use the seeded Rng from core/rng so output is reproducible.',
        },
      ],
    },
  },
]);
