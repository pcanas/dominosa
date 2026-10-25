import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/platform/storage', () => {
  const data = new Map<string, string>();
  return {
    storageData: data,
    appStorage: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
      removeItem: (key: string) => void data.delete(key),
    },
  };
});

const { storageData } = (await import('@/platform/storage')) as unknown as {
  storageData: Map<string, string>;
};
const { DEFAULT_SETTINGS, sanitizeSettings, useSettingsStore } = await import('../settings-store');

describe('sanitizeSettings', () => {
  it('keeps valid values and replaces the rest with defaults', () => {
    expect(sanitizeSettings({ vibration: false, showTimer: true, theme: 'dark', language: 'fr' })).toEqual({
      vibration: false,
      showTimer: true,
      theme: 'dark',
      language: 'fr',
    });
    expect(sanitizeSettings({ vibration: 'no', theme: 'blue', language: 'de' })).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
  });
});

describe('settings store', () => {
  beforeEach(() => {
    storageData.clear();
    useSettingsStore.setState({ ...DEFAULT_SETTINGS });
  });

  it('updates, persists and reloads settings', async () => {
    useSettingsStore.getState().update({ theme: 'dark', showTimer: true });
    expect(useSettingsStore.getState()).toMatchObject({ theme: 'dark', showTimer: true, language: 'system' });
    const stored = storageData.get('dominosa.settings')!;
    expect(JSON.parse(stored).state).toEqual({ ...DEFAULT_SETTINGS, theme: 'dark', showTimer: true });

    useSettingsStore.setState({ ...DEFAULT_SETTINGS });
    storageData.set('dominosa.settings', stored);
    await useSettingsStore.persist.rehydrate();
    expect(useSettingsStore.getState()).toMatchObject({ theme: 'dark', showTimer: true });
  });

  it('ignores unknown values from storage', async () => {
    storageData.set(
      'dominosa.settings',
      JSON.stringify({ state: { theme: 'neon', vibration: false }, version: 1 }),
    );
    await useSettingsStore.persist.rehydrate();
    expect(useSettingsStore.getState()).toMatchObject({ theme: 'system', vibration: false });
  });
});
