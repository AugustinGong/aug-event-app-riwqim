
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import { commonStyles, colors, buttonStyles } from '../styles/commonStyles';
import Icon from './Icon';
import SimpleBottomSheet from './BottomSheet';
import i18n from '../config/i18n';

interface LocationData {
  address: string;
  latitude: number;
  longitude: number;
}

interface LocationPickerProps {
  onLocationSelect: (location: LocationData) => void;
  initialLocation?: LocationData;
  placeholder?: string;
}

export default function LocationPicker({ 
  onLocationSelect, 
  initialLocation, 
  placeholder = 'Enter event location' 
}: LocationPickerProps) {
  const [showLocationSheet, setShowLocationSheet] = useState(false);
  const [address, setAddress] = useState(initialLocation?.address || '');
  const [loading, setLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(initialLocation || null);

  useEffect(() => {
    if (initialLocation) {
      setAddress(initialLocation.address);
      setCurrentLocation(initialLocation);
    }
  }, [initialLocation]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Location permission is needed to get your current location.',
          [{ text: 'OK' }]
        );
        return false;
      }
      return true;
    } catch (error) {
      console.log('Error requesting location permission:', error);
      return false;
    }
  };

  const getCurrentLocation = async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return;

    setLoading(true);
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      
      // Reverse geocode to get address
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (reverseGeocode.length > 0) {
        const result = reverseGeocode[0];
        const formattedAddress = [
          result.name,
          result.street,
          result.city,
          result.region,
          result.country
        ].filter(Boolean).join(', ');

        const locationData: LocationData = {
          address: formattedAddress,
          latitude,
          longitude,
        };

        setAddress(formattedAddress);
        setCurrentLocation(locationData);
        onLocationSelect(locationData);
      }
    } catch (error) {
      console.log('Error getting current location:', error);
      Alert.alert('Error', 'Failed to get current location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const geocodeAddress = async (inputAddress: string) => {
    if (!inputAddress.trim()) return;

    setLoading(true);
    try {
      const geocoded = await Location.geocodeAsync(inputAddress);
      
      if (geocoded.length > 0) {
        const { latitude, longitude } = geocoded[0];
        
        const locationData: LocationData = {
          address: inputAddress.trim(),
          latitude,
          longitude,
        };

        setCurrentLocation(locationData);
        onLocationSelect(locationData);
        Alert.alert('Success', 'Location found and selected!');
      } else {
        Alert.alert('Not Found', 'Could not find the specified location. Please try a different address.');
      }
    } catch (error) {
      console.log('Error geocoding address:', error);
      Alert.alert('Error', 'Failed to find location. Please check the address and try again.');
    } finally {
      setLoading(false);
    }
  };

  const openInMaps = () => {
    if (!currentLocation) return;

    const { latitude, longitude } = currentLocation;
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

  const openMapSelector = () => {
    // For web deployment, open Google Maps in a new tab for location selection
    const mapsUrl = currentLocation 
      ? `https://www.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`
      : 'https://www.google.com/maps';
    
    if (Platform.OS === 'web') {
      window.open(mapsUrl, '_blank');
    } else {
      Linking.openURL(mapsUrl);
    }
    
    Alert.alert(
      'Map Selection',
      'Please select your location on the map, then copy the address back to this form.',
      [{ text: 'OK' }]
    );
  };

  return (
    <View>
      <TouchableOpacity
        style={[commonStyles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
        onPress={() => setShowLocationSheet(true)}
      >
        <Text style={{ 
          color: address ? colors.text : colors.textSecondary,
          flex: 1,
        }}>
          {address || placeholder}
        </Text>
        <Icon name="map-pin" size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      <SimpleBottomSheet
        isVisible={showLocationSheet}
        onClose={() => setShowLocationSheet(false)}
      >
        <View style={{ padding: 20 }}>
          <Text style={[commonStyles.title, { marginBottom: 20, textAlign: 'center' }]}>
            Select Location
          </Text>

          {/* Manual Address Input */}
          <View style={{ marginBottom: 20 }}>
            <Text style={[commonStyles.label, { marginBottom: 8 }]}>
              Enter Address
            </Text>
            <TextInput
              style={commonStyles.input}
              placeholder="Type the event address"
              placeholderTextColor={colors.textSecondary}
              value={address}
              onChangeText={setAddress}
              multiline
            />
            <TouchableOpacity
              style={[buttonStyles.secondary, { marginTop: 10 }]}
              onPress={() => geocodeAddress(address)}
              disabled={loading || !address.trim()}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Icon name="search" size={16} color={colors.primary} />
                  <Text style={{ color: colors.primary, marginLeft: 8 }}>
                    Find Location
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Current Location */}
          <TouchableOpacity
            style={[buttonStyles.primary, { marginBottom: 15 }]}
            onPress={getCurrentLocation}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Icon name="navigation" size={16} color="white" />
                <Text style={{ color: 'white', marginLeft: 8 }}>
                  Use Current Location
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Map Selector */}
          <TouchableOpacity
            style={[buttonStyles.secondary, { marginBottom: 15 }]}
            onPress={openMapSelector}
          >
            <Icon name="map" size={16} color={colors.primary} />
            <Text style={{ color: colors.primary, marginLeft: 8 }}>
              Select on Map
            </Text>
          </TouchableOpacity>

          {/* Current Selection */}
          {currentLocation && (
            <View style={[commonStyles.card, { marginBottom: 15 }]}>
              <Text style={[commonStyles.subtitle, { marginBottom: 8 }]}>
                Selected Location
              </Text>
              <Text style={[commonStyles.text, { marginBottom: 8 }]}>
                {currentLocation.address}
              </Text>
              <Text style={[commonStyles.textSecondary, { fontSize: 12 }]}>
                {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
              </Text>
              <TouchableOpacity
                style={[buttonStyles.secondary, { marginTop: 10 }]}
                onPress={openInMaps}
              >
                <Icon name="external-link" size={14} color={colors.primary} />
                <Text style={{ color: colors.primary, marginLeft: 6, fontSize: 12 }}>
                  View in Maps
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Web Platform Notice */}
          {Platform.OS === 'web' && (
            <View style={[commonStyles.card, { backgroundColor: colors.warning + '20', marginBottom: 15 }]}>
              <Text style={[commonStyles.textSecondary, { fontSize: 12, textAlign: 'center' }]}>
                Note: Interactive maps are not supported in Natively web version. 
                Use the "Select on Map" button to open Google Maps in a new tab.
              </Text>
            </View>
          )}

          {/* Done Button */}
          <TouchableOpacity
            style={[buttonStyles.primary]}
            onPress={() => setShowLocationSheet(false)}
          >
            <Text style={{ color: 'white', fontWeight: '600' }}>
              Done
            </Text>
          </TouchableOpacity>
        </View>
      </SimpleBottomSheet>
    </View>
  );
}
