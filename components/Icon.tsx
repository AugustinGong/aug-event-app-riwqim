
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/commonStyles';
import { View, StyleSheet } from 'react-native';

interface IconProps {
  name: keyof typeof Ionicons.glyphMap;
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

export default function Icon({ name, size = 24, style, color = colors.text }: IconProps) {
  return (
    <View style={[styles.container, style]}>
      <Ionicons name={name} size={size} color={color} />
    </View>
  );
}
