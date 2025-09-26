
import { Redirect } from 'expo-router';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { commonStyles, colors, buttonStyles } from '../styles/commonStyles';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from 'expo-router';
import i18n from '../config/i18n';
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEvents } from '../hooks/useEvents';
import Icon from '../components/Icon';
import LanguageSelector from '../components/LanguageSelector';

export default function JoinEventScreen() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { joinEventWithPassword } = useEvents();
  const router = useRouter();
  
  const [eventId, setEventId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect to login if not authenticated
  if (!isLoading && !isAuthenticated) {
    console.log('User not authenticated, redirecting to login');
    return <Redirect href="/" />;
  }

  // Show loading if still checking authentication
  if (isLoading) {
    return (
      <SafeAreaView style={[commonStyles.container, commonStyles.centerContent]}>
        <Text style={[commonStyles.subtitle]}>
          {i18n.t('common.loading')}
        </Text>
      </SafeAreaView>
    );
  }

  const handleJoinEvent = async () => {
    if (!eventId.trim()) {
      Alert.alert(i18n.t('common.error'), 'Please enter an event ID');
      return;
    }

    if (!password.trim()) {
      Alert.alert(i18n.t('common.error'), 'Please enter the event password');
      return;
    }

    if (password.length < 4) {
      Alert.alert(i18n.t('common.error'), 'Password must be at least 4 characters long');
      return;
    }

    setLoading(true);
    try {
      console.log('Attempting to join event:', eventId, 'with password:', password);
      
      const result = await joinEventWithPassword(eventId.trim(), password.trim());
      
      if (result.success) {
        Alert.alert(
          i18n.t('common.success'),
          result.message || 'Successfully joined the event!',
          [
            {
              text: i18n.t('common.ok'),
              onPress: () => {
                router.push('/home');
              },
            },
          ]
        );
      }
    } catch (error: any) {
      console.log('Error joining event:', error);
      Alert.alert(
        i18n.t('common.error'),
        error.message || 'Failed to join event. Please check your event ID and password.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={[commonStyles.header, { paddingHorizontal: 20 }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Icon name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[commonStyles.title, { color: colors.primary }]}>
            {i18n.t('joinEvent.title')}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20 }}>
          <View style={[commonStyles.card, { marginBottom: 30 }]}>
            <View style={[commonStyles.centerContent, { marginBottom: 30 }]}>
              <View style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: colors.primaryLight,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 20,
              }}>
                <Icon name="users" size={40} color={colors.primary} />
              </View>
              <Text style={[commonStyles.title, { textAlign: 'center', marginBottom: 10 }]}>
                {i18n.t('joinEvent.joinWithPassword')}
              </Text>
              <Text style={[commonStyles.textSecondary, { textAlign: 'center' }]}>
                {i18n.t('joinEvent.enterEventDetails')}
              </Text>
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text style={[commonStyles.label, { marginBottom: 8 }]}>
                {i18n.t('joinEvent.eventId')}
              </Text>
              <TextInput
                style={commonStyles.input}
                value={eventId}
                onChangeText={setEventId}
                placeholder={i18n.t('joinEvent.eventIdPlaceholder')}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={{ marginBottom: 30 }}>
              <Text style={[commonStyles.label, { marginBottom: 8 }]}>
                {i18n.t('joinEvent.password')}
              </Text>
              <TextInput
                style={commonStyles.input}
                value={password}
                onChangeText={setPassword}
                placeholder={i18n.t('joinEvent.passwordPlaceholder')}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={[commonStyles.textSecondary, { fontSize: 12, marginTop: 5 }]}>
                {i18n.t('joinEvent.passwordHint')}
              </Text>
            </View>

            <TouchableOpacity
              style={[buttonStyles.primary, { marginBottom: 20 }]}
              onPress={handleJoinEvent}
              disabled={loading}
            >
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                {loading ? i18n.t('common.loading') : i18n.t('joinEvent.joinEvent')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[commonStyles.card, { backgroundColor: colors.primaryLight }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <Icon name="info" size={20} color={colors.primary} />
              <Text style={[commonStyles.subtitle, { color: colors.primary, marginLeft: 10 }]}>
                {i18n.t('joinEvent.howToJoin')}
              </Text>
            </View>
            <Text style={[commonStyles.textSecondary, { lineHeight: 20 }]}>
              {i18n.t('joinEvent.instructions')}
            </Text>
          </View>
        </View>

        {/* Floating Language Selector Bubble */}
        <View style={{
          position: 'absolute',
          bottom: 30,
          right: 20,
          zIndex: 1000,
        }}>
          <LanguageSelector isFloating={true} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
