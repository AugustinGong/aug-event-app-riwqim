
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { commonStyles, colors } from '../styles/commonStyles';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { View, Text } from 'react-native';
import { initializeLanguage } from '../config/i18n';
import i18n from '../config/i18n';
import { useRouter, useSegments } from 'expo-router';

export default function RootLayout() {
  const { isLoading, isAuthenticated } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Initialize app
    const initializeApp = async () => {
      try {
        console.log('Initializing AUG-Event app v2...');
        
        // Initialize language settings
        await initializeLanguage();
        console.log('Language initialized:', i18n.locale);
        
        setIsReady(true);
      } catch (error) {
        console.log('Error initializing app:', error);
        setIsReady(true);
      }
    };

    initializeApp();
  }, []);

  // Handle authentication-based navigation
  useEffect(() => {
    if (!isReady || isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inProtectedRoute = segments[0] === 'home' || segments[0] === 'create-event' || segments[0] === 'scan-qr' || segments[0] === 'event';

    console.log('Navigation check - isAuthenticated:', isAuthenticated, 'segments:', segments);

    if (!isAuthenticated) {
      // User is not authenticated, redirect to login
      if (inProtectedRoute) {
        console.log('Redirecting unauthenticated user to login');
        router.replace('/');
      }
    } else {
      // User is authenticated, redirect away from login if they're on it
      if (segments.length === 0 || segments[0] === 'index') {
        console.log('Redirecting authenticated user to home');
        router.replace('/home');
      }
    }
  }, [isAuthenticated, segments, isReady, isLoading, router]);

  if (!isReady || isLoading) {
    return (
      <SafeAreaProvider>
        <View style={[commonStyles.container, commonStyles.centerContent]}>
          <Text style={[commonStyles.title, { color: colors.primary }]}>
            AUG-Event
          </Text>
          <Text style={[commonStyles.subtitle, { marginTop: 8 }]}>
            {i18n.t('common.loading')}
          </Text>
        </View>
        <StatusBar style="auto" />
      </SafeAreaProvider>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="home" />
          <Stack.Screen name="create-event" />
          <Stack.Screen name="scan-qr" />
          <Stack.Screen name="event/[id]" />
        </Stack>
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
