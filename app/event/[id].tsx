
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { commonStyles, colors, buttonStyles } from '../../styles/commonStyles';
import { useAuth } from '../../hooks/useAuth';
import { useEvents } from '../../hooks/useEvents';
import { Event } from '../../types';
import Icon from '../../components/Icon';
import QRCodeGenerator from '../../components/QRCodeGenerator';

const tabs = ['Menu', 'Notifications', 'Album', 'QR Code'] as const;
type TabType = typeof tabs[number];

export default function EventDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { events, updateEventStatus, markCourseServed } = useEvents();
  
  const [activeTab, setActiveTab] = useState<TabType>('Menu');
  const [event, setEvent] = useState<Event | null>(null);
  const [isOrganizer, setIsOrganizer] = useState(false);

  useEffect(() => {
    if (id) {
      const foundEvent = events.find(e => e.id === id);
      if (foundEvent) {
        setEvent(foundEvent);
        setIsOrganizer(foundEvent.organizerId === user?.id);
      }
    }
  }, [id, events, user]);

  if (!event) {
    return (
      <SafeAreaView style={commonStyles.container}>
        <View style={commonStyles.centerContent}>
          <Text style={commonStyles.text}>Event not found</Text>
          <TouchableOpacity
            style={[buttonStyles.primary, { marginTop: 20 }]}
            onPress={() => router.back()}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleToggleEventStatus = async () => {
    const result = await updateEventStatus(event.id, !event.isLive);
    if (result.success) {
      setEvent({ ...event, isLive: !event.isLive });
    } else {
      Alert.alert('Error', result.error || 'Failed to update event status');
    }
  };

  const handleMarkCourseServed = async (courseId: string) => {
    const result = await markCourseServed(event.id, courseId);
    if (result.success) {
      const updatedMenu = event.menu.map(course => 
        course.id === courseId ? { ...course, isServed: true } : course
      );
      setEvent({ ...event, menu: updatedMenu });
      
      // In a real app, this would send push notifications
      Alert.alert('Course Served', 'Notification sent to all participants!');
    } else {
      Alert.alert('Error', result.error || 'Failed to mark course as served');
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Menu':
        return (
          <View>
            {isOrganizer && (
              <View style={[commonStyles.card, { marginBottom: 16 }]}>
                <View style={[commonStyles.spaceBetween, { marginBottom: 16 }]}>
                  <Text style={commonStyles.subtitle}>Event Control</Text>
                  <View style={{
                    backgroundColor: event.isLive ? colors.success : colors.textSecondary,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                  }}>
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
                      {event.isLive ? 'LIVE' : 'NOT LIVE'}
                    </Text>
                  </View>
                </View>
                
                <TouchableOpacity
                  style={[
                    buttonStyles.primary,
                    { backgroundColor: event.isLive ? colors.error : colors.success }
                  ]}
                  onPress={handleToggleEventStatus}
                >
                  <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                    {event.isLive ? 'End Event' : 'Start Event'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {event.menu.map((course) => (
              <View key={course.id} style={commonStyles.smallCard}>
                <View style={commonStyles.spaceBetween}>
                  <View style={{ flex: 1 }}>
                    <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: 4 }]}>
                      {course.name}
                    </Text>
                    <Text style={[commonStyles.textSecondary, { fontSize: 12, marginBottom: 8 }]}>
                      {course.type.toUpperCase()}
                    </Text>
                    {course.description && (
                      <Text style={commonStyles.textSecondary}>
                        {course.description}
                      </Text>
                    )}
                  </View>
                  
                  <View style={{ alignItems: 'flex-end' }}>
                    {course.isServed ? (
                      <View style={{
                        backgroundColor: colors.success,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 12,
                      }}>
                        <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
                          Served
                        </Text>
                      </View>
                    ) : isOrganizer && event.isLive ? (
                      <TouchableOpacity
                        style={[buttonStyles.secondary, { paddingHorizontal: 12, paddingVertical: 6 }]}
                        onPress={() => handleMarkCourseServed(course.id)}
                      >
                        <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
                          Serve Now
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={{
                        backgroundColor: colors.textSecondary,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 12,
                      }}>
                        <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
                          Pending
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        );

      case 'Notifications':
        return (
          <View style={commonStyles.card}>
            <Text style={[commonStyles.textSecondary, { textAlign: 'center' }]}>
              Notifications feature coming soon!
            </Text>
          </View>
        );

      case 'Album':
        return (
          <View style={commonStyles.card}>
            <Text style={[commonStyles.textSecondary, { textAlign: 'center' }]}>
              Photo album feature coming soon!
            </Text>
          </View>
        );

      case 'QR Code':
        return isOrganizer ? (
          <QRCodeGenerator event={event} />
        ) : (
          <View style={commonStyles.card}>
            <Text style={[commonStyles.textSecondary, { textAlign: 'center' }]}>
              Only organizers can view the QR code
            </Text>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={commonStyles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[commonStyles.subtitle, { margin: 0 }]} numberOfLines={1}>
            {event.title}
          </Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <View style={commonStyles.card}>
        <Text style={[commonStyles.text, { marginBottom: 4 }]}>
          {new Date(event.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
        <View style={commonStyles.centerRow}>
          <Icon name="location" size={16} color={colors.textSecondary} />
          <Text style={[commonStyles.textSecondary, { marginLeft: 4 }]}>
            {event.location}
          </Text>
        </View>
        <View style={[commonStyles.centerRow, { marginTop: 8 }]}>
          <Icon name="people" size={16} color={colors.textSecondary} />
          <Text style={[commonStyles.textSecondary, { marginLeft: 4 }]}>
            {event.participants.length} participants
          </Text>
        </View>
      </View>

      <View style={commonStyles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              commonStyles.tab,
              activeTab === tab && commonStyles.activeTab,
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={{
                color: activeTab === tab ? 'white' : colors.textSecondary,
                fontSize: 14,
                fontWeight: '600',
              }}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={commonStyles.content}>
        {renderTabContent()}
      </ScrollView>
    </SafeAreaView>
  );
}
