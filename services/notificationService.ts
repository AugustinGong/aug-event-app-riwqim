
import * as Notifications from 'expo-notifications';
import { supabase } from '../config/supabase';
import { Notification as AppNotification } from '../types';
import { Platform } from 'react-native';

export const sendEventNotification = async (
  eventId: string,
  type: AppNotification['type'],
  title: string,
  message: string,
  data?: any
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('Sending event notification:', title);

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
      // For now, we'll send a local notification for testing
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

    console.log('Notification sent successfully:', notificationData.id);
    return { success: true };
  } catch (error: any) {
    console.log('Error in sendEventNotification:', error);
    return { success: false, error: error.message || 'Failed to send notification' };
  }
};

export const getNotificationsForEvent = async (eventId: string): Promise<AppNotification[]> => {
  try {
    console.log('Getting notifications for event:', eventId);

    const { data: notificationsData, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('event_id', eventId)
      .order('sent_at', { ascending: false });

    if (error) {
      console.log('Error getting notifications:', error);
      throw error;
    }

    const notifications: AppNotification[] = (notificationsData || []).map(notif => ({
      id: notif.id,
      eventId: notif.event_id,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      data: notif.data,
      sentAt: new Date(notif.sent_at),
    }));

    console.log('Retrieved notifications:', notifications.length);
    return notifications;
  } catch (error: any) {
    console.log('Error in getNotificationsForEvent:', error);
    throw error;
  }
};

export const registerPushToken = async (userId: string, pushToken: string): Promise<void> => {
  try {
    console.log('Registering push token for user:', userId);

    const { error } = await supabase
      .from('users')
      .update({ push_token: pushToken })
      .eq('id', userId);

    if (error) {
      console.log('Error registering push token:', error);
      throw error;
    }

    console.log('Push token registered successfully');
  } catch (error: any) {
    console.log('Error in registerPushToken:', error);
    throw error;
  }
};
