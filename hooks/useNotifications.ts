
import { useState, useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { NotificationService } from '../services/notificationService';

export const useNotifications = () => {
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [pushToken, setPushToken] = useState<string | null>(null);

  useEffect(() => {
    // Register for push notifications
    NotificationService.registerForPushNotifications().then(token => {
      console.log('Push token received:', token);
      setPushToken(token);
    });

    // Listen for received notifications
    const notificationListener = NotificationService.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      setNotification(notification);
    });

    // Listen for notification responses (when user taps notification)
    const responseListener = NotificationService.addNotificationResponseListener(response => {
      console.log('Notification response:', response);
      
      // Handle navigation based on notification data
      const data = response.notification.request.content.data;
      if (data?.eventId) {
        // Navigate to event screen
        console.log('Navigate to event:', data.eventId);
      }
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  const sendEventNotification = async (
    eventId: string,
    title: string,
    message: string,
    type: 'course_ready' | 'event_update' | 'photo_uploaded',
    data?: any
  ) => {
    return NotificationService.sendEventNotification(eventId, title, message, type, data);
  };

  const sendCourseNotification = async (
    eventId: string,
    courseType: string,
    courseName: string
  ) => {
    return NotificationService.sendCourseNotification(eventId, courseType, courseName);
  };

  return {
    notification,
    pushToken,
    sendEventNotification,
    sendCourseNotification,
  };
};
