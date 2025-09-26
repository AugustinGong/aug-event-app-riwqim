
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/commonStyles';
import { View, StyleSheet } from 'react-native';

interface IconProps {
  name: string;
  size?: number;
  style?: any;
  color?: string;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Map custom icon names to Ionicons names
const iconMap: { [key: string]: keyof typeof Ionicons.glyphMap } = {
  'arrow-left': 'arrow-back',
  'arrow-right': 'arrow-forward',
  'chevron-right': 'chevron-forward',
  'chevron-left': 'chevron-back',
  'log-out': 'log-out-outline',
  'camera-off': 'camera-outline',
  'trash-2': 'trash-outline',
  'qr-code': 'qr-code-outline',
  'bell': 'notifications-outline',
  'utensils': 'restaurant-outline',
  'bowl': 'cafe-outline',
  'drumstick-bite': 'restaurant-outline',
  'ice-cream': 'ice-cream-outline',
  'birthday-cake': 'gift-outline',
  'language': 'language-outline',
  'check': 'checkmark',
  'close': 'close',
  'plus': 'add',
  'calendar': 'calendar-outline',
  'map-pin': 'location-outline',
  'image': 'image-outline',
  'camera': 'camera-outline',
  'star': 'star',
  'people': 'people-outline',
};

export default function Icon({ name, size = 24, style, color = colors.text }: IconProps) {
  const ioniconsName = iconMap[name] || (name as keyof typeof Ionicons.glyphMap);
  
  return (
    <View style={[styles.container, style]}>
      <Ionicons name={ioniconsName} size={size} color={color} />
    </View>
  );
}
