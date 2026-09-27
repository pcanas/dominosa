/**
 * Key-value storage used by persisted stores.
 *
 * AsyncStorage works in Expo Go and on the web (localStorage). It sits behind
 * this adapter so it can be swapped for MMKV once the app moves to a
 * development build, without touching the stores.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { StateStorage } from 'zustand/middleware';

/** True while the web build is being pre-rendered in Node (no localStorage there). */
const isStaticRender = Platform.OS === 'web' && typeof window === 'undefined';

export const appStorage: StateStorage = {
  getItem: (key) => (isStaticRender ? null : AsyncStorage.getItem(key)),
  setItem: (key, value) => (isStaticRender ? undefined : AsyncStorage.setItem(key, value)),
  removeItem: (key) => (isStaticRender ? undefined : AsyncStorage.removeItem(key)),
};
