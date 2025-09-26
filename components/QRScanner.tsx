
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Platform } from 'react-native';
import { commonStyles, colors, buttonStyles } from '../styles/commonStyles';
import Icon from './Icon';
import i18n from '../config/i18n';

interface QRScannerProps {
  onBarCodeScanned: (data: { data: string }) => void;
  onCancel: () => void;
}

export default function QRScanner({ onBarCodeScanned, onCancel }: QRScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [BarCodeScanner, setBarCodeScanner] = useState<any>(null);

  useEffect(() => {
    const loadBarCodeScanner = async () => {
      try {
        // Dynamically import BarCodeScanner to handle potential missing native module
        const { BarCodeScanner: BCS } = await import('expo-barcode-scanner');
        setBarCodeScanner(BCS);
        
        const { status } = await BCS.requestPermissionsAsync();
        setHasPermission(status === 'granted');
      } catch (error) {
        console.log('BarCodeScanner not available:', error);
        setHasPermission(false);
        Alert.alert(
          i18n.t('errors.cameraNotSupported'),
          Platform.OS === 'web' 
            ? 'Camera scanning is not supported on web. Please use a mobile device.'
            : 'Camera scanning is not available on this device.',
          [{ text: i18n.t('common.close'), onPress: onCancel }]
        );
      }
    };

    loadBarCodeScanner();
  }, [onClose]);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    console.log('QR Code scanned:', data);
    
    if (data.includes('aug-event://')) {
      onBarCodeScanned({ data });
    } else {
      Alert.alert(
        i18n.t('qrScanner.invalidQRCode'), 
        i18n.t('qrScanner.invalidQRCodeMessage')
      );
      setScanned(false);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={[commonStyles.centerContent, { backgroundColor: colors.background }]}>
        <Text style={commonStyles.text}>{i18n.t('qrScanner.requestingPermission')}</Text>
      </View>
    );
  }

  if (hasPermission === false || !BarCodeScanner) {
    return (
      <View style={[commonStyles.centerContent, { backgroundColor: colors.background }]}>
        <Icon name="camera-off" size={64} color={colors.textSecondary} />
        <Text style={[commonStyles.title, { marginTop: 20 }]}>
          {i18n.t('qrScanner.cameraAccessRequired')}
        </Text>
        <Text style={[commonStyles.textSecondary, { textAlign: 'center', marginBottom: 20 }]}>
          {i18n.t('qrScanner.enableCameraAccess')}
        </Text>
        <TouchableOpacity style={buttonStyles.primary} onPress={onCancel}>
          <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
            {i18n.t('qrScanner.goBack')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={commonStyles.header}>
        <TouchableOpacity onPress={onCancel}>
          <Icon name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[commonStyles.subtitle, { margin: 0 }]}>
          {i18n.t('qrScanner.title')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={{ flex: 1 }}>
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
          style={{ flex: 1 }}
        />
        
        <View style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 250,
          height: 250,
          marginTop: -125,
          marginLeft: -125,
          borderWidth: 2,
          borderColor: colors.primary,
          borderRadius: 20,
          backgroundColor: 'transparent',
        }} />
        
        <View style={{
          position: 'absolute',
          bottom: 100,
          left: 0,
          right: 0,
          alignItems: 'center',
        }}>
          <Text style={[commonStyles.text, { color: 'white', textAlign: 'center', marginBottom: 20 }]}>
            {i18n.t('qrScanner.pointCamera')}
          </Text>
          
          {scanned && (
            <TouchableOpacity
              style={[buttonStyles.secondary, { backgroundColor: colors.primary }]}
              onPress={() => setScanned(false)}
            >
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                {i18n.t('qrScanner.scanAgain')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}
