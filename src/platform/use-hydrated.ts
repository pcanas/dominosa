import { useSyncExternalStore } from 'react';

const noSubscription = () => () => {};

/**
 * False during static rendering and while the web page hydrates, true after.
 * Anything that depends on the device (colour scheme, language, stored data)
 * waits for it so the first client render matches the pre-rendered HTML.
 * Native apps never hydrate, so there it is always true.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
}
