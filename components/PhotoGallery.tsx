
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
import { commonStyles, colors } from '../styles/commonStyles';
import { User } from '../types';
import Icon from './Icon';

interface PhotoGalleryProps {
  eventId: string;
  user: User;
  isOrganizer: boolean;
  canUpload: boolean;
}

export default function PhotoGallery({ eventId, user, isOrganizer, canUpload }: PhotoGalleryProps) {
  const { photos, isLoading, isUploading, loadPhotos, uploadPhoto, deletePhoto, pickImageFromGallery, takePhoto } = usePhotos(eventId);
  const [refreshing, setRefreshing] = useState(false);

  const screenWidth = Dimensions.get('window').width;
  const imageSize = (screenWidth - 48) / 2; // 2 columns with padding

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPhotos();
    setRefreshing(false);
  };

  const handlePickImage = async () => {
    try {
      const result = await pickImageFromGallery();
      if (result.success && result.uri) {
        const uploadResult = await uploadPhoto(result.uri, user.id);
        if (!uploadResult.success) {
          Alert.alert('Upload Failed', uploadResult.error || 'Failed to upload photo');
        }
      }
    } catch (error) {
      console.log('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const result = await takePhoto();
      if (result.success && result.uri) {
        const uploadResult = await uploadPhoto(result.uri, user.id);
        if (!uploadResult.success) {
          Alert.alert('Upload Failed', uploadResult.error || 'Failed to upload photo');
        }
      }
    } catch (error) {
      console.log('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
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
        { text: 'Choose from Gallery', onPress: handlePickImage },
      ]
    );
  };

  if (isLoading && photos.length === 0) {
    return (
      <View style={[commonStyles.container, commonStyles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[commonStyles.subtitle, { marginTop: 16 }]}>
          Loading photos...
        </Text>
      </View>
    );
  }

  return (
    <View style={commonStyles.container}>
      {canUpload && (
        <TouchableOpacity
          style={[commonStyles.button, { marginBottom: 16 }]}
          onPress={showUploadOptions}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <>
              <Icon name="camera" size={20} color={colors.background} />
              <Text style={[commonStyles.buttonText, { marginLeft: 8 }]}>
                Add Photo
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {photos.length === 0 ? (
          <View style={[commonStyles.centerContent, { paddingVertical: 40 }]}>
            <Icon name="image" size={48} color={colors.textSecondary} />
            <Text style={[commonStyles.subtitle, { marginTop: 16, textAlign: 'center' }]}>
              No photos yet
            </Text>
            <Text style={[commonStyles.caption, { textAlign: 'center', marginTop: 8 }]}>
              {canUpload ? 'Be the first to add a photo!' : 'Photos will appear here when guests upload them'}
            </Text>
          </View>
        ) : (
          <View style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            paddingBottom: 20,
          }}>
            {photos.map((photo) => (
              <View
                key={photo.id}
                style={{
                  width: imageSize,
                  marginBottom: 16,
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  overflow: 'hidden',
                  ...commonStyles.shadow,
                }}
              >
                <Image
                  source={{ uri: photo.url }}
                  style={{
                    width: '100%',
                    height: imageSize,
                    backgroundColor: colors.border,
                  }}
                  resizeMode="cover"
                />
                
                <View style={{ padding: 12 }}>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[commonStyles.caption, { color: colors.primary }]}>
                        {photo.uploader.name}
                      </Text>
                      <Text style={[commonStyles.caption, { color: colors.textSecondary, fontSize: 11 }]}>
                        {photo.uploadedAt.toLocaleDateString()}
                      </Text>
                    </View>
                    
                    {(isOrganizer || photo.uploadedBy === user.id) && (
                      <TouchableOpacity
                        onPress={() => handleDeletePhoto(photo.id)}
                        style={{
                          padding: 4,
                          borderRadius: 4,
                        }}
                      >
                        <Icon name="trash" size={16} color={colors.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  {photo.caption && (
                    <Text style={[commonStyles.caption, { marginTop: 8 }]}>
                      {photo.caption}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
