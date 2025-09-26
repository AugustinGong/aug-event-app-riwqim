
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useEvents } from '../../hooks/useEvents';
import { useNotifications } from '../../hooks/useNotifications';
import { Event } from '../../types';
import { commonStyles, colors, buttonStyles } from '../../styles/commonStyles';
import Icon from '../../components/Icon';
import PhotoGallery from '../../components/PhotoGallery';
import QRCodeGenerator from '../../components/QRCodeGenerator';
import i18n from '../../config/i18n';
import { Redirect } from 'expo-router';

type TabType = 'menu' | 'notifications' | 'album' | 'qr';

export default function EventDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { events, getEventById, updateEventStatus } = useEvents();
  const { sendNotification } = useNotifications();
  
  // Initialize all state hooks at the top level
  const [activeTab, setActiveTab] = useState<TabType>('menu');
  const [event, setEvent] = useState<Event | null>(null);

  const loadEventData = useCallback(async () => {
    if (!id) return;
    
    try {
      const existingEvent = events.find(e => e.id === id);
      if (existingEvent) {
        setEvent(existingEvent);
      } else {
        // Load event data if not in cache
        const eventData = await getEventById(id);
        if (eventData) {
          setEvent(eventData);
        } else {
          Alert.alert(i18n.t('common.error'), 'Event not found');
          router.back();
        }
      }
    } catch (error) {
      console.log('Error loading event:', error);
      Alert.alert(i18n.t('common.error'), 'Failed to load event');
      router.back();
    }
  }, [id, events, getEventById, router]);

  useEffect(() => {
    loadEventData();
  }, [loadEventData]);

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

  if (!event || !user) {
    return (
      <SafeAreaView style={[commonStyles.container, commonStyles.centerContent]}>
        <Text style={commonStyles.subtitle}>Loading event...</Text>
      </SafeAreaView>
    );
  }

  const isOrganizer = event.organizerId === user.id;

  const handleToggleEventStatus = async () => {
    try {
      const newStatus = event.isLive ? 'upcoming' : 'active';
      await updateEventStatus(event.id, newStatus);
      setEvent({ ...event, isLive: !event.isLive, status: newStatus });
    } catch (error: any) {
      Alert.alert(i18n.t('common.error'), error.message || 'Failed to update event status');
    }
  };

  const handleMarkCourseServed = async (courseId: string) => {
    try {
      // Find the course
      const course = event.menu.find(c => c.id === courseId);
      if (!course) return;

      // Send notification to all participants
      await sendNotification(event.id, `${course.name} is ready!`, 'course_ready');
      
      // Update local state (in a real app, you'd update the database)
      const updatedMenu = event.menu.map(c => 
        c.id === courseId ? { ...c, isServed: true } : c
      );
      setEvent({ ...event, menu: updatedMenu });
      
    } catch (error: any) {
      Alert.alert(i18n.t('common.error'), error.message || 'Failed to mark course as served');
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'menu':
        return (
          <View style={{ padding: 20 }}>
            <Text style={[commonStyles.sectionTitle, { marginBottom: 20 }]}>
              {i18n.t('event.menu')}
            </Text>
            
            {event.menu.map((course) => (
              <View key={course.id} style={[commonStyles.card, { marginBottom: 15 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[commonStyles.subtitle, { color: colors.primary, marginBottom: 4 }]}>
                      {course.name}
                    </Text>
                    <Text style={[commonStyles.caption, { color: colors.textSecondary, marginBottom: 8 }]}>
                      {i18n.t(`event.courses.${course.type}`)}
                    </Text>
                    {course.description && (
                      <Text style={[commonStyles.text, { marginBottom: 12 }]}>
                        {course.description}
                      </Text>
                    )}
                    
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Icon 
                        name={course.isServed ? "check-circle" : "clock"} 
                        size={16} 
                        color={course.isServed ? colors.success : colors.textSecondary} 
                      />
                      <Text style={[
                        commonStyles.caption, 
                        { 
                          marginLeft: 6,
                          color: course.isServed ? colors.success : colors.textSecondary 
                        }
                      ]}>
                        {course.isServed ? i18n.t('event.served') : i18n.t('event.notServed')}
                      </Text>
                    </View>
                  </View>
                  
                  {isOrganizer && !course.isServed && (
                    <TouchableOpacity
                      style={[buttonStyles.secondary, { paddingHorizontal: 12, paddingVertical: 6 }]}
                      onPress={() => handleMarkCourseServed(course.id)}
                    >
                      <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>
                        {i18n.t('event.markServed')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        );

      case 'notifications':
        return (
          <View style={{ padding: 20 }}>
            <Text style={[commonStyles.sectionTitle, { marginBottom: 20 }]}>
              {i18n.t('event.notifications')}
            </Text>
            
            {isOrganizer ? (
              <View>
                <Text style={[commonStyles.textSecondary, { marginBottom: 20 }]}>
                  {i18n.t('event.sendNotificationDescription')}
                </Text>
                
                {event.menu.map((course) => (
                  <TouchableOpacity
                    key={course.id}
                    style={[
                      commonStyles.card,
                      { 
                        marginBottom: 15,
                        opacity: course.isServed ? 0.5 : 1,
                      }
                    ]}
                    onPress={() => {
                      if (!course.isServed) {
                        handleMarkCourseServed(course.id);
                      }
                    }}
                    disabled={course.isServed}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Icon name="bell" size={20} color={colors.primary} />
                      <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text style={[commonStyles.subtitle, { marginBottom: 4 }]}>
                          {course.name}
                        </Text>
                        <Text style={[commonStyles.caption, { color: colors.textSecondary }]}>
                          {course.isServed ? i18n.t('event.alreadyServed') : i18n.t('event.tapToNotify')}
                        </Text>
                      </View>
                      <Icon 
                        name={course.isServed ? "check" : "chevron-right"} 
                        size={16} 
                        color={colors.textSecondary} 
                      />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={[commonStyles.centerContent, { marginTop: 50 }]}>
                <Icon name="bell" size={64} color={colors.textSecondary} />
                <Text style={[commonStyles.title, { marginTop: 20, textAlign: 'center' }]}>
                  {i18n.t('event.waitingForNotifications')}
                </Text>
                <Text style={[commonStyles.textSecondary, { textAlign: 'center', marginTop: 8 }]}>
                  {i18n.t('event.notificationsDescription')}
                </Text>
              </View>
            )}
          </View>
        );

      case 'album':
        return (
          <PhotoGallery
            eventId={event.id}
            user={user}
            isOrganizer={isOrganizer}
            canUpload={true}
          />
        );

      case 'qr':
        return (
          <View style={{ padding: 20 }}>
            <Text style={[commonStyles.sectionTitle, { marginBottom: 20 }]}>
              {i18n.t('event.qrCode')}
            </Text>
            
            {isOrganizer ? (
              <QRCodeGenerator 
                event={event} 
                onEventUpdate={(updatedEvent) => setEvent(updatedEvent)}
              />
            ) : (
              <View style={[commonStyles.centerContent, { marginTop: 50 }]}>
                <Icon name="qr-code" size={64} color={colors.textSecondary} />
                <Text style={[commonStyles.title, { marginTop: 20, textAlign: 'center' }]}>
                  {i18n.t('event.qrCodeOrganizerOnly')}
                </Text>
                <Text style={[commonStyles.textSecondary, { textAlign: 'center', marginTop: 8 }]}>
                  {i18n.t('event.qrCodeDescription')}
                </Text>
              </View>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  const tabs = [
    { id: 'menu' as TabType, name: i18n.t('event.menu'), icon: 'utensils' },
    { id: 'notifications' as TabType, name: i18n.t('event.notifications'), icon: 'bell' },
    { id: 'album' as TabType, name: i18n.t('event.album'), icon: 'image' },
    { id: 'qr' as TabType, name: i18n.t('event.qrCode'), icon: 'qr-code' },
  ];

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      <View style={[commonStyles.header, { paddingHorizontal: 20 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={[commonStyles.title, { color: colors.primary }]} numberOfLines={1}>
            {event.title}
          </Text>
          <Text style={[commonStyles.caption, { color: colors.textSecondary }]}>
            {event.date.toLocaleDateString()} • {event.location}
          </Text>
        </View>
        {isOrganizer && (
          <TouchableOpacity onPress={handleToggleEventStatus}>
            <Icon 
              name={event.isLive ? "pause" : "play"} 
              size={24} 
              color={event.isLive ? colors.error : colors.success} 
            />
          </TouchableOpacity>
        )}
      </View>

      <View style={{ flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20 }}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              {
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 8,
                alignItems: 'center',
                borderBottomWidth: 2,
                borderBottomColor: activeTab === tab.id ? colors.primary : 'transparent',
              }
            ]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Icon 
              name={tab.icon} 
              size={20} 
              color={activeTab === tab.id ? colors.primary : colors.textSecondary} 
            />
            <Text style={[
              commonStyles.caption,
              { 
                marginTop: 4,
                color: activeTab === tab.id ? colors.primary : colors.textSecondary,
                fontWeight: activeTab === tab.id ? '600' : '400',
              }
            ]}>
              {tab.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }}>
        {renderTabContent()}
      </ScrollView>
    </SafeAreaView>
  );
}
