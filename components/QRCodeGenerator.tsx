
import React from 'react';
import { View, Text, TouchableOpacity, Share, Alert } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { commonStyles, colors, buttonStyles } from '../styles/commonStyles';
import { Event } from '../types';
import Icon from './Icon';

interface QRCodeGeneratorProps {
  event: Event;
}

export default function QRCodeGenerator({ event }: QRCodeGeneratorProps) {
  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join my event "${event.title}" on AUG-Event! Use this link: ${event.qrCode}`,
        title: `Join ${event.title}`,
      });
    } catch (error) {
      console.log('Error sharing:', error);
      Alert.alert('Error', 'Failed to share event');
    }
  };

  return (
    <View style={commonStyles.card}>
      <Text style={[commonStyles.subtitle, { textAlign: 'center', marginBottom: 20 }]}>
        Event QR Code
      </Text>
      
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <View style={{
          backgroundColor: 'white',
          padding: 20,
          borderRadius: 16,
          boxShadow: `0px 4px 12px ${colors.shadow}`,
          elevation: 4,
        }}>
          <QRCode
            value={event.qrCode}
            size={200}
            backgroundColor="white"
            color={colors.primary}
          />
        </View>
      </View>
      
      <Text style={[commonStyles.textSecondary, { textAlign: 'center', marginBottom: 20 }]}>
        Share this QR code with guests to let them join your event
      </Text>
      
      <TouchableOpacity style={buttonStyles.secondary} onPress={handleShare}>
        <View style={commonStyles.centerRow}>
          <Icon name="share" size={20} color="white" />
          <Text style={{ color: 'white', fontSize: 16, fontWeight: '600', marginLeft: 8 }}>
            Share Event
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}
