
import { Stack } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { initializeLanguage } from '../config/i18n';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  const { isLoading } = useAuth();

  useEffect(() => {
    // Initialize language on app start
    initializeLanguage().catch((error) => {
      console.log('Error initializing language:', error);
    });
  }, []);

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
