
import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuth } from '../hooks/useAuth';
import { commonStyles, colors } from '../styles/commonStyles';
import FirebaseSetup from '../components/FirebaseSetup';

export default function RootLayout() {
  const { isLoading } = useAuth();
  const [showFirebaseSetup, setShowFirebaseSetup] = useState(false);

  useEffect(() => {
    // Check if Firebase is properly configured
    const checkFirebaseConfig = () => {
      try {
        // This is a simple check - in a real app you might want to test actual Firebase connectivity
        const config = require('../config/firebase');
        
        // Check if the default config values are still present
        if (config.auth && config.db && config.storage) {
          console.log('Firebase configuration detected');
          setShowFirebaseSetup(false);
        } else {
          console.log('Firebase configuration incomplete');
          setShowFirebaseSetup(true);
        }
      } catch (error) {
        console.log('Firebase configuration error:', error);
        setShowFirebaseSetup(true);
      }
    };

    checkFirebaseConfig();
  }, []);

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View style={[commonStyles.container, commonStyles.centered]}>
            <Text style={commonStyles.text}>Loading...</Text>
          </View>
          <StatusBar style="auto" />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    );
  }

  // Show Firebase setup if configuration is incomplete
  if (showFirebaseSetup) {
    return (
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <FirebaseSetup />
          <StatusBar style="auto" />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
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
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
