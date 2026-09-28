import Constants from 'expo-constants';

/** Which build this is, shown on the home screen so testers can tell whether the app has updated. */
export const buildInfo = {
  /** App version from `app.config.ts`. */
  version: Constants.expoConfig?.version ?? '0.0.0',
  /**
   * Short commit hash, plus the branch when it is not main (a preview
   * published with the Deploy workflow); "dev" for local builds.
   */
  build: describeBuild(process.env.EXPO_PUBLIC_COMMIT_SHA, process.env.EXPO_PUBLIC_COMMIT_REF),
} as const;

function describeBuild(sha: string | undefined, ref: string | undefined): string {
  if (!sha) return 'dev';
  const short = sha.slice(0, 7);
  // "main" is the usual case, and a ref that is the commit itself adds nothing.
  const showRef = ref && ref !== 'main' && !sha.startsWith(ref);
  return showRef ? `${short} · ${ref}` : short;
}
