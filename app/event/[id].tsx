
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useEvents } from '../../hooks/useEvents';
import { useNotifications } from '../../hooks/useNotifications';
import { Event } from '../../types';
import { commonStyles, colors, buttonStyles } from '../../styles/commonStyles';
import Icon from '../../components/Icon';
import QRCodeGenerator from '../../components/QRCodeGenerator';
import PhotoGallery from '../../components/PhotoGallery';

type TabType = 'menu' | 'notifications' | 'album' | 'qr';

export default function EventDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { getEventById, toggleEventStatus, markCourseServed } = useEvents();
  const { sendCourseNotification } = useNotifications();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('menu');

  useEffect(() => {
    if (id && user) {
      loadEvent();
    }
  }, [id, user]);

  const loadEvent = async () => {
    if (!id) {
      router.back();
      return;
    }

    try {
      setIsLoading(true);
      console.log('Loading event:', id);
      
      const eventData = await getEventById(id);
      setEvent(eventData);
    } catch (error) {
      console.log('Error loading event:', error);
      Alert.alert('Error', 'Failed to load event details');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleEventStatus = async () => {
    if (!event || !user) return;

    const newStatus = !event.isLive;
    const result = await toggleEventStatus(event.id, newStatus);
    
    if (result.success) {
      setEvent(prev => prev ? { ...prev, isLive: newStatus } : null);
      
      Alert.alert(
        'Event Status Updated',
        `Event is now ${newStatus ? 'live' : 'paused'}`
      );
    } else {
      Alert.alert('Error', result.error || 'Failed to update event status');
    }
  };

  const handleMarkCourseServed = async (courseId: string) => {
    if (!event || !user) return;

    const course = event.menu.find(c => c.id === courseId);
    if (!course) return;

    const result = await markCourseServed(event.id, courseId);
    
    if (result.success) {
      // Update local state
      setEvent(prev => prev ? {
        ...prev,
        menu: prev.menu.map(c => 
          c.id === courseId ? { ...c, isServed: true } : c
        )
      } : null);

      // Send notification
      await sendCourseNotification(event.id, course.name, course.type);
      
      Alert.alert('Course Served', `${course.name} has been marked as served and participants have been notified.`);
    } else {
      Alert.alert('Error', result.error || 'Failed to mark course as served');
    }
  };

  const renderTabContent = () => {
    if (!event || !user) return null;

    const isOrganizer = event.organizerId === user.id;

    switch (activeTab) {
      case 'menu':
        return (
          <View style={{ flex: 1 }}>
            {event.menu.length === 0 ? (
              <View style={[commonStyles.centerContent, { paddingVertical: 40 }]}>
                <Icon name="utensils" size={48} color={colors.textSecondary} />
                <Text style={[commonStyles.subtitle, { marginTop: 16, textAlign: 'center' }]}>
                  No menu items
                </Text>
                <Text style={[commonStyles.caption, { textAlign: 'center', marginTop: 8 }]}>
                  The organizer hasn&apos;t added any menu items yet
                </Text>
              </View>
            ) : (
              <ScrollView style={{ flex: 1 }}>
                {event.menu.map((course) => (
                  <View
                    key={course.id}
                    style={{
                      backgroundColor: colors.surface,
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 12,
                      borderWidth: 1,
                      borderColor: course.isServed ? colors.success : colors.border,
                      ...commonStyles.shadow,
                    }}
                  >
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                    }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[commonStyles.subtitle, { 
                          color: course.isServed ? colors.success : colors.text 
                        }]}>
                          {course.name}
                        </Text>
                        <Text style={[commonStyles.caption, { 
                          color: colors.primary,
                          textTransform: 'capitalize',
                          marginTop: 2,
                        }]}>
                          {course.type}
                        </Text>
                      </View>
                      
                      {course.isServed && (
                        <Icon name="check-circle" size={24} color={colors.success} />
                      )}
                    </View>
                    
                    {course.description && (
                      <Text style={[commonStyles.caption, { marginBottom: 12 }]}>
                        {course.description}
                      </Text>
                    )}
                    
                    {isOrganizer && !course.isServed && event.isLive && (
                      <TouchableOpacity
                        style={[commonStyles.button, { alignSelf: 'flex-start' }]}
                        onPress={() => handleMarkCourseServed(course.id)}
                      >
                        <Text style={commonStyles.buttonText}>
                          Mark as Served
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        );

      case 'album':
        return (
          <PhotoGallery
            eventId={event.id}
            user={user}
            isOrganizer={isOrganizer}
            canUpload={event.participants.includes(user.id)}
          />
        );

      case 'qr':
        return (
          <View style={{ flex: 1 }}>
            <QRCodeGenerator
              value={event.qrCode}
              eventTitle={event.title}
              isOrganizer={isOrganizer}
            />
          </View>
        );

      case 'notifications':
        return (
          <View style={[commonStyles.centerContent, { paddingVertical: 40 }]}>
            <Icon name="bell" size={48} color={colors.textSecondary} />
            <Text style={[commonStyles.subtitle, { marginTop: 16, textAlign: 'center' }]}>
              Notifications
            </Text>
            <Text style={[commonStyles.caption, { textAlign: 'center', marginTop: 8 }]}>
              Event notifications will appear here
            </Text>
          </View>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[commonStyles.container, commonStyles.centerContent]}>
        <Icon name="loader" size={48} color={colors.primary} />
        <Text style={[commonStyles.subtitle, { marginTop: 16 }]}>
          Loading event...
        </Text>
      </SafeAreaView>
    );
  }

  if (!event || !user) {
    return (
      <SafeAreaView style={[commonStyles.container, commonStyles.centerContent]}>
        <Icon name="alert-circle" size={48} color={colors.error} />
        <Text style={[commonStyles.subtitle, { marginTop: 16, textAlign: 'center' }]}>
          Event not found
        </Text>
      </SafeAreaView>
    );
  }

  const isOrganizer = event.organizerId === user.id;
  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'menu', label: 'Menu', icon: 'utensils' },
    { key: 'album', label: 'Album', icon: 'image' },
    { key: 'qr', label: 'QR Code', icon: 'qr-code' },
    { key: 'notifications', label: 'Updates', icon: 'bell' },
  ];

  return (
    <SafeAreaView style={commonStyles.container}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            padding: 8,
            marginRight: 12,
            borderRadius: 8,
            backgroundColor: colors.surface,
          }}
        >
          <Icon name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        
        <View style={{ flex: 1 }}>
          <Text style={commonStyles.title} numberOfLines={1}>
            {event.title}
          </Text>
          <Text style={[commonStyles.caption, { color: colors.textSecondary }]}>
            {event.date.toLocaleDateString()} • {event.location}
          </Text>
        </View>

        {isOrganizer && (
          <TouchableOpacity
            style={[
              commonStyles.button,
              {
                backgroundColor: event.isLive ? colors.error : colors.success,
                paddingHorizontal: 16,
                paddingVertical: 8,
              }
            ]}
            onPress={handleToggleEventStatus}
          >
            <Text style={[commonStyles.buttonText, { fontSize: 14 }]}>
              {event.isLive ? 'Pause' : 'Go Live'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Status Indicator */}
      {event.isLive && (
        <View style={{
          backgroundColor: colors.success,
          paddingVertical: 8,
          paddingHorizontal: 20,
          alignItems: 'center',
        }}>
          <Text style={[commonStyles.caption, { color: colors.background, fontWeight: '600' }]}>
            🔴 Event is Live
          </Text>
        </View>
      )}

      {/* Tabs */}
      <View style={{
        flexDirection: 'row',
        backgroundColor: colors.surface,
        paddingHorizontal: 20,
        paddingVertical: 12,
      }}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 8,
              paddingHorizontal: 4,
              borderRadius: 8,
              backgroundColor: activeTab === tab.key ? colors.primary : 'transparent',
            }}
            onPress={() => setActiveTab(tab.key)}
          >
            <Icon
              name={tab.icon}
              size={20}
              color={activeTab === tab.key ? colors.background : colors.textSecondary}
            />
            <Text style={[
              commonStyles.caption,
              {
                marginTop: 4,
                color: activeTab === tab.key ? colors.background : colors.textSecondary,
                fontWeight: activeTab === tab.key ? '600' : '400',
              }
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <View style={{ flex: 1, padding: 20 }}>
        {renderTabContent()}
      </View>
    </SafeAreaView>
  );
}
