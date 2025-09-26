
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Share, Alert, ActivityIndicator } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { commonStyles, colors, buttonStyles } from '../styles/commonStyles';
import { Event } from '../types';
import Icon from './Icon';
import { useEvents } from '../hooks/useEvents';
import i18n from '../config/i18n';

interface QRCodeGeneratorProps {
  event: Event;
  onEventUpdate?: (updatedEvent: Event) => void;
}

export default function QRCodeGenerator({ event, onEventUpdate }: QRCodeGeneratorProps) {
  const { regenerateEventPassword } = useEvents();
  const [isRegenerating, setIsRegenerating] = useState(false);
  const handleShare = async () => {
    try {
      const shareMessage = event.accessPassword 
        ? `Join my event "${event.title}" on AUG-Event! Scan the QR code or use password: ${event.accessPassword}`
        : `Join my event "${event.title}" on AUG-Event! Scan the QR code to join.`;
        
      await Share.share({
        message: shareMessage,
        title: `Join ${event.title}`,
      });
    } catch (error) {
      console.log('Error sharing:', error);
      Alert.alert('Error', 'Failed to share event');
    }
  };

  const handleRegeneratePassword = async () => {
    Alert.alert(
      'Regenerate Password',
      'This will create a new password and QR code. The old QR code will no longer work. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Regenerate',
          style: 'destructive',
          onPress: async () => {
            setIsRegenerating(true);
            try {
              const result = await regenerateEventPassword(event.id);
              if (result.success) {
                Alert.alert(
                  'Password Regenerated',
                  `New password: ${result.newPassword}\n\nThe QR code has been updated.`,
                  [{ text: 'OK' }]
                );
                
                // Update the event in parent component if callback provided
                if (onEventUpdate) {
                  const updatedEvent = { 
                    ...event, 
                    accessPassword: result.newPassword,
                    qrCode: `aug-event://${Date.now()}||${result.newPassword}`
                  };
                  onEventUpdate(updatedEvent);
                }
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to regenerate password');
            } finally {
              setIsRegenerating(false);
            }
          },
        },
      ]
    );
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
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
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
      
      {event.accessPassword && (
        <View style={[commonStyles.card, { backgroundColor: colors.lightBlue, marginBottom: 20 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Icon name="lock" size={16} color={colors.primary} />
            <Text style={[commonStyles.caption, { marginLeft: 8, color: colors.primary, fontWeight: '600' }]}>
              Access Password
            </Text>
          </View>
          <Text style={[commonStyles.title, { color: colors.primary, textAlign: 'center', letterSpacing: 2 }]}>
            {event.accessPassword}
          </Text>
          <Text style={[commonStyles.caption, { textAlign: 'center', marginTop: 8, color: colors.textSecondary }]}>
            Guests need this password to join via QR code
          </Text>
        </View>
      )}
      
      <Text style={[commonStyles.textSecondary, { textAlign: 'center', marginBottom: 20 }]}>
        Share this QR code with guests to let them join your event
      </Text>
      
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <TouchableOpacity 
          style={[buttonStyles.primary, { flex: 1 }]} 
          onPress={handleShare}
        >
          <View style={commonStyles.centerRow}>
            <Icon name="share" size={20} color="white" />
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600', marginLeft: 8 }}>
              Share
            </Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[buttonStyles.secondary, { flex: 1 }]} 
          onPress={handleRegeneratePassword}
          disabled={isRegenerating}
        >
          <View style={commonStyles.centerRow}>
            {isRegenerating ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Icon name="refresh-cw" size={20} color={colors.primary} />
            )}
            <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600', marginLeft: 8 }}>
              {isRegenerating ? 'Updating...' : 'New Code'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}
