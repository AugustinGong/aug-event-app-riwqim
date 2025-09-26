
import * as Notifications from 'expo-notifications';
import { Notification as AppNotification } from '../types';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../config/supabase';
import { Platform, Alert } from 'react-native';
import i18n from '../config/i18n';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export const useNotifications = () => {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<any>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    registerForPushNotifications().then(token => {
      console.log('Push token:', token);
      setExpoPushToken(token);
    });

    // Listen for notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
    });

    return () => {
      // Clean up notification listeners using the correct .remove() method
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  const loadNotifications = useCallback(async (eventId: string) => {
    if (!isSupabaseConfigured) {
      console.log('Supabase not configured, using mock notifications');
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) {
        console.log('Error loading notifications:', error);
        return;
      }

      const formattedNotifications: AppNotification[] = (data || []).map((notification: any) => ({
        id: notification.id,
        eventId: notification.event_id,
        message: notification.message,
        type: notification.type,
        createdAt: new Date(notification.created_at),
      }));

      setNotifications(formattedNotifications);
    } catch (error: any) {
      console.log('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const sendNotification = async (eventId: string, message: string, type: string = 'course') => {
    if (!isSupabaseConfigured) {
      throw new Error(i18n.t('errors.supabaseNotConfigured'));
    }

    try {
      console.log('Sending notification for event:', eventId, message);

      // Save notification to database
      const { data, error } = await supabase
        .from('notifications')
        .insert([{
          event_id: eventId,
          message,
          type,
          created_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) {
        console.log('Error saving notification:', error);
        throw error;
      }

      // Try to send push notification (will fail in Expo Go)
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'AUG-Event',
            body: message,
            data: { eventId, type },
          },
          trigger: null, // Send immediately
        });
        console.log('Notification sent successfully');
      } catch (notificationError) {
        console.log('Push notification failed (expected in Expo Go):', notificationError);
        // Show alert about Expo Go limitation
        Alert.alert(
          i18n.t('errors.notificationNotSupported'),
          'Push notifications work in development builds but not in Expo Go. The notification has been saved to the database.',
          [{ text: i18n.t('common.close') }]
        );
      }
      
      // Reload notifications
      await loadNotifications(eventId);
      
      return data;
    } catch (error: any) {
      console.log('Error sending notification:', error);
      throw error;
    }
  };

  async function registerForPushNotifications() {
    let token;

    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      } catch (error) {
        console.log('Error setting notification channel:', error);
      }
    }

    try {
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

      token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('Expo push token:', token);
    } catch (error) {
      console.log('Error getting push token (expected in Expo Go):', error);
      return null;
    }

    return token;
  }

  return {
    expoPushToken,
    notification,
    notifications,
    loading,
    loadNotifications,
    sendNotification,
  };
};
