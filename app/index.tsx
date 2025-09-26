
import React, { useEffect, useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { isSupabaseConfigured } from '../config/supabase';
import { commonStyles, colors } from '../styles/commonStyles';
import AuthForm from '../components/AuthForm';
import SupabaseSetup from '../components/SupabaseSetup';
import Icon from '../components/Icon';

export default function IndexScreen() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [showSupabaseSetup, setShowSupabaseSetup] = useState(false);

  useEffect(() => {
    console.log('Checking Supabase configuration...');
    console.log('Supabase configured:', isSupabaseConfigured);
    
    if (!isSupabaseConfigured) {
      setShowSupabaseSetup(true);
    }
  }, []);

  // Show loading state
  if (isLoading) {
    return (
      <SafeAreaView style={[commonStyles.container, commonStyles.centerContent]}>
        <Image
          source={require('../assets/images/40355e5b-3b1c-4cfa-836d-28026524860b.jpeg')}
          style={{ width: 64, height: 64, borderRadius: 16 }}
          resizeMode="contain"
        />
        <Text style={[commonStyles.subtitle, { marginTop: 16 }]}>
          Loading...
        </Text>
      </SafeAreaView>
    );
  }

  // Redirect to home if authenticated
  if (isAuthenticated && user) {
    return <Redirect href="/home" />;
  }

  // Show Supabase setup if not configured
  if (showSupabaseSetup) {
    return (
      <SafeAreaView style={commonStyles.container}>
        <SupabaseSetup />
      </SafeAreaView>
    );
  }

  // Show authentication form
  return (
    <SafeAreaView style={commonStyles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[commonStyles.container, { justifyContent: 'center', padding: 20 }]}>
            {/* Header */}
            <View style={[commonStyles.centerContent, { marginBottom: 40 }]}>
              <Image
                source={require('../assets/images/40355e5b-3b1c-4cfa-836d-28026524860b.jpeg')}
                style={{ width: 120, height: 120, borderRadius: 24 }}
                resizeMode="contain"
              />
              <Text style={[commonStyles.title, { marginTop: 16, fontSize: 32 }]}>
                AUG-Event
              </Text>
              <Text style={[commonStyles.subtitle, { textAlign: 'center', marginTop: 8 }]}>
                Create and join memorable dining events
              </Text>
            </View>

            {/* Auth Form */}
            <AuthForm onSuccess={() => {}} />

            {/* Footer */}
            <View style={[commonStyles.centerContent, { marginTop: 40 }]}>
              <Text style={[commonStyles.caption, { textAlign: 'center' }]}>
                Share moments, create memories
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
