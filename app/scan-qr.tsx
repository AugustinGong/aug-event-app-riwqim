
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

// Lazy load the QR scanner to handle native module availability
const QRScanner = React.lazy(() => import('../components/QRScanner'));

export default function ScanQRScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { joinEvent } = useEvents();
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
      // Extract event ID from QR code data
      let eventId = data;
      
      // Handle different QR code formats
      if (data.includes('aug-event://')) {
        // Extract the event ID from the QR code
        const parts = data.split('://')[1];
        eventId = parts.split('-')[0]; // Get the timestamp part as event ID
      } else if (data.includes('event/')) {
        eventId = data.split('event/')[1];
      } else if (data.includes('eventId=')) {
        eventId = data.split('eventId=')[1];
      }
      
      console.log('Scanned event ID:', eventId);
      
      if (!eventId || !user) {
        Alert.alert(i18n.t('common.error'), 'Invalid QR code or user not authenticated');
        return;
      }

      // Join the event
      try {
        await joinEvent(eventId, user.id);
        
        Alert.alert(
          i18n.t('common.success'),
          'Successfully joined the event!',
          [
            {
              text: i18n.t('common.ok'),
              onPress: () => router.push(`/event/${eventId}`),
            },
          ]
        );
      } catch (joinError: any) {
        Alert.alert(i18n.t('common.error'), joinError.message || 'Failed to join event');
      }
    } catch (error: any) {
      console.log('QR scan error:', error);
      Alert.alert(i18n.t('common.error'), 'Failed to process QR code');
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
