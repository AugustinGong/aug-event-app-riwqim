
import { useEvents } from '../hooks/useEvents';
import LanguageSelector from '../components/LanguageSelector';
import { commonStyles, colors, buttonStyles } from '../styles/commonStyles';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import i18n, { addLanguageChangeListener } from '../config/i18n';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import Icon from '../components/Icon';
import { Redirect } from 'expo-router';
import { useAuth } from '../hooks/useAuth';

export default function JoinEventScreen() {
  const router = useRouter();
  const { joinEventWithPassword } = useEvents();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [forceUpdate, setForceUpdate] = useState(0);

  // Add language change listener for automatic UI updates
  useEffect(() => {
    const removeListener = addLanguageChangeListener(() => {
      console.log('Language changed in JoinEventScreen, forcing re-render');
      setForceUpdate(prev => prev + 1);
    });

    return removeListener;
  }, []);

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
      Alert.alert(i18n.t('common.error'), i18n.t('joinEvent.passwordHint'));
      return;
    }

    setLoading(true);
    try {
      const result = await joinEventWithPassword(eventId.trim(), password.trim());
      if (result.success) {
        Alert.alert(
          i18n.t('common.success'),
          result.message,
          [
            {
              text: i18n.t('common.ok'),
              onPress: () => router.replace('/home'),
            },
          ]
        );
      }
    } catch (error: any) {
      console.log('Error joining event:', error);
      Alert.alert(i18n.t('common.error'), error.message || 'Failed to join event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[commonStyles.header, { paddingHorizontal: 20 }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Icon name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[commonStyles.title, { color: colors.primary }]}>
            {i18n.t('joinEvent.title')}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={{ flex: 1, padding: 20 }}>
          {/* Join with Password Section */}
          <View style={[commonStyles.card, { marginBottom: 30 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
              <Icon name="key" size={24} color={colors.primary} />
              <Text style={[commonStyles.sectionTitle, { marginLeft: 12, marginBottom: 0 }]}>
                {i18n.t('joinEvent.joinWithPassword')}
              </Text>
            </View>

            <Text style={[commonStyles.textSecondary, { marginBottom: 20, fontSize: 14 }]}>
              {i18n.t('joinEvent.enterEventDetails')}
            </Text>

            {/* Event ID Input */}
            <View style={{ marginBottom: 20 }}>
              <Text style={[commonStyles.label, { marginBottom: 8 }]}>
                {i18n.t('joinEvent.eventId')}
              </Text>
              <TextInput
                style={commonStyles.input}
                placeholder={i18n.t('joinEvent.eventIdPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                value={eventId}
                onChangeText={setEventId}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password Input */}
            <View style={{ marginBottom: 20 }}>
              <Text style={[commonStyles.label, { marginBottom: 8 }]}>
                {i18n.t('joinEvent.password')}
              </Text>
              <TextInput
                style={commonStyles.input}
                placeholder={i18n.t('joinEvent.passwordPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={[commonStyles.textSecondary, { marginTop: 5, fontSize: 12 }]}>
                {i18n.t('joinEvent.passwordHint')}
              </Text>
            </View>

            {/* Join Button */}
            <TouchableOpacity
              style={[buttonStyles.primary, { opacity: loading ? 0.7 : 1 }]}
              onPress={handleJoinEvent}
              disabled={loading}
            >
              {loading ? (
                <Text style={{ color: 'white', fontWeight: '600' }}>
                  {i18n.t('common.loading')}
                </Text>
              ) : (
                <>
                  <Icon name="users" size={20} color="white" />
                  <Text style={{ color: 'white', marginLeft: 8, fontWeight: '600' }}>
                    {i18n.t('joinEvent.joinEvent')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* How to Join Section */}
          <View style={[commonStyles.card, { backgroundColor: colors.primaryLight }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
              <Icon name="help-circle" size={24} color={colors.primary} />
              <Text style={[commonStyles.sectionTitle, { marginLeft: 12, marginBottom: 0, color: colors.primary }]}>
                {i18n.t('joinEvent.howToJoin')}
              </Text>
            </View>

            <Text style={[commonStyles.text, { color: colors.primary, fontSize: 14 }]}>
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
