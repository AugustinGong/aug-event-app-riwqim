
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { useEvents } from '../hooks/useEvents';
import { commonStyles, colors, buttonStyles } from '../styles/commonStyles';
import Icon from '../components/Icon';
import i18n from '../config/i18n';
import { Redirect } from 'expo-router';
import { supabase, isSupabaseConfigured } from '../config/supabase';

// Lazy load the QR scanner to handle native module availability
const QRScanner = React.lazy(() => import('../components/QRScanner'));

export default function ScanQRScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { joinEventWithPassword } = useEvents();
  const [scanning, setScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Dynamically import the barcode scanner permissions
        const { BarCodeScanner } = await import('expo-barcode-scanner');
        const { status } = await BarCodeScanner.requestPermissionsAsync();
        setHasPermission(status === 'granted');
      } catch (error) {
        console.log('BarCodeScanner not available:', error);
        setHasPermission(false);
      }
    })();
  }, []);

  // Redirect to login if not authenticated
  if (!isLoading && !isAuthenticated) {
    console.log('User not authenticated, redirecting to login');
    return <Redirect href="/" />;
  }

  // Show loading if still checking authentication
  if (isLoading) {
    return (
      <SafeAreaView style={[commonStyles.container, commonStyles.centerContent]}>
        <Text style={[commonStyles.subtitle]}>
          {i18n.t('common.loading')}
        </Text>
      </SafeAreaView>
    );
  }

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    setScanning(false);
    
    try {
      console.log('Scanned QR code data:', data);
      
      let eventId = '';
      let password = '';
      
      // Handle new password-protected QR code format
      if (data.includes('aug-event://') && data.includes('||')) {
        const parts = data.split('://')[1];
        const [timestampPart, passwordPart] = parts.split('||');
        
        // For new events, we need to find the event by QR code since we don't store timestamp as ID
        // We'll search for the event by the full QR code
        eventId = 'qr_lookup'; // Special flag to indicate QR code lookup
        password = passwordPart;
        
        console.log('New format - Password:', password);
      } else if (data.includes('aug-event://')) {
        // Handle legacy format (without password)
        const parts = data.split('://')[1];
        eventId = parts.split('-')[0];
        console.log('Legacy format - Event ID:', eventId);
      } else if (data.includes('event/')) {
        eventId = data.split('event/')[1];
      } else if (data.includes('eventId=')) {
        eventId = data.split('eventId=')[1];
      } else {
        // Assume the entire data is the event ID
        eventId = data;
      }
      
      if (!user) {
        Alert.alert(i18n.t('common.error'), 'User not authenticated');
        return;
      }

      // Join the event with password verification
      try {
        let result;
        
        if (eventId === 'qr_lookup' && password) {
          // For new format, we need to find the event by QR code and verify password
          const qrResult = await joinEventWithQRCode(data, user.id);
          result = qrResult;
          eventId = qrResult.eventId; // Update eventId for navigation
        } else if (password) {
          // Direct event ID with password
          result = await joinEventWithPassword(eventId, password, user.id);
        } else {
          // Legacy format without password - this should show an error for new events
          Alert.alert(
            i18n.t('common.error'), 
            'This QR code format is not supported. Please ask the organizer to generate a new QR code.'
          );
          return;
        }
        
        Alert.alert(
          i18n.t('common.success'),
          result.message || 'Successfully joined the event!',
          [
            {
              text: i18n.t('common.ok'),
              onPress: () => {
                // Navigate to the event
                if (eventId && eventId !== 'qr_lookup') {
                  router.push(`/event/${eventId}`);
                } else {
                  // Fallback to home
                  router.push('/home');
                }
              },
            },
          ]
        );
      } catch (joinError: any) {
        console.log('Join error:', joinError);
        Alert.alert(i18n.t('common.error'), joinError.message || 'Failed to join event');
      }
    } catch (error: any) {
      console.log('QR scan error:', error);
      Alert.alert(i18n.t('common.error'), 'Failed to process QR code');
    }
  };

  // Helper function to join event by QR code lookup
  const joinEventWithQRCode = async (qrCode: string, userId: string) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured. Please set up your Supabase connection first.');
    }

    try {
      // Extract password from QR code
      const parts = qrCode.split('://')[1];
      const [, password] = parts.split('||');
      
      if (!password) {
        throw new Error('Invalid QR code format');
      }

      // Find event by QR code
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('id, title, access_password')
        .eq('qr_code', qrCode)
        .single();

      if (eventError) {
        console.log('Error finding event by QR code:', eventError);
        throw new Error('Event not found');
      }

      // Verify password
      if (eventData.access_password !== password) {
        throw new Error('Invalid access password');
      }

      // Check if user is already a participant
      const { data: existingParticipant, error: checkError } = await supabase
        .from('event_participants')
        .select('id')
        .eq('event_id', eventData.id)
        .eq('user_id', userId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.log('Error checking participant:', checkError);
        throw checkError;
      }

      if (existingParticipant) {
        return { success: true, message: 'Already joined this event', eventId: eventData.id };
      }

      // Add user as participant
      const { error: joinError } = await supabase
        .from('event_participants')
        .insert([{
          event_id: eventData.id,
          user_id: userId,
          role: 'guest',
        }]);

      if (joinError) {
        console.log('Error joining event:', joinError);
        throw joinError;
      }

      return { 
        success: true, 
        message: `Successfully joined "${eventData.title}"!`,
        eventId: eventData.id 
      };
    } catch (error: any) {
      console.log('Error joining event with QR code:', error);
      throw error;
    }
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={[commonStyles.container, commonStyles.centerContent]}>
        <Text style={commonStyles.subtitle}>Requesting camera permission...</Text>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
        <View style={[commonStyles.header, { paddingHorizontal: 20 }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Icon name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[commonStyles.title, { color: colors.primary }]}>
            {i18n.t('scanQR.title')}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={[commonStyles.centerContent, { flex: 1, paddingHorizontal: 20 }]}>
          <Icon name="camera-off" size={64} color={colors.textSecondary} />
          <Text style={[commonStyles.title, { marginTop: 20, textAlign: 'center' }]}>
            Camera Permission Required
          </Text>
          <Text style={[commonStyles.textSecondary, { textAlign: 'center', marginTop: 8 }]}>
            Please grant camera permission to scan QR codes
          </Text>
          
          <TouchableOpacity
            style={[buttonStyles.primary, { marginTop: 30 }]}
            onPress={() => router.back()}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      <View style={[commonStyles.header, { paddingHorizontal: 20 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[commonStyles.title, { color: colors.primary }]}>
          {i18n.t('scanQR.title')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {scanning ? (
        <React.Suspense fallback={
          <View style={[commonStyles.centerContent, { flex: 1 }]}>
            <Text style={commonStyles.subtitle}>Loading camera...</Text>
          </View>
        }>
          <QRScanner
            onBarCodeScanned={handleBarCodeScanned}
            onCancel={() => setScanning(false)}
          />
        </React.Suspense>
      ) : (
        <View style={[commonStyles.centerContent, { flex: 1, paddingHorizontal: 20 }]}>
          <Icon name="qr-code" size={120} color={colors.primary} />
          <Text style={[commonStyles.title, { marginTop: 30, textAlign: 'center' }]}>
            {i18n.t('scanQR.scanToJoin')}
          </Text>
          <Text style={[commonStyles.textSecondary, { textAlign: 'center', marginTop: 8, marginBottom: 40 }]}>
            {i18n.t('scanQR.scanDescription')}
          </Text>
          
          <TouchableOpacity
            style={[buttonStyles.primary, { width: '100%' }]}
            onPress={() => setScanning(true)}
          >
            <Icon name="camera" size={20} color="white" />
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600', marginLeft: 8 }}>
              {i18n.t('scanQR.startScanning')}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
