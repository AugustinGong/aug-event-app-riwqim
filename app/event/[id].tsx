
import React, { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Event } from '../../types';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import Icon from '../../components/Icon';
import { useAuth } from '../../hooks/useAuth';
import { useEvents } from '../../hooks/useEvents';
import { useNotifications } from '../../hooks/useNotifications';
import { commonStyles, colors, buttonStyles } from '../../styles/commonStyles';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCodeGenerator from '../../components/QRCodeGenerator';
import PhotoGallery from '../../components/PhotoGallery';

type TabType = 'menu' | 'notifications' | 'album' | 'qr';

const EventDetailScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { events, updateEventStatus, markCourseServed, getEventById } = useEvents(user?.id);
  const { sendCourseNotification } = useNotifications();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('menu');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadEvent = async () => {
      if (!id) return;
      
      console.log('Loading event with ID:', id);
      
      // First try to find in local events
      const localEvent = events.find(e => e.id === id);
      if (localEvent) {
        setEvent(localEvent);
        setIsLoading(false);
        return;
      }
      
      // If not found locally, fetch from Firebase
      const fetchedEvent = await getEventById(id);
      if (fetchedEvent) {
        setEvent(fetchedEvent);
      } else {
        Alert.alert('Error', 'Event not found');
        router.back();
      }
      setIsLoading(false);
    };

    loadEvent();
  }, [id, events, getEventById, router]);

  if (isLoading || !event || !user) {
    return (
      <SafeAreaView style={[commonStyles.container, commonStyles.centered]}>
        <Text style={commonStyles.text}>Loading event...</Text>
      </SafeAreaView>
    );
  }

  const isOrganizer = event.organizerId === user.id;
  const isParticipant = event.participants.includes(user.id);

  if (!isParticipant && !isOrganizer) {
    return (
      <SafeAreaView style={[commonStyles.container, commonStyles.centered]}>
        <Text style={commonStyles.text}>You don&apos;t have access to this event</Text>
        <TouchableOpacity
          style={[commonStyles.button, { marginTop: 16 }]}
          onPress={() => router.back()}
        >
          <Text style={commonStyles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const handleToggleEventStatus = async () => {
    const newStatus = !event.isLive;
    const result = await updateEventStatus(event.id, newStatus);
    
    if (result.success) {
      setEvent(prev => prev ? { ...prev, isLive: newStatus } : null);
      
      if (newStatus) {
        Alert.alert('Success', 'Event is now live! Participants will be notified.');
      } else {
        Alert.alert('Success', 'Event has been paused.');
      }
    } else {
      Alert.alert('Error', result.error || 'Failed to update event status');
    }
  };

  const handleMarkCourseServed = async (courseId: string) => {
    const course = event.menu.find(c => c.id === courseId);
    if (!course) return;

    const result = await markCourseServed(event.id, courseId);
    
    if (result.success) {
      // Update local state
      setEvent(prev => {
        if (!prev) return null;
        return {
          ...prev,
          menu: prev.menu.map(c => 
            c.id === courseId ? { ...c, isServed: true } : c
          ),
        };
      });

      // Send notification to participants
      await sendCourseNotification(event.id, course.type, course.name);
      
      Alert.alert('Success', `${course.name} has been marked as served and participants have been notified!`);
    } else {
      Alert.alert('Error', result.error || 'Failed to update course');
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'menu':
        return (
          <ScrollView style={{ flex: 1, padding: 16 }}>
            <Text style={[commonStyles.title, { marginBottom: 16 }]}>Menu</Text>
            
            {event.menu.map((course) => (
              <View
                key={course.id}
                style={[
                  commonStyles.card,
                  {
                    marginBottom: 12,
                    backgroundColor: course.isServed ? colors.success + '20' : colors.surface,
                    borderLeftWidth: 4,
                    borderLeftColor: course.isServed ? colors.success : colors.primary,
                  }
                ]}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[commonStyles.subtitle, { textTransform: 'capitalize' }]}>
                      {course.type.replace('_', ' ')}
                    </Text>
                    <Text style={[commonStyles.text, { fontWeight: '600', marginTop: 4 }]}>
                      {course.name}
                    </Text>
                    {course.description && (
                      <Text style={[commonStyles.textSecondary, { marginTop: 4 }]}>
                        {course.description}
                      </Text>
                    )}
                  </View>
                  
                  {isOrganizer && event.isLive && !course.isServed && (
                    <TouchableOpacity
                      style={[
                        commonStyles.button,
                        { 
                          backgroundColor: colors.primary,
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          minWidth: 0,
                        }
                      ]}
                      onPress={() => handleMarkCourseServed(course.id)}
                    >
                      <Text style={[commonStyles.buttonText, { fontSize: 12 }]}>
                        Serve
                      </Text>
                    </TouchableOpacity>
                  )}
                  
                  {course.isServed && (
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
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
        );

      case 'album':
        return (
          <PhotoGallery
            eventId={event.id}
            user={user}
            isOrganizer={isOrganizer}
            canUpload={isParticipant || isOrganizer}
          />
        );

      case 'qr':
        return (
          <ScrollView style={{ flex: 1, padding: 16 }}>
            <Text style={[commonStyles.title, { marginBottom: 16, textAlign: 'center' }]}>
              Event QR Code
            </Text>
            <Text style={[commonStyles.textSecondary, { marginBottom: 24, textAlign: 'center' }]}>
              Share this QR code with guests to let them join the event
            </Text>
            
            <View style={[commonStyles.card, { alignItems: 'center', padding: 24 }]}>
              <QRCodeGenerator value={event.qrCode} size={200} />
              
              <Text style={[commonStyles.text, { marginTop: 16, textAlign: 'center' }]}>
                {event.title}
              </Text>
              <Text style={[commonStyles.textSecondary, { marginTop: 4, textAlign: 'center' }]}>
                {new Date(event.date).toLocaleDateString()}
              </Text>
            </View>
          </ScrollView>
        );

      default:
        return (
          <View style={[commonStyles.container, commonStyles.centered]}>
            <Text style={commonStyles.text}>Coming soon...</Text>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={commonStyles.container}>
      {/* Header */}
      <View style={[commonStyles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={[commonStyles.title, { fontSize: 18 }]} numberOfLines={1}>
            {event.title}
          </Text>
          <Text style={commonStyles.textSecondary}>
            {new Date(event.date).toLocaleDateString()} • {event.location}
          </Text>
        </View>

        {isOrganizer && (
          <TouchableOpacity
            style={[
              commonStyles.button,
              {
                backgroundColor: event.isLive ? colors.error : colors.success,
                paddingHorizontal: 12,
                paddingVertical: 6,
                minWidth: 0,
              }
            ]}
            onPress={handleToggleEventStatus}
          >
            <Text style={[commonStyles.buttonText, { fontSize: 12 }]}>
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
          alignItems: 'center',
        }}>
          <Text style={{ color: 'white', fontWeight: '600' }}>
            🔴 Event is Live
          </Text>
        </View>
      )}

      {/* Tabs */}
      <View style={{
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
        {[
          { key: 'menu', label: 'Menu', icon: 'list' },
          { key: 'album', label: 'Album', icon: 'image' },
          { key: 'qr', label: 'QR Code', icon: 'qr-code' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={{
              flex: 1,
              paddingVertical: 12,
              alignItems: 'center',
              borderBottomWidth: 2,
              borderBottomColor: activeTab === tab.key ? colors.primary : 'transparent',
            }}
            onPress={() => setActiveTab(tab.key as TabType)}
          >
            <Icon
              name={tab.icon}
              size={20}
              color={activeTab === tab.key ? colors.primary : colors.textSecondary}
            />
            <Text
              style={{
                marginTop: 4,
                fontSize: 12,
                color: activeTab === tab.key ? colors.primary : colors.textSecondary,
                fontWeight: activeTab === tab.key ? '600' : '400',
              }}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      {renderTabContent()}
    </SafeAreaView>
  );
};

export default EventDetailScreen;
