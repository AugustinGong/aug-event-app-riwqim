
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, Alert, Image } from 'react-native';
import { useEvents } from '../hooks/useEvents';
import LanguageSelector from '../components/LanguageSelector';
import { commonStyles, colors, buttonStyles } from '../styles/commonStyles';
import { useRouter } from 'expo-router';
import i18n, { addLanguageChangeListener } from '../config/i18n';
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import EventCard from '../components/EventCard';
import Icon from '../components/Icon';
import { Redirect } from 'expo-router';
import { useAuth } from '../hooks/useAuth';

export default function HomeScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  const { user, isAuthenticated, isLoading, signOut } = useAuth();
  const router = useRouter();
  const { events, loading, loadEvents } = useEvents();

  // Add language change listener for automatic UI updates
  useEffect(() => {
    const removeListener = addLanguageChangeListener(() => {
      console.log('Language changed in HomeScreen, forcing re-render');
      setForceUpdate(prev => prev + 1);
    });

    return removeListener;
  }, []);

  useEffect(() => {
    if (user) {
      console.log('User authenticated, loading events');
      loadEvents();
    }
  }, [user, loadEvents]);

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

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadEvents();
    } catch (error) {
      console.log('Error refreshing events:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      i18n.t('settings.signOut'),
      'Are you sure you want to sign out?',
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('settings.signOut'),
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              console.log('User signed out successfully');
            } catch (error: any) {
              console.log('Error signing out:', error);
              Alert.alert(i18n.t('common.error'), error.message || 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  // Filter events by status
  const upcomingEvents = events.filter(event => event.status === 'upcoming');
  const activeEvents = events.filter(event => event.status === 'active');
  const endedEvents = events.filter(event => event.status === 'ended');
  const cancelledEvents = events.filter(event => event.status === 'cancelled');

  // Organize events by user's role
  const myEvents = events.filter(event => event.organizerId === user?.id);
  const joinedEvents = events.filter(event => 
    event.organizerId !== user?.id && 
    event.participants.some(participant => participant.id === user?.id)
  );

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      {/* Header with logout button */}
      <View style={[commonStyles.header, { paddingHorizontal: 20, justifyContent: 'space-between' }]}>
        <Text style={[commonStyles.title, { color: colors.primary }]}>
          {i18n.t('home.title')}
        </Text>
        <TouchableOpacity
          onPress={handleLogout}
          style={{
            padding: 8,
            borderRadius: 8,
            backgroundColor: colors.errorLight,
          }}
        >
          <Icon name="log-out" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Welcome Section */}
        <View style={{ padding: 20 }}>
          <Text style={[commonStyles.subtitle, { marginBottom: 5 }]}>
            Welcome back, {user?.name || 'User'}!
          </Text>
          <Text style={[commonStyles.textSecondary]}>
            {events.length === 0 
              ? i18n.t('home.noEventsDescription')
              : `You have ${events.length} event${events.length === 1 ? '' : 's'}`
            }
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={{ paddingHorizontal: 20, marginBottom: 30 }}>
          <View style={{ flexDirection: 'row', gap: 15 }}>
            <TouchableOpacity
              style={[buttonStyles.primary, { flex: 1 }]}
              onPress={() => router.push('/create-event')}
            >
              <Icon name="plus" size={20} color="white" />
              <Text style={{ color: 'white', marginLeft: 8, fontWeight: '600' }}>
                {i18n.t('home.createEvent')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[buttonStyles.secondary, { flex: 1 }]}
              onPress={() => router.push('/scan-qr')}
            >
              <Icon name="users" size={20} color={colors.primary} />
              <Text style={{ color: colors.primary, marginLeft: 8, fontWeight: '600' }}>
                {i18n.t('home.joinEvent')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Events List */}
        {loading ? (
          <View style={[commonStyles.centerContent, { marginTop: 50 }]}>
            <Text style={[commonStyles.subtitle]}>
              {i18n.t('common.loading')}
            </Text>
          </View>
        ) : events.length === 0 ? (
          <View style={[commonStyles.centerContent, { marginTop: 50 }]}>
            <Icon name="calendar" size={64} color={colors.textSecondary} />
            <Text style={[commonStyles.title, { marginTop: 20, textAlign: 'center' }]}>
              {i18n.t('home.noEvents')}
            </Text>
            <Text style={[commonStyles.textSecondary, { textAlign: 'center', marginTop: 10 }]}>
              {i18n.t('home.noEventsDescription')}
            </Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20 }}>
            {/* Active Events */}
            {activeEvents.length > 0 && (
              <View style={{ marginBottom: 30 }}>
                <Text style={[commonStyles.sectionTitle, { marginBottom: 15, color: colors.success }]}>
                  Active Events
                </Text>
                {activeEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onPress={() => router.push(`/event/${event.id}`)}
                    isOrganizer={event.organizerId === user?.id}
                  />
                ))}
              </View>
            )}

            {/* Upcoming Events */}
            {upcomingEvents.length > 0 && (
              <View style={{ marginBottom: 30 }}>
                <Text style={[commonStyles.sectionTitle, { marginBottom: 15 }]}>
                  {i18n.t('home.upcomingEvents')}
                </Text>
                {upcomingEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onPress={() => router.push(`/event/${event.id}`)}
                    isOrganizer={event.organizerId === user?.id}
                  />
                ))}
              </View>
            )}

            {/* My Events */}
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

            {/* Joined Events */}
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

            {/* Cancelled Events */}
            {cancelledEvents.length > 0 && (
              <View style={{ marginBottom: 30 }}>
                <Text style={[commonStyles.sectionTitle, { marginBottom: 15, color: colors.error }]}>
                  Cancelled Events
                </Text>
                {cancelledEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onPress={() => router.push(`/event/${event.id}`)}
                    isOrganizer={event.organizerId === user?.id}
                  />
                ))}
              </View>
            )}

            {/* Past Events */}
            {endedEvents.length > 0 && (
              <View style={{ marginBottom: 30 }}>
                <Text style={[commonStyles.sectionTitle, { marginBottom: 15 }]}>
                  {i18n.t('home.pastEvents')}
                </Text>
                {endedEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onPress={() => router.push(`/event/${event.id}`)}
                    isOrganizer={event.organizerId === user?.id}
                  />
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Floating Language Selector Bubble */}
      <View style={{
        position: 'absolute',
        bottom: 30,
        right: 20,
        zIndex: 1000,
      }}>
        <LanguageSelector isFloating={true} />
      </View>
    </SafeAreaView>
  );
}
