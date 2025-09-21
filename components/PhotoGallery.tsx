
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { usePhotos } from '../hooks/usePhotos';
import { User } from '../types';
import { commonStyles, colors } from '../styles/commonStyles';
import Icon from './Icon';

interface PhotoGalleryProps {
  eventId: string;
  user: User;
  isOrganizer: boolean;
  canUpload: boolean;
}

const { width } = Dimensions.get('window');
const photoSize = (width - 60) / 3; // 3 photos per row with margins

const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  eventId,
  user,
  isOrganizer,
  canUpload,
}) => {
  const { photos, isLoading, isUploading, uploadPhoto, deletePhoto, refreshPhotos } = usePhotos(eventId);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const handlePickImage = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera roll is required!');
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        
        // Show caption input
        Alert.prompt(
          'Add Caption',
          'Enter a caption for your photo (optional)',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Upload',
              onPress: async (caption) => {
                const uploadResult = await uploadPhoto(imageUri, user, caption);
                if (!uploadResult.success) {
                  Alert.alert('Upload Failed', uploadResult.error || 'Failed to upload photo');
                }
              },
            },
          ],
          'plain-text'
        );
      }
    } catch (error) {
      console.log('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleTakePhoto = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera is required!');
        return;
      }

      // Take photo
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        
        // Show caption input
        Alert.prompt(
          'Add Caption',
          'Enter a caption for your photo (optional)',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Upload',
              onPress: async (caption) => {
                const uploadResult = await uploadPhoto(imageUri, user, caption);
                if (!uploadResult.success) {
                  Alert.alert('Upload Failed', uploadResult.error || 'Failed to upload photo');
                }
              },
            },
          ],
          'plain-text'
        );
      }
    } catch (error) {
      console.log('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleDeletePhoto = (photoId: string) => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deletePhoto(photoId, user.id, isOrganizer);
            if (!result.success) {
              Alert.alert('Delete Failed', result.error || 'Failed to delete photo');
            }
          },
        },
      ]
    );
  };

  const showUploadOptions = () => {
    Alert.alert(
      'Add Photo',
      'Choose how you want to add a photo',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Choose from Library', onPress: handlePickImage },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[commonStyles.container, commonStyles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[commonStyles.text, { marginTop: 16 }]}>Loading photos...</Text>
      </View>
    );
  }

  return (
    <View style={commonStyles.container}>
      {/* Upload Button */}
      {canUpload && (
        <View style={{ padding: 16 }}>
          <TouchableOpacity
            style={[
              commonStyles.button,
              { 
                backgroundColor: colors.primary,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }
            ]}
            onPress={showUploadOptions}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Icon name="camera" size={20} color="white" />
                <Text style={[commonStyles.buttonText, { marginLeft: 8 }]}>
                  Add Photo
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Photo Grid */}
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refreshPhotos}
            tintColor={colors.primary}
          />
        }
      >
        {photos.length === 0 ? (
          <View style={[commonStyles.centered, { padding: 40 }]}>
            <Icon name="image" size={64} color={colors.textSecondary} />
            <Text style={[commonStyles.text, { marginTop: 16, textAlign: 'center' }]}>
              No photos yet
            </Text>
            {canUpload && (
              <Text style={[commonStyles.textSecondary, { marginTop: 8, textAlign: 'center' }]}>
                Be the first to share a moment!
              </Text>
            )}
          </View>
        ) : (
          <View style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            padding: 16,
            justifyContent: 'space-between',
          }}>
            {photos.map((photo) => (
              <TouchableOpacity
                key={photo.id}
                style={{
                  width: photoSize,
                  height: photoSize,
                  marginBottom: 16,
                  borderRadius: 8,
                  overflow: 'hidden',
                  backgroundColor: colors.surface,
                }}
                onPress={() => setSelectedPhoto(photo.id)}
                onLongPress={() => {
                  if (isOrganizer || photo.uploadedBy === user.id) {
                    handleDeletePhoto(photo.id);
                  }
                }}
              >
                <Image
                  source={{ uri: photo.url }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
                
                {/* Photo Info Overlay */}
                <View style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  padding: 4,
                }}>
                  <Text style={{
                    color: 'white',
                    fontSize: 10,
                    fontWeight: '500',
                  }}>
                    {photo.uploader.name}
                  </Text>
                  {photo.caption && (
                    <Text style={{
                      color: 'white',
                      fontSize: 9,
                      opacity: 0.8,
                    }} numberOfLines={1}>
                      {photo.caption}
                    </Text>
                  )}
                </View>

                {/* Delete indicator for organizer */}
                {isOrganizer && (
                  <View style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    backgroundColor: 'rgba(255,0,0,0.8)',
                    borderRadius: 12,
                    width: 24,
                    height: 24,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Icon name="trash" size={12} color="white" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default PhotoGallery;
