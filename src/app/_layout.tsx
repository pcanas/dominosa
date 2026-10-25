import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { registerServiceWorker } from '@/platform/service-worker';
import { useProgressStore } from '@/state/progress-store';
import { useSavedGamesStore } from '@/state/saved-games-store';
import { useSettingsStore } from '@/state/settings-store';
import { fontAssets, useTheme } from '@/ui/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const { palette, scheme } = useTheme();
  const ready = fontsLoaded || fontError !== null;

  useEffect(() => {
    void useProgressStore.persist.rehydrate();
    void useSavedGamesStore.persist.rehydrate();
    void useSettingsStore.persist.rehydrate();
    registerServiceWorker();
  }, []);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: palette.background }]}>
      {/* Expo Router already wraps the app in a SafeAreaProvider (with zero insets on the web). */}
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.background },
          animation: 'fade',
        }}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
