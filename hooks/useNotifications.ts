
import { useState, useEffect, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { supabase } from '../config/supabase';
import { Notification as AppNotification } from '../types';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

  // Register for push notifications
  const registerForPushNotifications = useCallback(async () => {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      });

      console.log('Expo push token:', token.data);
      setExpoPushToken(token.data);
      return token.data;
    } catch (error) {
      console.log('Error registering for push notifications:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    registerForPushNotifications();

    // Listen for notifications
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
    });

    return () => {
      if (notificationListener) {
        Notifications.removeNotificationSubscription(notificationListener);
      }
      if (responseListener) {
        Notifications.removeNotificationSubscription(responseListener);
      }
    };
  }, [registerForPushNotifications]);

  const loadNotifications = useCallback(async (eventId: string) => {
    try {
      setIsLoading(true);
      console.log('Loading notifications for event:', eventId);

      const { data: notificationsData, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('event_id', eventId)
        .order('sent_at', { ascending: false });

      if (error) {
        console.log('Error loading notifications:', error);
        throw error;
      }

      const formattedNotifications: AppNotification[] = (notificationsData || []).map(notif => ({
        id: notif.id,
        eventId: notif.event_id,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        data: notif.data,
        sentAt: new Date(notif.sent_at),
      }));

      setNotifications(formattedNotifications);
      console.log('Loaded notifications:', formattedNotifications.length);
    } catch (error: any) {
      console.log('Error in loadNotifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendNotification = async (
    eventId: string,
    type: AppNotification['type'],
    title: string,
    message: string,
    data?: any
  ) => {
    try {
      console.log('Sending notification:', title);

      // Save notification to database
      const { data: notificationData, error: dbError } = await supabase
        .from('notifications')
        .insert([{
          event_id: eventId,
          type,
          title,
          message,
          data,
        }])
        .select()
        .single();

      if (dbError) {
        console.log('Error saving notification to database:', dbError);
        throw dbError;
      }

      // Get event participants to send push notifications
      const { data: participants, error: participantsError } = await supabase
        .from('event_participants')
        .select('user_id, users(push_token)')
        .eq('event_id', eventId);

      if (participantsError) {
        console.log('Error getting participants:', participantsError);
        throw participantsError;
      }

      // Send push notifications to all participants
      const pushTokens = participants
        ?.map(p => p.users?.push_token)
        .filter(token => token) || [];

      if (pushTokens.length > 0) {
        // In a real app, you would send these to Expo's push notification service
        // For now, we'll just log them
        console.log('Would send push notifications to:', pushTokens.length, 'devices');
        
        // Send local notification for testing
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body: message,
            data,
          },
          trigger: null,
        });
      }

      // Add to local state
      const newNotification: AppNotification = {
        id: notificationData.id,
        eventId: notificationData.event_id,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        data: notificationData.data,
        sentAt: new Date(notificationData.sent_at),
      };

      setNotifications(prev => [newNotification, ...prev]);

      console.log('Notification sent successfully:', newNotification.id);
      return { success: true };
    } catch (error: any) {
      console.log('Error in sendNotification:', error);
      return { success: false, error: error.message || 'Failed to send notification' };
    }
  };

  const sendCourseNotification = async (eventId: string, courseName: string, courseType: string) => {
    const title = `${courseName} is ready!`;
    const message = `The ${courseType} course "${courseName}" is now being served.`;
    
    return await sendNotification(
      eventId,
      'course_ready',
      title,
      message,
      { courseType, courseName }
    );
  };

  return {
    notifications,
    isLoading,
    expoPushToken,
    loadNotifications,
    sendNotification,
    sendCourseNotification,
    registerForPushNotifications,
  };
};
