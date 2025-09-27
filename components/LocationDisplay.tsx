
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { commonStyles, colors, buttonStyles } from '../styles/commonStyles';
import Icon from './Icon';
import i18n from '../config/i18n';

interface LocationDisplayProps {
  address: string;
  latitude?: number;
  longitude?: number;
  showMapButton?: boolean;
}

export default function LocationDisplay({ 
  address, 
  latitude, 
  longitude, 
  showMapButton = true 
}: LocationDisplayProps) {
  const openInMaps = () => {
    if (!latitude || !longitude) {
      // Fallback to address search
      const encodedAddress = encodeURIComponent(address);
      const url = Platform.select({
        ios: `maps:q=${encodedAddress}`,
        android: `geo:0,0?q=${encodedAddress}`,
        default: `https://www.google.com/maps/search/${encodedAddress}`,
      });
      
      Linking.openURL(url).catch(() => {
        // Fallback to Google Maps web
        Linking.openURL(`https://www.google.com/maps/search/${encodedAddress}`);
      });
      return;
    }

    const url = Platform.select({
      ios: `maps:${latitude},${longitude}`,
      android: `geo:${latitude},${longitude}`,
      default: `https://www.google.com/maps?q=${latitude},${longitude}`,
    });

    Linking.openURL(url).catch(() => {
      // Fallback to Google Maps web
      Linking.openURL(`https://www.google.com/maps?q=${latitude},${longitude}`);
    });
  };

  return (
    <View style={[commonStyles.card, { marginBottom: 15 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
        <Icon name="map-pin" size={20} color={colors.primary} style={{ marginTop: 2, marginRight: 10 }} />
        <View style={{ flex: 1 }}>
          <Text style={[commonStyles.text, { lineHeight: 20 }]}>
            {address}
          </Text>
          {latitude && longitude && (
            <Text style={[commonStyles.textSecondary, { fontSize: 12, marginTop: 4 }]}>
              {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </Text>
          )}
        </View>
      </View>

      {showMapButton && (
        <TouchableOpacity
          style={[buttonStyles.secondary, { alignSelf: 'flex-start' }]}
          onPress={openInMaps}
        >
          <Icon name="external-link" size={14} color={colors.primary} />
          <Text style={{ color: colors.primary, marginLeft: 6, fontSize: 12 }}>
            Open in Maps
          </Text>
        </TouchableOpacity>
      )}

      {/* Web Platform Notice */}
      {Platform.OS === 'web' && (
        <View style={[commonStyles.card, { backgroundColor: colors.warning + '20', marginTop: 10, padding: 10 }]}>
          <Text style={[commonStyles.textSecondary, { fontSize: 11, textAlign: 'center' }]}>
            Note: Interactive maps are not supported in Natively web version. 
            The "Open in Maps" button will open Google Maps in a new tab.
          </Text>
        </View>
      )}
    </View>
  );
}
