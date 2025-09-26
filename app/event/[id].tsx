
import { Redirect } from 'expo-router';
import { View, Text, TouchableOpacity, ScrollView, Alert, Share, Clipboard } from 'react-native';
import { useEvents } from '../../hooks/useEvents';
import { useNotifications } from '../../hooks/useNotifications';
import Icon from '../../components/Icon';
import { commonStyles, colors, buttonStyles } from '../../styles/commonStyles';
import { Event } from '../../types';
import PhotoGallery from '../../components/PhotoGallery';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import i18n, { addLanguageChangeListener } from '../../config/i18n';
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import LanguageSelector from '../../components/LanguageSelector';

type TabType = 'menu' | 'notifications' | 'album' | 'access';

export default function EventDetailScreen() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { getEventById, updateEventStatus, markCourseServed, regenerateEventPassword, cancelEvent, deleteEvent } = useEvents();
  const { sendNotification } = useNotifications();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Initialize all state hooks at the top level
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('menu');
  const [forceUpdate, setForceUpdate] = useState(0);

  // Add language change listener for automatic UI updates
  useEffect(() => {
    const removeListener = addLanguageChangeListener(() => {
      console.log('Language changed in EventDetailScreen, forcing re-render');
      setForceUpdate(prev => prev + 1);
    });

    return removeListener;
  }, []);

  // Move all hooks to the top level, before any conditional logic
  const loadEventData = useCallback(async () => {
    if (!id || !isAuthenticated) return;
    
    try {
      console.log('Loading event data for ID:', id);
      const eventData = await getEventById(id);
      console.log('Loaded event data:', eventData);
      setEvent(eventData);
    } catch (error: any) {
      console.log('Error loading event:', error);
      Alert.alert(i18n.t('common.error'), error.message || 'Failed to load event');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, getEventById, isAuthenticated, router]);

  useEffect(() => {
    loadEventData();
  }, [loadEventData]);

  // Redirect to login if not authenticated
  if (!isLoading && !isAuthenticated) {
    console.log('User not authenticated, redirecting to login');
    return <Redirect href="/" />;
  }

  // Show loading if still checking authentication or loading event
  if (isLoading || loading) {
    return (
      <SafeAreaView style={[commonStyles.container, commonStyles.centerContent]}>
        <Text style={[commonStyles.subtitle]}>
          {i18n.t('common.loading')}
        </Text>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={[commonStyles.container, commonStyles.centerContent]}>
        <Text style={[commonStyles.subtitle]}>
          {i18n.t('event.notFound')}
        </Text>
      </SafeAreaView>
    );
  }

  const isOrganizer = user?.id === event.organizerId;
  const canUpload = true; // All participants can upload photos
  const isCancelled = event.status === 'cancelled';

  const handleToggleEventStatus = async () => {
    try {
      const newStatus = event.status === 'upcoming' ? 'active' : 'upcoming';
      await updateEventStatus(event.id, newStatus);
      await loadEventData(); // Reload event data
    } catch (error: any) {
      console.log('Error updating event status:', error);
      Alert.alert(i18n.t('common.error'), error.message || 'Failed to update event status');
    }
  };

  const handleCancelEvent = async () => {
    Alert.alert(
      i18n.t('event.cancelEvent'),
      i18n.t('event.confirmCancelEvent'),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('event.cancelEvent'),
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await cancelEvent(event.id);
              if (result.success) {
                Alert.alert(
                  i18n.t('common.success'),
                  i18n.t('event.eventCancelled')
                );
                await loadEventData(); // Reload event data
              }
            } catch (error: any) {
              console.log('Error cancelling event:', error);
              Alert.alert(i18n.t('common.error'), error.message || 'Failed to cancel event');
            }
          },
        },
      ]
    );
  };

  const handleDeleteEvent = async () => {
    Alert.alert(
      i18n.t('event.deleteEvent'),
      i18n.t('event.confirmDeleteEvent'),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('event.deleteEvent'),
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteEvent(event.id);
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
              console.log('Error deleting event:', error);
              Alert.alert(i18n.t('common.error'), error.message || 'Failed to delete event');
            }
          },
        },
      ]
    );
  };

  const handleMarkCourseServed = async (courseId: string) => {
    try {
      await markCourseServed(courseId);
      await loadEventData(); // Reload event data
      
      // Send notification to all participants
      const course = event.menu.find(c => c.id === courseId);
      if (course) {
        await sendNotification(event.id, {
          type: 'course_ready',
          title: `${course.name} is ready!`,
          message: `The ${course.type} course "${course.name}" is now being served.`,
        });
      }
    } catch (error: any) {
      console.log('Error marking course as served:', error);
      Alert.alert(i18n.t('common.error'), error.message || 'Failed to mark course as served');
    }
  };

  const handleShareEvent = async () => {
    try {
      const shareMessage = `Join my event "${event.title}"!\n\nEvent ID: ${event.id}\nPassword: ${event.accessPassword}\n\nDate: ${event.date.toLocaleDateString()}\nLocation: ${event.location}`;
      
      await Share.share({
        message: shareMessage,
        title: `Join ${event.title}`,
      });
    } catch (error: any) {
      console.log('Error sharing event:', error);
    }
  };

  const handleCopyEventDetails = async () => {
    const eventDetails = `Event ID: ${event.id}\nPassword: ${event.accessPassword}`;
    await Clipboard.setStringAsync(eventDetails);
    Alert.alert(i18n.t('common.success'), 'Event details copied to clipboard!');
  };

  const handleRegeneratePassword = async () => {
    Alert.alert(
      'Regenerate Password',
      'Are you sure you want to generate a new password? The old password will no longer work.',
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: 'Regenerate',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await regenerateEventPassword(event.id);
              if (result.success) {
                Alert.alert(
                  i18n.t('common.success'),
                  `New password generated: ${result.newPassword}`
                );
                await loadEventData(); // Reload event data
              }
            } catch (error: any) {
              console.log('Error regenerating password:', error);
              Alert.alert(i18n.t('common.error'), error.message || 'Failed to regenerate password');
            }
          },
        },
      ]
    );
  };

  const getEventTypeIcon = (eventType: string) => {
    const iconMap: { [key: string]: string } = {
      wedding: 'heart',
      birthday: 'gift',
      celebration: 'star',
      anniversary: 'calendar',
      graduation: 'award',
      corporate: 'briefcase',
      party: 'music',
      other: 'more-horizontal',
    };
    return iconMap[eventType] || 'star';
  };

  const getEventTypeColor = (eventType: string) => {
    const colorMap: { [key: string]: string } = {
      wedding: '#FF69B4',
      birthday: '#FFD700',
      celebration: '#8B5CF6',
      anniversary: '#FF6B6B',
      graduation: '#4ECDC4',
      corporate: '#45B7D1',
      party: '#96CEB4',
      other: '#95A5A6',
    };
    return colorMap[eventType] || '#8B5CF6';
  };

  const getStatusColor = (status: string) => {
    const colorMap: { [key: string]: string } = {
      upcoming: colors.primary,
      active: colors.success,
      ended: colors.textSecondary,
      cancelled: colors.error,
    };
    return colorMap[status] || colors.textSecondary;
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'menu':
        return (
          <View style={{ padding: 20 }}>
            {isCancelled && (
              <View style={[commonStyles.card, { backgroundColor: colors.errorLight, marginBottom: 20 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Icon name="close-circle" size={20} color={colors.error} />
                  <Text style={[commonStyles.text, { color: colors.error, marginLeft: 10, fontWeight: '600' }]}>
                    {i18n.t('event.eventCancelledStatus')}
                  </Text>
                </View>
              </View>
            )}
            
            {event.menu.length === 0 ? (
              <View style={[commonStyles.centerContent, { marginTop: 50 }]}>
                <Icon name="utensils" size={64} color={colors.textSecondary} />
                <Text style={[commonStyles.title, { marginTop: 20, textAlign: 'center' }]}>
                  {i18n.t('event.noMenu')}
                </Text>
              </View>
            ) : (
              event.menu.map((course) => (
                <View key={course.id} style={[commonStyles.card, { marginBottom: 15 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[commonStyles.subtitle, { color: colors.primary }]}>
                        {course.name}
                      </Text>
                      <Text style={[commonStyles.textSecondary, { fontSize: 12, textTransform: 'capitalize' }]}>
                        {course.type}
                      </Text>
                      {course.description && (
                        <Text style={[commonStyles.text, { marginTop: 5 }]}>
                          {course.description}
                        </Text>
                      )}
                    </View>
                    {isOrganizer && !isCancelled && (
                      <TouchableOpacity
                        style={[
                          buttonStyles.secondary,
                          { 
                            paddingHorizontal: 12, 
                            paddingVertical: 8,
                            backgroundColor: course.isServed ? colors.success + '20' : colors.primaryLight,
                          }
                        ]}
                        onPress={() => !course.isServed && handleMarkCourseServed(course.id)}
                        disabled={course.isServed}
                      >
                        <Text style={{ 
                          color: course.isServed ? colors.success : colors.primary, 
                          fontSize: 12, 
                          fontWeight: '600' 
                        }}>
                          {course.isServed ? i18n.t('event.served') : i18n.t('event.markServed')}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        );

      case 'album':
        return (
          <PhotoGallery
            eventId={event.id}
            user={user!}
            isOrganizer={isOrganizer}
            canUpload={canUpload && !isCancelled}
          />
        );

      case 'access':
        return (
          <View style={{ padding: 20 }}>
            <View style={[commonStyles.card, { marginBottom: 20 }]}>
              <Text style={[commonStyles.sectionTitle, { marginBottom: 20 }]}>
                {i18n.t('event.accessDetails')}
              </Text>
              
              <View style={{ marginBottom: 20 }}>
                <Text style={[commonStyles.label, { marginBottom: 8 }]}>
                  Event ID
                </Text>
                <View style={[commonStyles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                  <Text style={{ color: colors.text, fontFamily: 'monospace' }}>
                    {event.id}
                  </Text>
                </View>
              </View>

              <View style={{ marginBottom: 20 }}>
                <Text style={[commonStyles.label, { marginBottom: 8 }]}>
                  Access Password
                </Text>
                <View style={[commonStyles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                  <Text style={{ color: colors.text, fontFamily: 'monospace', fontSize: 18, fontWeight: 'bold' }}>
                    {event.accessPassword}
                  </Text>
                </View>
              </View>

              {!isCancelled && (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    style={[buttonStyles.secondary, { flex: 1 }]}
                    onPress={handleCopyEventDetails}
                  >
                    <Icon name="copy" size={16} color={colors.primary} />
                    <Text style={{ color: colors.primary, marginLeft: 8, fontSize: 14 }}>
                      Copy Details
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[buttonStyles.secondary, { flex: 1 }]}
                    onPress={handleShareEvent}
                  >
                    <Icon name="share" size={16} color={colors.primary} />
                    <Text style={{ color: colors.primary, marginLeft: 8, fontSize: 14 }}>
                      Share Event
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {isOrganizer && (
              <View style={[commonStyles.card, { backgroundColor: colors.warningLight }]}>
                <Text style={[commonStyles.subtitle, { color: colors.warning, marginBottom: 10 }]}>
                  Organizer Actions
                </Text>
                <Text style={[commonStyles.textSecondary, { marginBottom: 15, fontSize: 12 }]}>
                  {isCancelled 
                    ? 'This event has been cancelled.' 
                    : 'Manage your event settings and access controls.'
                  }
                </Text>
                
                {!isCancelled && (
                  <>
                    <TouchableOpacity
                      style={[buttonStyles.secondary, { borderColor: colors.warning, marginBottom: 10 }]}
                      onPress={handleRegeneratePassword}
                    >
                      <Icon name="refresh-cw" size={16} color={colors.warning} />
                      <Text style={{ color: colors.warning, marginLeft: 8, fontSize: 14 }}>
                        Regenerate Password
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[buttonStyles.secondary, { borderColor: colors.error, marginBottom: 10 }]}
                      onPress={handleCancelEvent}
                    >
                      <Icon name="close-circle" size={16} color={colors.error} />
                      <Text style={{ color: colors.error, marginLeft: 8, fontSize: 14 }}>
                        {i18n.t('event.cancelEvent')}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      <View style={[commonStyles.header, { paddingHorizontal: 20 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[commonStyles.title, { color: colors.primary, flex: 1, textAlign: 'center' }]} numberOfLines={1}>
          {event.title}
        </Text>
        {/* Delete Button in Header - Only visible to organizers */}
        {isOrganizer ? (
          <TouchableOpacity
            onPress={handleDeleteEvent}
            style={{
              padding: 8,
              borderRadius: 8,
              backgroundColor: colors.errorLight,
            }}
          >
            <Icon name="trash-2" size={20} color={colors.error} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      {/* Event Header */}
      <View style={[commonStyles.card, { margin: 20, marginBottom: 10 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
          <View style={{
            width: 50,
            height: 50,
            borderRadius: 25,
            backgroundColor: getEventTypeColor(event.eventType) + '20',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 15,
          }}>
            <Icon name={getEventTypeIcon(event.eventType)} size={24} color={getEventTypeColor(event.eventType)} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[commonStyles.title, { marginBottom: 5 }]}>
              {event.title}
            </Text>
            <Text style={[commonStyles.textSecondary, { fontSize: 12, textTransform: 'capitalize', color: getStatusColor(event.status) }]}>
              {event.eventType} • {event.status}
            </Text>
          </View>
          {isOrganizer && !isCancelled && (
            <TouchableOpacity
              style={[
                buttonStyles.secondary,
                { 
                  paddingHorizontal: 12, 
                  paddingVertical: 6,
                  backgroundColor: event.status === 'active' ? colors.success + '20' : colors.primaryLight,
                }
              ]}
              onPress={handleToggleEventStatus}
            >
              <Text style={{ 
                color: event.status === 'active' ? colors.success : colors.primary, 
                fontSize: 12, 
                fontWeight: '600' 
              }}>
                {event.status === 'active' ? 'End Event' : 'Start Event'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Icon name="calendar" size={16} color={colors.textSecondary} />
          <Text style={[commonStyles.textSecondary, { marginLeft: 8 }]}>
            {event.date.toLocaleDateString()} at {event.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Icon name="map-pin" size={16} color={colors.textSecondary} />
          <Text style={[commonStyles.textSecondary, { marginLeft: 8 }]}>
            {event.location}
          </Text>
        </View>

        {event.description && (
          <Text style={[commonStyles.text, { marginTop: 15 }]}>
            {event.description}
          </Text>
        )}
      </View>

      {/* Tab Navigation */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 20, marginBottom: 10 }}>
        {[
          { key: 'menu' as TabType, label: i18n.t('event.menu'), icon: 'utensils' },
          { key: 'album' as TabType, label: i18n.t('event.album'), icon: 'image' },
          { key: 'access' as TabType, label: i18n.t('event.access'), icon: 'key' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              {
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 12,
                marginHorizontal: 4,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              },
              activeTab === tab.key
                ? { backgroundColor: colors.primary }
                : { backgroundColor: colors.cardBackground }
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Icon 
              name={tab.icon} 
              size={16} 
              color={activeTab === tab.key ? 'white' : colors.textSecondary} 
            />
            <Text style={[
              { marginLeft: 8, fontSize: 14, fontWeight: '500' },
              activeTab === tab.key 
                ? { color: 'white' }
                : { color: colors.textSecondary }
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <View style={{ flex: 1 }}>
        {renderTabContent()}
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
    </SafeAreaView>
  );
}
