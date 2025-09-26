
import { usePhotos } from '../hooks/usePhotos';
import { commonStyles, colors } from '../styles/commonStyles';
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
import { User } from '../types';
import * as ImagePicker from 'expo-image-picker';
import Icon from './Icon';
import SimpleBottomSheet from './BottomSheet';
import i18n from '../config/i18n';

interface PhotoGalleryProps {
  eventId: string;
  user: User;
  isOrganizer: boolean;
  canUpload: boolean;
}

export default function PhotoGallery({ eventId, user, isOrganizer, canUpload }: PhotoGalleryProps) {
  const { photos, loading, loadPhotos, uploadPhoto, downloadPhoto, deletePhoto } = usePhotos();
  const [refreshing, setRefreshing] = useState(false);
  const [showUploadSheet, setShowUploadSheet] = useState(false);
  const [showPhotoSheet, setShowPhotoSheet] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  const screenWidth = Dimensions.get('window').width;
  const imageSize = (screenWidth - 60) / 2; // 2 columns with padding

  React.useEffect(() => {
    loadPhotos(eventId);
  }, [eventId, loadPhotos]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPhotos(eventId);
    setRefreshing(false);
  };

  const requestPermissions = async () => {
    // Request camera permissions
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    if (cameraPermission.status !== 'granted') {
      Alert.alert(
        i18n.t('common.error'),
        'Camera permission is required to take photos.',
        [{ text: i18n.t('common.ok') }]
      );
      return false;
    }

    // Request media library permissions
    const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (mediaPermission.status !== 'granted') {
      Alert.alert(
        i18n.t('common.error'),
        'Media library permission is required to select photos.',
        [{ text: i18n.t('common.ok') }]
      );
      return false;
    }

    return true;
  };

  const handlePickImage = async () => {
    setShowUploadSheet(false);
    
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;
    
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        setUploading(true);
        try {
          await uploadPhoto(eventId, result.assets[0].uri, user);
          Alert.alert(i18n.t('common.success'), i18n.t('event.photoUploadedSuccess'));
        } catch (error: any) {
          console.log('Error uploading photo:', error);
          Alert.alert(i18n.t('common.error'), error.message || i18n.t('errors.unknownError'));
        } finally {
          setUploading(false);
        }
      }
    } catch (error: any) {
      console.log('Error picking image:', error);
      Alert.alert(i18n.t('common.error'), 'Failed to select image from library');
      setUploading(false);
    }
  };

  const handleTakePhoto = async () => {
    setShowUploadSheet(false);
    
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;
    
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });

      if (!result.canceled && result.assets[0]) {
        setUploading(true);
        try {
          await uploadPhoto(eventId, result.assets[0].uri, user);
          Alert.alert(i18n.t('common.success'), i18n.t('event.photoUploadedSuccess'));
        } catch (error: any) {
          console.log('Error uploading photo:', error);
          Alert.alert(i18n.t('common.error'), error.message || i18n.t('errors.unknownError'));
        } finally {
          setUploading(false);
        }
      }
    } catch (error: any) {
      console.log('Error taking photo:', error);
      Alert.alert(i18n.t('common.error'), 'Failed to take photo');
      setUploading(false);
    }
  };

  const handlePhotoPress = (photo: any) => {
    setSelectedPhoto(photo);
    setShowPhotoSheet(true);
  };

  const handleDownloadPhoto = async () => {
    if (!selectedPhoto) return;
    
    setShowPhotoSheet(false);
    try {
      await downloadPhoto(selectedPhoto);
    } catch (error: any) {
      console.log('Error downloading photo:', error);
      Alert.alert(i18n.t('common.error'), error.message || 'Failed to download photo');
    }
  };

  const handleDeletePhoto = (photoId: string) => {
    setShowPhotoSheet(false);
    Alert.alert(
      i18n.t('event.deletePhoto'),
      i18n.t('event.confirmDeletePhoto'),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePhoto(photoId);
              Alert.alert(i18n.t('common.success'), i18n.t('event.photoDeletedSuccess'));
            } catch (error: any) {
              console.log('Error deleting photo:', error);
              Alert.alert(i18n.t('common.error'), error.message || i18n.t('errors.unknownError'));
            }
          },
        },
      ]
    );
  };

  const showUploadOptions = () => {
    setShowUploadSheet(true);
  };

  if (loading && photos.length === 0) {
    return (
      <View style={[commonStyles.centerContent, { flex: 1 }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[commonStyles.textSecondary, { marginTop: 10 }]}>
          {i18n.t('common.loading')}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {canUpload && (
        <View style={{ padding: 20, paddingBottom: 10 }}>
          <TouchableOpacity
            style={[
              commonStyles.card,
              {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 15,
                backgroundColor: colors.primaryLight,
              }
            ]}
            onPress={showUploadOptions}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Icon name="camera" size={20} color={colors.primary} />
            )}
            <Text style={[commonStyles.text, { color: colors.primary, marginLeft: 10 }]}>
              {uploading ? i18n.t('common.loading') : i18n.t('event.uploadPhoto')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingTop: 10 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {photos.length === 0 ? (
          <View style={[commonStyles.centerContent, { marginTop: 50 }]}>
            <Icon name="image" size={64} color={colors.textSecondary} />
            <Text style={[commonStyles.title, { marginTop: 20, textAlign: 'center' }]}>
              {i18n.t('event.noPhotos')}
            </Text>
            <Text style={[commonStyles.textSecondary, { textAlign: 'center', marginTop: 10 }]}>
              {canUpload ? 'Tap the upload button to add the first photo!' : 'No photos have been uploaded yet.'}
            </Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {photos.map((photo) => (
              <TouchableOpacity 
                key={photo.id} 
                style={{ marginBottom: 20 }}
                onPress={() => handlePhotoPress(photo)}
              >
                <Image
                  source={{ uri: photo.url }}
                  style={{
                    width: imageSize,
                    height: imageSize,
                    borderRadius: 12,
                  }}
                />
                <View style={{
                  position: 'absolute',
                  bottom: 8,
                  left: 8,
                  right: 8,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <Text style={{
                    color: 'white',
                    fontSize: 12,
                    fontWeight: '600',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 8,
                    flex: 1,
                    marginRight: 8,
                  }} numberOfLines={1}>
                    {photo.uploader?.name || 'Unknown'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Upload Options Bottom Sheet */}
      <SimpleBottomSheet
        isVisible={showUploadSheet}
        onClose={() => setShowUploadSheet(false)}
      >
        <View style={{ padding: 20 }}>
          <Text style={[commonStyles.title, { marginBottom: 20, textAlign: 'center' }]}>
            {i18n.t('event.uploadPhoto')}
          </Text>
          
          <TouchableOpacity
            style={[commonStyles.card, { flexDirection: 'row', alignItems: 'center', marginBottom: 15 }]}
            onPress={handleTakePhoto}
          >
            <Icon name="camera" size={24} color={colors.primary} />
            <Text style={[commonStyles.text, { marginLeft: 15 }]}>
              {i18n.t('event.takePhoto')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[commonStyles.card, { flexDirection: 'row', alignItems: 'center' }]}
            onPress={handlePickImage}
          >
            <Icon name="image" size={24} color={colors.primary} />
            <Text style={[commonStyles.text, { marginLeft: 15 }]}>
              {i18n.t('event.chooseFromLibrary')}
            </Text>
          </TouchableOpacity>
        </View>
      </SimpleBottomSheet>

      {/* Photo Actions Bottom Sheet */}
      <SimpleBottomSheet
        isVisible={showPhotoSheet}
        onClose={() => setShowPhotoSheet(false)}
      >
        <View style={{ padding: 20 }}>
          <Text style={[commonStyles.title, { marginBottom: 20, textAlign: 'center' }]}>
            {i18n.t('event.photoOptions')}
          </Text>
          
          <TouchableOpacity
            style={[commonStyles.card, { flexDirection: 'row', alignItems: 'center', marginBottom: 15 }]}
            onPress={handleDownloadPhoto}
          >
            <Icon name="download" size={24} color={colors.primary} />
            <Text style={[commonStyles.text, { marginLeft: 15 }]}>
              {i18n.t('event.downloadPhoto')}
            </Text>
          </TouchableOpacity>
          
          {(isOrganizer || selectedPhoto?.uploadedBy === user.id) && (
            <TouchableOpacity
              style={[commonStyles.card, { flexDirection: 'row', alignItems: 'center' }]}
              onPress={() => handleDeletePhoto(selectedPhoto?.id)}
            >
              <Icon name="trash-2" size={24} color={colors.error} />
              <Text style={[commonStyles.text, { marginLeft: 15, color: colors.error }]}>
                {i18n.t('event.deletePhoto')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </SimpleBottomSheet>
    </View>
  );
}
