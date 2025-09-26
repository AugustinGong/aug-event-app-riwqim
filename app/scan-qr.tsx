
import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRScanner from '../components/QRScanner';
import { useEvents } from '../hooks/useEvents';
import { useAuth } from '../hooks/useAuth';
import { commonStyles, colors } from '../styles/commonStyles';
import i18n from '../config/i18n';

export default function ScanQRScreen() {
  const router = useRouter();
  const { joinEvent } = useEvents();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleScan = async (data: string) => {
    if (loading) return;
    
    setLoading(true);
    try {
      // Extract event ID from QR code data
      const eventId = data.replace('aug-event://join/', '');
      
      if (!user) {
        Alert.alert(i18n.t('common.error'), 'User not authenticated');
        return;
      }

      await joinEvent(eventId, user.id);
      
      Alert.alert(
        i18n.t('common.success'),
        'Successfully joined the event!',
        [
          {
            text: i18n.t('common.close'),
            onPress: () => {
              router.back();
              router.push(`/event/${eventId}`);
            }
          }
        ]
      );
    } catch (error: any) {
      console.log('Error joining event:', error);
      Alert.alert(
        i18n.t('common.error'),
        error.message || i18n.t('errors.unknownError'),
        [{ text: i18n.t('common.close') }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    router.back();
  };

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      <QRScanner onScan={handleScan} onClose={handleClose} />
    </SafeAreaView>
  );
}
