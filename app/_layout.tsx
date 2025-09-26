
import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initializeLanguage } from '../config/i18n';

export default function RootLayout() {
  const [languageInitialized, setLanguageInitialized] = useState(false);

  useEffect(() => {
    const initLanguage = async () => {
      try {
        await initializeLanguage();
        console.log('Language initialized successfully');
      } catch (error) {
        console.log('Error initializing language:', error);
      } finally {
        setLanguageInitialized(true);
      }
    };

    initLanguage();
  }, []);

  if (!languageInitialized) {
    return null; // Show nothing while initializing language
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="home" />
        <Stack.Screen name="create-event" />
        <Stack.Screen name="scan-qr" />
        <Stack.Screen name="event/[id]" />
      </Stack>
    </GestureHandlerRootView>
  );
}
