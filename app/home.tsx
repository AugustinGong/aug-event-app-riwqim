
import { useRouter } from 'expo-router';
import { useEvents } from '../hooks/useEvents';
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import Icon from '../components/Icon';
import { SafeAreaView } from 'react-native-safe-area-context';
import { commonStyles, colors, buttonStyles } from '../styles/commonStyles';
import EventCard from '../components/EventCard';
import LanguageSelector from '../components/LanguageSelector';
import i18n from '../config/i18n';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, Alert } from 'react-native';

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const { events, loading, loadEvents } = useEvents();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    Alert.alert(
      i18n.t('auth.logout'),
      i18n.t('auth.logoutConfirmation'),
      [
        {
          text: i18n.t('common.cancel'),
          style: 'cancel',
        },
        {
          text: i18n.t('auth.logout'),
          style: 'destructive',
          onPress: async () => {
            const result = await logout();
            if (!result.success) {
              Alert.alert(i18n.t('common.error'), result.error || 'Logout failed');
            }
          },
        },
      ]
    );
  };

  const myEvents = events.filter(event => event.organizerId === user?.id);
  const joinedEvents = events.filter(event => event.organizerId !== user?.id);

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      <View style={[commonStyles.header, { paddingHorizontal: 20 }]}>
        <View>
          <Text style={[commonStyles.title, { color: colors.primary }]}>
            {i18n.t('home.title')}
          </Text>
          <Text style={commonStyles.subtitle}>
            {i18n.t('home.subtitle')}
          </Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Icon name="log-out" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={{ flexDirection: 'row', marginBottom: 20 }}>
          <TouchableOpacity
            style={[buttonStyles.primary, { flex: 1, marginRight: 10 }]}
            onPress={() => router.push('/create-event')}
          >
            <Icon name="plus" size={20} color="white" />
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600', marginLeft: 8 }}>
              {i18n.t('home.createEvent')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[buttonStyles.secondary, { flex: 1, marginLeft: 10 }]}
            onPress={() => router.push('/scan-qr')}
          >
            <Icon name="qr-code" size={20} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600', marginLeft: 8 }}>
              {i18n.t('home.joinEvent')}
            </Text>
          </TouchableOpacity>
        </View>

        {myEvents.length > 0 && (
          <View style={{ marginBottom: 30 }}>
            <Text style={[commonStyles.sectionTitle, { marginBottom: 15 }]}>
              {i18n.t('home.myEvents')}
            </Text>
            {myEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onPress={() => router.push(`/event/${event.id}`)}
                isOrganizer={true}
              />
            ))}
          </View>
        )}

        {joinedEvents.length > 0 && (
          <View style={{ marginBottom: 30 }}>
            <Text style={[commonStyles.sectionTitle, { marginBottom: 15 }]}>
              {i18n.t('home.joinedEvents')}
            </Text>
            {joinedEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onPress={() => router.push(`/event/${event.id}`)}
                isOrganizer={false}
              />
            ))}
          </View>
        )}

        {events.length === 0 && !loading && (
          <View style={[commonStyles.centerContent, { marginTop: 50 }]}>
            <Icon name="calendar" size={64} color={colors.textSecondary} />
            <Text style={[commonStyles.title, { marginTop: 20, textAlign: 'center' }]}>
              {i18n.t('home.noEvents')}
            </Text>
            <Text style={[commonStyles.textSecondary, { textAlign: 'center', marginTop: 8 }]}>
              {i18n.t('home.noEventsDescription')}
            </Text>
          </View>
        )}

        <View style={{ marginTop: 30 }}>
          <LanguageSelector />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
