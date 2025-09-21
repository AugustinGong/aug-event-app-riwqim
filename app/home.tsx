
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { commonStyles, colors, buttonStyles } from '../styles/commonStyles';
import { useAuth } from '../hooks/useAuth';
import { useEvents } from '../hooks/useEvents';
import EventCard from '../components/EventCard';
import Icon from '../components/Icon';

export default function HomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { userEvents, isLoading, refreshEvents } = useEvents(user?.id);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshEvents();
    setRefreshing(false);
  };

  const organizedEvents = userEvents.filter(event => event.organizerId === user?.id);
  const joinedEvents = userEvents.filter(event => event.organizerId !== user?.id);

  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={commonStyles.header}>
        <View>
          <Text style={commonStyles.title}>AUG-Event</Text>
          <Text style={commonStyles.textSecondary}>Welcome back, {user?.name}!</Text>
        </View>
        <TouchableOpacity onPress={logout}>
          <Icon name="log-out" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={commonStyles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={commonStyles.section}>
          <View style={[commonStyles.spaceBetween, { marginBottom: 16 }]}>
            <TouchableOpacity
              style={[buttonStyles.primary, { flex: 1, marginRight: 8 }]}
              onPress={() => router.push('/create-event')}
            >
              <View style={commonStyles.centerRow}>
                <Icon name="add" size={20} color="white" />
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '600', marginLeft: 8 }}>
                  Create Event
                </Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[buttonStyles.secondary, { flex: 1, marginLeft: 8 }]}
              onPress={() => router.push('/scan-qr')}
            >
              <View style={commonStyles.centerRow}>
                <Icon name="qr-code" size={20} color="white" />
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '600', marginLeft: 8 }}>
                  Join Event
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={commonStyles.section}>
          <Text style={[commonStyles.subtitle, { marginBottom: 16 }]}>
            My Events ({organizedEvents.length})
          </Text>
          {organizedEvents.length === 0 ? (
            <View style={commonStyles.card}>
              <Text style={[commonStyles.textSecondary, { textAlign: 'center' }]}>
                You haven&apos;t created any events yet
              </Text>
            </View>
          ) : (
            organizedEvents.map(event => (
              <EventCard
                key={event.id}
                event={event}
                isOrganizer={true}
                onPress={() => router.push(`/event/${event.id}`)}
              />
            ))
          )}
        </View>

        <View style={commonStyles.section}>
          <Text style={[commonStyles.subtitle, { marginBottom: 16 }]}>
            Joined Events ({joinedEvents.length})
          </Text>
          {joinedEvents.length === 0 ? (
            <View style={commonStyles.card}>
              <Text style={[commonStyles.textSecondary, { textAlign: 'center' }]}>
                You haven&apos;t joined any events yet
              </Text>
            </View>
          ) : (
            joinedEvents.map(event => (
              <EventCard
                key={event.id}
                event={event}
                isOrganizer={false}
                onPress={() => router.push(`/event/${event.id}`)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
