
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

export default function RootLayout() {
  const { isLoading } = useAuth();
  const [isReady, setIsReady] = useState(false);

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
