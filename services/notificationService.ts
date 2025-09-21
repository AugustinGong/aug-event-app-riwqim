
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { collection, addDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Notification as AppNotification } from '../types';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export class NotificationService {
  // Register device for push notifications
  static async registerForPushNotifications(): Promise<string | null> {
    try {
      console.log('Registering for push notifications');
      
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
      
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('Push notification token:', token);
      
      return token;
    } catch (error) {
      console.log('Error registering for push notifications:', error);
      return null;
    }
  }

  // Send notification to event participants
  static async sendEventNotification(
    eventId: string,
    title: string,
    message: string,
    type: 'course_ready' | 'event_update' | 'photo_uploaded',
    data?: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Sending notification for event:', eventId);
      
      // Save notification to Firestore
      const notificationData = {
        eventId,
        type,
        title,
        message,
        data: data || {},
        sentAt: new Date(),
      };
      
      await addDoc(collection(db, 'notifications'), notificationData);
      
      // In a real implementation, you would:
      // 1. Get all participant push tokens from Firestore
      // 2. Send push notifications using Expo's push service
      // 3. Handle delivery receipts and errors
      
      // For now, we'll use local notifications as a fallback
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body: message,
          data: { eventId, type, ...data },
        },
        trigger: null, // Send immediately
      });
      
      console.log('Notification sent successfully');
      return { success: true };
    } catch (error) {
      console.log('Error sending notification:', error);
      return { success: false, error: 'Failed to send notification' };
    }
  }

  // Get notifications for an event
  static async getEventNotifications(eventId: string): Promise<AppNotification[]> {
    try {
      console.log('Getting notifications for event:', eventId);
      
      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef,
        where('eventId', '==', eventId),
        orderBy('sentAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const notifications: AppNotification[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        notifications.push({
          id: doc.id,
          eventId: data.eventId,
          type: data.type,
          title: data.title,
          message: data.message,
          data: data.data,
          sentAt: data.sentAt.toDate(),
        });
      });
      
      console.log('Retrieved notifications:', notifications.length);
      return notifications;
    } catch (error) {
      console.log('Error getting event notifications:', error);
      return [];
    }
  }

  // Send course notification (quick buttons for organizers)
  static async sendCourseNotification(
    eventId: string,
    courseType: string,
    courseName: string
  ): Promise<{ success: boolean; error?: string }> {
    const title = `${courseName} is ready!`;
    const message = `The ${courseType.toLowerCase()} course "${courseName}" is now being served.`;
    
    return this.sendEventNotification(
      eventId,
      title,
      message,
      'course_ready',
      { courseType, courseName }
    );
  }

  // Listen for notification responses
  static addNotificationResponseListener(
    listener: (response: Notifications.NotificationResponse) => void
  ) {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }

  // Listen for received notifications
  static addNotificationReceivedListener(
    listener: (notification: Notifications.Notification) => void
  ) {
    return Notifications.addNotificationReceivedListener(listener);
  }
}
