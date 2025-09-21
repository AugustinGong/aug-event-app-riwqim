
import React from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { useEvents } from '../hooks/useEvents';
import QRScanner from '../components/QRScanner';

export default function ScanQRScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { joinEvent } = useEvents();

  const handleScan = async (data: string) => {
    console.log('Scanned QR code:', data);
    
    if (!user) {
      Alert.alert('Error', 'You must be logged in to join an event');
      router.back();
      return;
    }

    // Extract event ID from QR code
    const eventId = data.split('/').pop();
    
    if (!eventId) {
      Alert.alert('Error', 'Invalid QR code');
      router.back();
      return;
    }

    try {
      const result = await joinEvent(eventId, user);
      
      if (result.success) {
        Alert.alert('Success', 'You have joined the event!', [
          { 
            text: 'View Event', 
            onPress: () => {
              router.back();
              router.push(`/event/${eventId}`);
            }
          },
          { 
            text: 'OK', 
            onPress: () => router.back()
          }
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to join event', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      }
    } catch (error) {
      console.log('Join event error:', error);
      Alert.alert('Error', 'Something went wrong', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    }
  };

  return (
    <QRScanner
      onScan={handleScan}
      onClose={() => router.back()}
    />
  );
}
