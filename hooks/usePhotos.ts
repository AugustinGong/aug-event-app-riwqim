
import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../config/supabase';
import { Photo, User } from '../types';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Alert, Platform } from 'react-native';
import i18n from '../config/i18n';

export const usePhotos = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPhotos = useCallback(async (eventId: string) => {
    if (!isSupabaseConfigured) {
      console.log('Supabase not configured, using empty photos');
      setPhotos([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('photos')
        .select(`
          *,
          uploader:users!photos_uploaded_by_fkey(*)
        `)
        .eq('event_id', eventId)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.log('Error loading photos:', error);
        setError(error.message);
        return;
      }

      const formattedPhotos: Photo[] = (data || []).map((photo: any) => ({
        id: photo.id,
        eventId: photo.event_id,
        uploadedBy: photo.uploaded_by,
        uploader: photo.uploader,
        url: photo.url,
        thumbnail: photo.thumbnail,
        caption: photo.caption,
        uploadedAt: new Date(photo.uploaded_at),
      }));

      setPhotos(formattedPhotos);
    } catch (err: any) {
      console.log('Error loading photos:', err);
      setError(err.message || 'Failed to load photos');
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadPhoto = async (eventId: string, imageUri: string, user: User) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured. Please set up your Supabase connection first.');
    }

    try {
      console.log('Uploading photo for event:', eventId);

      // Create a unique filename
      const fileName = `${eventId}/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      
      // Read the file as base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: 'base64',
      });

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('event-photos')
        .upload(fileName, decode(base64), {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) {
        console.log('Error uploading to storage:', uploadError);
        throw uploadError;
      }

      console.log('Photo uploaded to storage:', uploadData.path);

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('event-photos')
        .getPublicUrl(uploadData.path);

      // Save photo record to database
      const { data: photoData, error: dbError } = await supabase
        .from('photos')
        .insert([{
          event_id: eventId,
          uploaded_by: user.id,
          url: urlData.publicUrl,
        }])
        .select(`
          *,
          uploader:users!photos_uploaded_by_fkey(*)
        `)
        .single();

      if (dbError) {
        console.log('Error saving photo to database:', dbError);
        throw dbError;
      }

      console.log('Photo saved to database:', photoData.id);

      // Add the new photo to the local state
      const newPhoto: Photo = {
        id: photoData.id,
        eventId: photoData.event_id,
        uploadedBy: photoData.uploaded_by,
        uploader: photoData.uploader,
        url: photoData.url,
        thumbnail: photoData.thumbnail,
        caption: photoData.caption,
        uploadedAt: new Date(photoData.uploaded_at),
      };

      setPhotos(prevPhotos => [newPhoto, ...prevPhotos]);

    } catch (error: any) {
      console.log('Error uploading photo:', error);
      throw error;
    }
  };

  const downloadPhoto = async (photo: Photo) => {
    try {
      console.log('Downloading photo:', photo.id);

      // Request media library permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          i18n.t('common.error'),
          'Permission to access media library is required to save photos.'
        );
        return;
      }

      // Download the image
      const fileName = `AUG-Event-${photo.id}.jpg`;
      const downloadPath = `${FileSystem.documentDirectory}${fileName}`;

      const downloadResult = await FileSystem.downloadAsync(photo.url, downloadPath);
      
      if (downloadResult.status !== 200) {
        throw new Error('Failed to download image');
      }

      // Save to media library
      const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
      
      // Create album if it doesn't exist
      let album = await MediaLibrary.getAlbumAsync('AUG-Event');
      if (!album) {
        album = await MediaLibrary.createAlbumAsync('AUG-Event', asset, false);
      } else {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      }

      Alert.alert(
        i18n.t('common.success'),
        i18n.t('event.photoSavedToGallery')
      );

      console.log('Photo saved to gallery:', asset.uri);

    } catch (error: any) {
      console.log('Error downloading photo:', error);
      Alert.alert(
        i18n.t('common.error'),
        error.message || 'Failed to save photo to gallery'
      );
    }
  };

  const deletePhoto = async (photoId: string) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured. Please set up your Supabase connection first.');
    }

    try {
      console.log('Deleting photo:', photoId);

      // Get photo data to find the storage path
      const { data: photoData, error: fetchError } = await supabase
        .from('photos')
        .select('url')
        .eq('id', photoId)
        .single();

      if (fetchError) {
        console.log('Error fetching photo for deletion:', fetchError);
        throw fetchError;
      }

      // Extract the file path from the URL
      const url = photoData.url;
      const pathMatch = url.match(/event-photos\/(.+)$/);
      const filePath = pathMatch ? pathMatch[1] : null;

      // Delete from database first
      const { error: dbError } = await supabase
        .from('photos')
        .delete()
        .eq('id', photoId);

      if (dbError) {
        console.log('Error deleting photo from database:', dbError);
        throw dbError;
      }

      // Delete from storage if we have the path
      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from('event-photos')
          .remove([filePath]);

        if (storageError) {
          console.log('Error deleting photo from storage:', storageError);
          // Don't throw here as the database deletion was successful
        }
      }

      console.log('Photo deleted successfully');

      // Remove from local state
      setPhotos(prevPhotos => prevPhotos.filter(photo => photo.id !== photoId));

    } catch (error: any) {
      console.log('Error deleting photo:', error);
      throw error;
    }
  };

  return {
    photos,
    loading,
    error,
    loadPhotos,
    uploadPhoto,
    downloadPhoto,
    deletePhoto,
  };
};

// Helper function to decode base64
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
