/**
 * Registers the offline service worker in production web builds. The worker
 * itself is generated after `expo export` by `scripts/build-pwa.ts`, because it
 * needs the final list of hashed files to precache.
 */
export function registerServiceWorker(): void {
  if (__DEV__ || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  const base = process.env.EXPO_BASE_URL ?? '';
  navigator.serviceWorker.register(`${base}/sw.js`, { scope: `${base}/` }).catch((error: unknown) => {
    console.warn('Service worker registration failed', error);
  });
}
