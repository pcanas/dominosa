import Constants from 'expo-constants';

/** Which build this is, shown on the home screen so testers can tell whether the app has updated. */
export const buildInfo = {
  /** App version from `app.config.ts`. */
  version: Constants.expoConfig?.version ?? '0.0.0',
  /** Short commit hash, set by CI through `EXPO_PUBLIC_COMMIT_SHA`; "dev" for local builds. */
  build: process.env.EXPO_PUBLIC_COMMIT_SHA?.slice(0, 7) || 'dev',
} as const;
