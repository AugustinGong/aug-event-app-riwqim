
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { commonStyles } from '../styles/commonStyles';
import AuthForm from '../components/AuthForm';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function IndexScreen() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <SafeAreaView style={commonStyles.container}>
        <View style={commonStyles.centerContent}>
          {/* Loading spinner could go here */}
        </View>
      </SafeAreaView>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/home" />;
  }

  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={commonStyles.centerContent}>
        <AuthForm onSuccess={() => {}} />
      </View>
    </SafeAreaView>
  );
}
