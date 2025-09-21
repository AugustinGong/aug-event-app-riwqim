
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { commonStyles, colors, buttonStyles } from '../styles/commonStyles';
import Icon from './Icon';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    const getBarCodeScannerPermissions = async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getBarCodeScannerPermissions();
  }, []);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    console.log('QR Code scanned:', data);
    
    if (data.includes('aug-event://join/')) {
      onScan(data);
    } else {
      Alert.alert('Invalid QR Code', 'This is not a valid AUG-Event QR code');
      setScanned(false);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={[commonStyles.centerContent, { backgroundColor: colors.background }]}>
        <Text style={commonStyles.text}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={[commonStyles.centerContent, { backgroundColor: colors.background }]}>
        <Icon name="camera-off" size={64} color={colors.textSecondary} />
        <Text style={[commonStyles.title, { marginTop: 20 }]}>Camera Access Required</Text>
        <Text style={[commonStyles.textSecondary, { textAlign: 'center', marginBottom: 20 }]}>
          Please enable camera access to scan QR codes
        </Text>
        <TouchableOpacity style={buttonStyles.primary} onPress={onClose}>
          <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={commonStyles.header}>
        <TouchableOpacity onPress={onClose}>
          <Icon name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[commonStyles.subtitle, { margin: 0 }]}>Scan QR Code</Text>
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
            Point your camera at the QR code to join the event
          </Text>
          
          {scanned && (
            <TouchableOpacity
              style={[buttonStyles.secondary, { backgroundColor: colors.primary }]}
              onPress={() => setScanned(false)}
            >
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                Scan Again
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}
