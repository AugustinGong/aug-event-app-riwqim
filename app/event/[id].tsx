
import PhotoGallery from '../../components/PhotoGallery';
import Icon from '../../components/Icon';
import React, { useState, useEffect, useCallback } from 'react';
import { useEvents } from '../../hooks/useEvents';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNotifications } from '../../hooks/useNotifications';
import { useAuth } from '../../hooks/useAuth';
import { Event } from '../../types';
import QRCodeGenerator from '../../components/QRCodeGenerator';
import { commonStyles, colors, buttonStyles } from '../../styles/commonStyles';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import i18n from '../../config/i18n';

type TabType = 'menu' | 'notifications' | 'album' | 'qr';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { events, loadEvent, updateEvent } = useEvents();
  const { notifications, loadNotifications, sendNotification } = useNotifications();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('menu');
  const [event, setEvent] = useState<Event | null>(null);

  const loadEventData = useCallback(async () => {
    if (id) {
      await loadEvent(id);
      await loadNotifications(id);
    }
  }, [id, loadEvent, loadNotifications]);

  useEffect(() => {
    loadEventData();
  }, [loadEventData]);

  useEffect(() => {
    const foundEvent = events.find(e => e.id === id);
    if (foundEvent) {
      setEvent(foundEvent);
    }
  }, [events, id]);

  if (!event || !user) {
    return (
      <SafeAreaView style={[commonStyles.container, commonStyles.centerContent]}>
        <Text style={commonStyles.text}>{i18n.t('common.loading')}</Text>
      </SafeAreaView>
    );
  }

  const isOrganizer = event.organizerId === user.id;

  const handleToggleEventStatus = async () => {
    try {
      const newStatus = event.status === 'active' ? 'ended' : 'active';
      await updateEvent(event.id, { status: newStatus });
      
      if (newStatus === 'active') {
        await sendNotification(event.id, `${event.title} has started!`, 'event_start');
      } else {
        await sendNotification(event.id, `${event.title} has ended. Thank you for joining!`, 'event_end');
      }
    } catch (error: any) {
      console.log('Error updating event status:', error);
      Alert.alert(i18n.t('common.error'), error.message || i18n.t('errors.unknownError'));
    }
  };

  const handleMarkCourseServed = async (courseId: string) => {
    try {
      const updatedMenu = event.menu.map(course => 
        course.id === courseId ? { ...course, served: !course.served } : course
      );
      
      await updateEvent(event.id, { menu: updatedMenu });
      
      const course = event.menu.find(c => c.id === courseId);
      if (course && !course.served) {
        const courseMessages = {
          appetizer: i18n.t('notifications.appetizerReady'),
          first: i18n.t('notifications.firstCourseReady'),
          main: i18n.t('notifications.mainCourseReady'),
          dessert: i18n.t('notifications.dessertReady'),
          cake: i18n.t('notifications.cakeTime'),
        };
        
        const message = courseMessages[course.type] || `${course.name} is ready!`;
        await sendNotification(event.id, message, 'course');
      }
    } catch (error: any) {
      console.log('Error updating course:', error);
      Alert.alert(i18n.t('common.error'), error.message || i18n.t('errors.unknownError'));
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'menu':
        return (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
            {event.menu.length === 0 ? (
              <View style={[commonStyles.centerContent, { marginTop: 50 }]}>
                <Icon name="utensils" size={64} color={colors.textSecondary} />
                <Text style={[commonStyles.title, { marginTop: 20, textAlign: 'center' }]}>
                  No menu items
                </Text>
              </View>
            ) : (
              event.menu.map((course) => (
                <View key={course.id} style={[commonStyles.card, { marginBottom: 15 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={[commonStyles.subtitle, { color: course.served ? colors.success : colors.text }]}>
                      {course.name}
                    </Text>
                    {isOrganizer && (
                      <TouchableOpacity
                        style={[
                          buttonStyles.secondary,
                          { 
                            backgroundColor: course.served ? colors.success : colors.primaryLight,
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                          }
                        ]}
                        onPress={() => handleMarkCourseServed(course.id)}
                      >
                        <Text style={{ 
                          color: course.served ? 'white' : colors.primary, 
                          fontSize: 12, 
                          fontWeight: '600' 
                        }}>
                          {course.served ? i18n.t('event.served') : i18n.t('event.markServed')}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {course.description && (
                    <Text style={[commonStyles.textSecondary, { marginTop: 5 }]}>
                      {course.description}
                    </Text>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        );

      case 'notifications':
        return (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
            {notifications.length === 0 ? (
              <View style={[commonStyles.centerContent, { marginTop: 50 }]}>
                <Icon name="bell" size={64} color={colors.textSecondary} />
                <Text style={[commonStyles.title, { marginTop: 20, textAlign: 'center' }]}>
                  {i18n.t('event.noNotifications')}
                </Text>
              </View>
            ) : (
              notifications.map((notification) => (
                <View key={notification.id} style={[commonStyles.card, { marginBottom: 15 }]}>
                  <Text style={commonStyles.text}>{notification.message}</Text>
                  <Text style={[commonStyles.textSecondary, { marginTop: 5, fontSize: 12 }]}>
                    {notification.createdAt.toLocaleString()}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        );

      case 'album':
        return (
          <PhotoGallery
            eventId={event.id}
            user={user}
            isOrganizer={isOrganizer}
            canUpload={event.status === 'active'}
          />
        );

      case 'qr':
        return (
          <View style={{ flex: 1, padding: 20 }}>
            <QRCodeGenerator eventId={event.id} />
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      <View style={commonStyles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[commonStyles.subtitle, { margin: 0 }]}>
          {event.title}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={{ padding: 20, paddingBottom: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
          <Icon name="calendar" size={16} color={colors.textSecondary} />
          <Text style={[commonStyles.textSecondary, { marginLeft: 8 }]}>
            {event.date.toLocaleDateString()} at {event.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
          <Icon name="map-pin" size={16} color={colors.textSecondary} />
          <Text style={[commonStyles.textSecondary, { marginLeft: 8 }]}>
            {event.location}
          </Text>
        </View>

        {isOrganizer && (
          <TouchableOpacity
            style={[
              buttonStyles.primary,
              { 
                backgroundColor: event.status === 'active' ? colors.error : colors.success,
                marginBottom: 20,
              }
            ]}
            onPress={handleToggleEventStatus}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
              {event.status === 'active' ? i18n.t('event.endEvent') : i18n.t('event.startEvent')}
            </Text>
          </TouchableOpacity>
        )}

        {event.status === 'active' && (
          <View style={[commonStyles.card, { backgroundColor: colors.successLight, marginBottom: 20 }]}>
            <Text style={[commonStyles.text, { color: colors.success, textAlign: 'center' }]}>
              {i18n.t('event.eventStarted')}
            </Text>
          </View>
        )}

        {event.status === 'ended' && (
          <View style={[commonStyles.card, { backgroundColor: colors.errorLight, marginBottom: 20 }]}>
            <Text style={[commonStyles.text, { color: colors.error, textAlign: 'center' }]}>
              {i18n.t('event.eventEnded')}
            </Text>
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', paddingHorizontal: 20, marginBottom: 10 }}>
        {[
          { key: 'menu' as TabType, label: i18n.t('event.menu'), icon: 'utensils' },
          { key: 'notifications' as TabType, label: i18n.t('event.notifications'), icon: 'bell' },
          { key: 'album' as TabType, label: i18n.t('event.album'), icon: 'image' },
          { key: 'qr' as TabType, label: i18n.t('event.qrCode'), icon: 'qr-code' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              buttonStyles.secondary,
              {
                flex: 1,
                marginHorizontal: 2,
                backgroundColor: activeTab === tab.key ? colors.primary : colors.cardBackground,
                paddingVertical: 8,
              }
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Icon 
              name={tab.icon} 
              size={16} 
              color={activeTab === tab.key ? 'white' : colors.primary} 
            />
            <Text style={{
              color: activeTab === tab.key ? 'white' : colors.primary,
              fontSize: 12,
              fontWeight: '600',
              marginTop: 4,
              textAlign: 'center',
            }}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {renderTabContent()}
    </SafeAreaView>
  );
}
