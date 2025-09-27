
import { commonStyles, colors, buttonStyles } from '../../styles/commonStyles';
import { Event } from '../../types';
import i18n, { addLanguageChangeListener } from '../../config/i18n';
import Icon from '../../components/Icon';
import { useNotifications } from '../../hooks/useNotifications';
import { useRouter, useLocalSearchParams } from 'expo-router';
import LanguageSelector from '../../components/LanguageSelector';
import LocationDisplay from '../../components/LocationDisplay';
import { View, Text, TouchableOpacity, ScrollView, Alert, Share, Clipboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useCallback } from 'react';
import { useEvents } from '../../hooks/useEvents';
import { useAuth } from '../../hooks/useAuth';
import PhotoGallery from '../../components/PhotoGallery';
import { Redirect } from 'expo-router';

type TabType = 'details' | 'menu' | 'notifications' | 'album' | 'access';

export default function EventDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { getEventById, updateEventStatus, cancelEvent, deleteEvent, markCourseServed, regenerateEventPassword } = useEvents();
  const { sendCourseNotification } = useNotifications();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [forceUpdate, setForceUpdate] = useState(0);

  // Add language change listener for automatic UI updates
  useEffect(() => {
    const removeListener = addLanguageChangeListener(() => {
      console.log('Language changed in EventDetailScreen, forcing re-render');
      setForceUpdate(prev => prev + 1);
    });

    return removeListener;
  }, []);

  const loadEventData = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const eventData = await getEventById(id);
      setEvent(eventData);
    } catch (error: any) {
      console.log('Error loading event:', error);
      Alert.alert(i18n.t('common.error'), error.message || 'Failed to load event');
    } finally {
      setLoading(false);
    }
  }, [id, getEventById]);

  useEffect(() => {
    loadEventData();
  }, [loadEventData]);

  // Redirect to login if not authenticated
  if (!authLoading && !isAuthenticated) {
    console.log('User not authenticated, redirecting to login');
    return <Redirect href="/" />;
  }

  // Show loading if still checking authentication or loading event
  if (authLoading || loading) {
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
        <Text style={[commonStyles.subtitle, { color: colors.error }]}>
          {i18n.t('event.notFound')}
        </Text>
        <TouchableOpacity
          style={[buttonStyles.secondary, { marginTop: 20 }]}
          onPress={() => router.back()}
        >
          <Text style={{ color: colors.primary }}>
            {i18n.t('common.back')}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isOrganizer = user?.id === event.organizerId;
  const isCancelled = event.status === 'cancelled';

  const handleToggleEventStatus = async () => {
    try {
      const newStatus = event.isLive ? 'upcoming' : 'active';
      await updateEventStatus(event.id, newStatus);
      await loadEventData();
      Alert.alert(
        i18n.t('common.success'),
        `Event ${newStatus === 'active' ? 'started' : 'stopped'} successfully`
      );
    } catch (error: any) {
      console.log('Error toggling event status:', error);
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
              Alert.alert(i18n.t('common.success'), result.message);
              await loadEventData();
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
          text: i18n.t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteEvent(event.id);
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
      await sendCourseNotification(event.id, courseId);
      await loadEventData();
      Alert.alert(i18n.t('common.success'), 'Course marked as served and notification sent!');
    } catch (error: any) {
      console.log('Error marking course as served:', error);
      Alert.alert(i18n.t('common.error'), error.message || 'Failed to mark course as served');
    }
  };

  const handleShareEvent = async () => {
    try {
      const shareContent = {
        title: event.title,
        message: `Join "${event.title}" on ${event.date.toLocaleDateString()}!\n\nEvent ID: ${event.id}\nPassword: ${event.accessPassword}\n\nDownload AUG-Event app to join!`,
      };

      await Share.share(shareContent);
    } catch (error: any) {
      console.log('Error sharing event:', error);
    }
  };

  const handleCopyEventDetails = async () => {
    const eventDetails = `Event: ${event.title}\nID: ${event.id}\nPassword: ${event.accessPassword}`;
    await Clipboard.setStringAsync(eventDetails);
    Alert.alert(i18n.t('common.success'), 'Event details copied to clipboard!');
  };

  const handleRegeneratePassword = async () => {
    Alert.alert(
      i18n.t('event.regeneratePassword'),
      'This will generate a new password for the event. All current participants will need the new password to rejoin.',
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('event.regeneratePassword'),
          onPress: async () => {
            try {
              const result = await regenerateEventPassword(event.id);
              Alert.alert(
                i18n.t('common.success'),
                `New password generated: ${result.newPassword}`
              );
              await loadEventData();
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
    switch (status) {
      case 'active': return colors.success;
      case 'ended': return colors.textSecondary;
      case 'cancelled': return colors.error;
      default: return colors.primary;
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'details':
        return (
          <View style={{ padding: 20 }}>
            {/* Event Status */}
            {isCancelled && (
              <View style={[commonStyles.card, { backgroundColor: colors.error + '20', marginBottom: 20 }]}>
                <Text style={[commonStyles.subtitle, { color: colors.error, textAlign: 'center' }]}>
                  {i18n.t('event.eventCancelledStatus')}
                </Text>
              </View>
            )}

            {/* Event Info */}
            <View style={[commonStyles.card, { marginBottom: 20 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                <Icon 
                  name={getEventTypeIcon(event.eventType)} 
                  size={24} 
                  color={getEventTypeColor(event.eventType)} 
                />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={[commonStyles.title, { marginBottom: 4 }]}>
                    {event.title}
                  </Text>
                  <Text style={[commonStyles.textSecondary, { textTransform: 'capitalize' }]}>
                    {i18n.t(`eventTypes.${event.eventType}`)}
                  </Text>
                </View>
                <View style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 12,
                  backgroundColor: getStatusColor(event.status || 'upcoming') + '20',
                }}>
                  <Text style={{
                    color: getStatusColor(event.status || 'upcoming'),
                    fontSize: 12,
                    fontWeight: '600',
                    textTransform: 'capitalize',
                  }}>
                    {event.status || 'upcoming'}
                  </Text>
                </View>
              </View>

              {event.description && (
                <Text style={[commonStyles.text, { marginBottom: 15, lineHeight: 20 }]}>
                  {event.description}
                </Text>
              )}

              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Icon name="calendar" size={16} color={colors.textSecondary} />
                <Text style={[commonStyles.text, { marginLeft: 8 }]}>
                  {event.date.toLocaleDateString()} at {event.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Icon name="user" size={16} color={colors.textSecondary} />
                <Text style={[commonStyles.text, { marginLeft: 8 }]}>
                  Organized by {event.organizer.name}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="users" size={16} color={colors.textSecondary} />
                <Text style={[commonStyles.text, { marginLeft: 8 }]}>
                  {event.participants.length} participant{event.participants.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>

            {/* Location */}
            <LocationDisplay
              address={event.locationAddress || event.location}
              latitude={event.latitude}
              longitude={event.longitude}
            />

            {/* Organizer Actions */}
            {isOrganizer && !isCancelled && (
              <View style={[commonStyles.card, { marginBottom: 20 }]}>
                <Text style={[commonStyles.subtitle, { marginBottom: 15 }]}>
                  Organizer Actions
                </Text>
                
                <TouchableOpacity
                  style={[buttonStyles.primary, { marginBottom: 10 }]}
                  onPress={handleToggleEventStatus}
                >
                  <Icon 
                    name={event.isLive ? 'pause' : 'play'} 
                    size={16} 
                    color="white" 
                  />
                  <Text style={{ color: 'white', marginLeft: 8 }}>
                    {event.isLive ? 'Stop Event' : 'Start Event'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[buttonStyles.secondary, { marginBottom: 10 }]}
                  onPress={handleCancelEvent}
                >
                  <Icon name="x-circle" size={16} color={colors.error} />
                  <Text style={{ color: colors.error, marginLeft: 8 }}>
                    {i18n.t('event.cancelEvent')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[buttonStyles.secondary]}
                  onPress={handleDeleteEvent}
                >
                  <Icon name="trash-2" size={16} color={colors.error} />
                  <Text style={{ color: colors.error, marginLeft: 8 }}>
                    {i18n.t('event.deleteEvent')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );

      case 'menu':
        return (
          <View style={{ padding: 20 }}>
            {event.menu.length === 0 ? (
              <View style={[commonStyles.centerContent, { paddingVertical: 40 }]}>
                <Icon name="utensils" size={48} color={colors.textSecondary} />
                <Text style={[commonStyles.subtitle, { marginTop: 16, color: colors.textSecondary }]}>
                  {i18n.t('event.noMenu')}
                </Text>
              </View>
            ) : (
              event.menu.map((course, index) => (
                <View key={course.id} style={[commonStyles.card, { marginBottom: 15 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={[commonStyles.subtitle, { color: colors.primary, textTransform: 'capitalize' }]}>
                      {i18n.t(`event.courses.${course.type}`)}
                    </Text>
                    {course.isServed ? (
                      <View style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 12,
                        backgroundColor: colors.success + '20',
                      }}>
                        <Text style={{ color: colors.success, fontSize: 12, fontWeight: '600' }}>
                          {i18n.t('event.served')}
                        </Text>
                      </View>
                    ) : isOrganizer && !isCancelled ? (
                      <TouchableOpacity
                        style={[buttonStyles.secondary, { paddingHorizontal: 12, paddingVertical: 6 }]}
                        onPress={() => handleMarkCourseServed(course.id)}
                      >
                        <Text style={{ color: colors.primary, fontSize: 12 }}>
                          {i18n.t('event.markServed')}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  
                  <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: 8 }]}>
                    {course.name}
                  </Text>
                  
                  {course.description && (
                    <Text style={[commonStyles.textSecondary, { lineHeight: 18 }]}>
                      {course.description}
                    </Text>
                  )}
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
            canUpload={!isCancelled}
          />
        );

      case 'access':
        return (
          <View style={{ padding: 20 }}>
            <Text style={[commonStyles.sectionTitle, { marginBottom: 20 }]}>
              {i18n.t('event.accessDetails')}
            </Text>

            <View style={[commonStyles.card, { marginBottom: 20 }]}>
              <Text style={[commonStyles.label, { marginBottom: 8 }]}>
                Event ID
              </Text>
              <Text style={[commonStyles.text, { fontFamily: 'monospace', marginBottom: 15 }]}>
                {event.id}
              </Text>

              <Text style={[commonStyles.label, { marginBottom: 8 }]}>
                {i18n.t('event.eventPassword')}
              </Text>
              <Text style={[commonStyles.text, { fontFamily: 'monospace', marginBottom: 15 }]}>
                {event.accessPassword}
              </Text>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  style={[buttonStyles.secondary, { flex: 1 }]}
                  onPress={handleCopyEventDetails}
                >
                  <Icon name="copy" size={16} color={colors.primary} />
                  <Text style={{ color: colors.primary, marginLeft: 8 }}>
                    {i18n.t('common.copy')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[buttonStyles.secondary, { flex: 1 }]}
                  onPress={handleShareEvent}
                >
                  <Icon name="share" size={16} color={colors.primary} />
                  <Text style={{ color: colors.primary, marginLeft: 8 }}>
                    {i18n.t('common.share')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {isOrganizer && !isCancelled && (
              <TouchableOpacity
                style={[buttonStyles.secondary]}
                onPress={handleRegeneratePassword}
              >
                <Icon name="refresh-cw" size={16} color={colors.primary} />
                <Text style={{ color: colors.primary, marginLeft: 8 }}>
                  {i18n.t('event.regeneratePassword')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[commonStyles.header, { paddingHorizontal: 20 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[commonStyles.title, { color: colors.primary, flex: 1, textAlign: 'center' }]}>
          {event.title}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tab Navigation */}
      <View style={{
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { key: 'details', label: i18n.t('event.details'), icon: 'info' },
            { key: 'menu', label: i18n.t('event.menu'), icon: 'utensils' },
            { key: 'album', label: i18n.t('event.album'), icon: 'image' },
            { key: 'access', label: i18n.t('event.access'), icon: 'key' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 8,
                marginRight: 10,
                borderRadius: 20,
                backgroundColor: activeTab === tab.key ? colors.primary + '20' : 'transparent',
              }}
              onPress={() => setActiveTab(tab.key as TabType)}
            >
              <Icon 
                name={tab.icon} 
                size={16} 
                color={activeTab === tab.key ? colors.primary : colors.textSecondary} 
              />
              <Text style={{
                marginLeft: 6,
                fontSize: 14,
                color: activeTab === tab.key ? colors.primary : colors.textSecondary,
                fontWeight: activeTab === tab.key ? '600' : '400',
              }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tab Content */}
      <ScrollView style={{ flex: 1 }}>
        {renderTabContent()}
      </ScrollView>

      {/* Floating Language Selector Bubble */}
      <View style={{
        position: 'absolute',
        bottom: 20,
        right: 20,
        zIndex: 1000,
      }}>
        <LanguageSelector isFloating={true} />
      </View>
    </SafeAreaView>
  );
}
