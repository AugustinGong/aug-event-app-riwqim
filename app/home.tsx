
import { Redirect } from 'expo-router';
import { commonStyles, colors, buttonStyles } from '../styles/commonStyles';
import { useAuth } from '../hooks/useAuth';
import LanguageSelector from '../components/LanguageSelector';
import { useRouter } from 'expo-router';
import i18n from '../config/i18n';
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEvents } from '../hooks/useEvents';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, Alert, Image } from 'react-native';
import Icon from '../components/Icon';
import EventCard from '../components/EventCard';

export default function HomeScreen() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { events, loading, loadEvents } = useEvents();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  // Move useEffect to the top level, before any conditional logic
  useEffect(() => {
    if (user) {
      console.log('User authenticated, loading events for:', user.email);
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
    await loadEvents();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    Alert.alert(
      i18n.t('auth.signOut'),
      'Are you sure you want to sign out?',
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('auth.signOut'),
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await logout();
              if (result.success) {
                router.replace('/');
              } else {
                Alert.alert(i18n.t('common.error'), result.error || 'Failed to sign out');
              }
            } catch (error: any) {
              console.log('Error signing out:', error);
              Alert.alert(i18n.t('common.error'), error.message || 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const myEvents = events.filter(event => event.organizerId === user?.id);
  const joinedEvents = events.filter(event => 
    event.organizerId !== user?.id && 
    event.participants?.some(p => p === user?.id)
  );

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[commonStyles.header, { paddingHorizontal: 20 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Image 
            source={require('../assets/images/39080b9e-5985-4ab4-8518-0188f6dbb943.png')}
            style={{ width: 32, height: 32, marginRight: 12 }}
          />
          <Text style={[commonStyles.title, { color: colors.primary }]}>
            AUG-Event
          </Text>
        </View>
        {/* Logout button moved to top right */}
        <TouchableOpacity 
          style={{
            backgroundColor: colors.error,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            flexDirection: 'row',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
          }}
          onPress={handleLogout}
        >
          <Icon name="log-out" size={18} color="white" />
          <Text style={{ color: 'white', marginLeft: 6, fontSize: 14, fontWeight: '600' }}>
            {i18n.t('auth.signOut')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Welcome Section */}
      <View style={[commonStyles.card, { margin: 20, marginBottom: 10 }]}>
        <Text style={[commonStyles.title, { marginBottom: 5 }]}>
          Welcome back, {user?.name}!
        </Text>
        <Text style={[commonStyles.textSecondary]}>
          Manage your events and join new ones
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20, gap: 10 }}>
        <TouchableOpacity
          style={[buttonStyles.primary, { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
          onPress={() => router.push('/create-event')}
        >
          <Icon name="add" size={20} color="white" />
          <Text style={{ color: 'white', marginLeft: 8, fontSize: 16, fontWeight: '600' }}>
            {i18n.t('home.createEvent')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[buttonStyles.secondary, { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
          onPress={() => router.push('/scan-qr')}
        >
          <Icon name="people" size={20} color={colors.primary} />
          <Text style={{ color: colors.primary, marginLeft: 8, fontSize: 16, fontWeight: '600' }}>
            {i18n.t('home.joinEvent')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Events List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading && events.length === 0 ? (
          <View style={[commonStyles.centerContent, { marginTop: 50 }]}>
            <Text style={[commonStyles.textSecondary]}>
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
          <>
            {/* My Events */}
            {myEvents.length > 0 && (
              <>
                <Text style={[commonStyles.sectionTitle, { marginBottom: 15, marginTop: 10 }]}>
                  {i18n.t('home.myEvents')} ({myEvents.length})
                </Text>
                {myEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    isOrganizer={true}
                    onPress={() => router.push(`/event/${event.id}`)}
                  />
                ))}
              </>
            )}

            {/* Joined Events */}
            {joinedEvents.length > 0 && (
              <>
                <Text style={[commonStyles.sectionTitle, { marginBottom: 15, marginTop: myEvents.length > 0 ? 30 : 10 }]}>
                  {i18n.t('home.joinedEvents')} ({joinedEvents.length})
                </Text>
                {joinedEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    isOrganizer={false}
                    onPress={() => router.push(`/event/${event.id}`)}
                  />
                ))}
              </>
            )}
          </>
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
