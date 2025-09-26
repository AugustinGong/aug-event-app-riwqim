
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { Photo, User } from '../types';
import * as ImagePicker from 'expo-image-picker';

export const usePhotos = (eventId: string) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPhotos = useCallback(async () => {
    if (!eventId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      console.log('Loading photos for event:', eventId);

      const { data: photosData, error: photosError } = await supabase
        .from('photos')
        .select(`
          *,
          uploader:users!photos_uploaded_by_fkey(*)
        `)
        .eq('event_id', eventId)
        .order('uploaded_at', { ascending: false });

      if (photosError) {
        console.log('Error loading photos:', photosError);
        throw photosError;
      }

      const formattedPhotos: Photo[] = (photosData || []).map(photoData => ({
        id: photoData.id,
        eventId: photoData.event_id,
        uploadedBy: photoData.uploaded_by,
        uploader: {
          id: photoData.uploader.id,
          email: photoData.uploader.email,
          name: photoData.uploader.name,
          avatar: photoData.uploader.avatar,
          createdAt: new Date(photoData.uploader.created_at),
        },
        url: photoData.url,
        thumbnail: photoData.thumbnail,
        caption: photoData.caption,
        uploadedAt: new Date(photoData.uploaded_at),
      }));

      setPhotos(formattedPhotos);
      console.log('Loaded photos:', formattedPhotos.length);
    } catch (error: any) {
      console.log('Error in loadPhotos:', error);
      setError(error.message || 'Failed to load photos');
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const uploadPhoto = async (imageUri: string, userId: string, caption?: string) => {
    try {
      setIsUploading(true);
      setError(null);
      console.log('Uploading photo for event:', eventId);

      // Create form data for upload
      const formData = new FormData();
      const filename = `${eventId}/${Date.now()}.jpg`;
      
      // Convert image URI to blob
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      formData.append('file', blob as any, filename);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('event-photos')
        .upload(filename, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) {
        console.log('Error uploading photo:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('event-photos')
        .getPublicUrl(uploadData.path);

      // Save photo record to database
      const { data: photoData, error: photoError } = await supabase
        .from('photos')
        .insert([{
          event_id: eventId,
          uploaded_by: userId,
          url: urlData.publicUrl,
          caption: caption,
        }])
        .select(`
          *,
          uploader:users!photos_uploaded_by_fkey(*)
        `)
        .single();

      if (photoError) {
        console.log('Error saving photo record:', photoError);
        throw photoError;
      }

      const newPhoto: Photo = {
        id: photoData.id,
        eventId: photoData.event_id,
        uploadedBy: photoData.uploaded_by,
        uploader: {
          id: photoData.uploader.id,
          email: photoData.uploader.email,
          name: photoData.uploader.name,
          avatar: photoData.uploader.avatar,
          createdAt: new Date(photoData.uploader.created_at),
        },
        url: photoData.url,
        thumbnail: photoData.thumbnail,
        caption: photoData.caption,
        uploadedAt: new Date(photoData.uploaded_at),
      };

      // Add to local state
      setPhotos(prev => [newPhoto, ...prev]);

      console.log('Photo uploaded successfully:', newPhoto.id);
      return { success: true, photo: newPhoto };
    } catch (error: any) {
      console.log('Error in uploadPhoto:', error);
      setError(error.message || 'Failed to upload photo');
      return { success: false, error: error.message || 'Failed to upload photo' };
    } finally {
      setIsUploading(false);
    }
  };

  const deletePhoto = async (photoId: string, userId: string, isOrganizer: boolean) => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('Deleting photo:', photoId);

      // Get photo details first
      const { data: photoData, error: getError } = await supabase
        .from('photos')
        .select('*')
        .eq('id', photoId)
        .single();

      if (getError || !photoData) {
        console.log('Photo not found:', getError);
        throw new Error('Photo not found');
      }

      // Check permissions (organizer or photo uploader can delete)
      if (!isOrganizer && photoData.uploaded_by !== userId) {
        throw new Error('You do not have permission to delete this photo');
      }

      // Delete from storage
      const filename = photoData.url.split('/').pop();
      if (filename) {
        const { error: storageError } = await supabase.storage
          .from('event-photos')
          .remove([`${eventId}/${filename}`]);

        if (storageError) {
          console.log('Error deleting from storage:', storageError);
          // Continue with database deletion even if storage deletion fails
        }
      }

      // Delete from database
      const { error: deleteError } = await supabase
        .from('photos')
        .delete()
        .eq('id', photoId);

      if (deleteError) {
        console.log('Error deleting photo from database:', deleteError);
        throw deleteError;
      }

      // Remove from local state
      setPhotos(prev => prev.filter(photo => photo.id !== photoId));

      console.log('Photo deleted successfully:', photoId);
      return { success: true };
    } catch (error: any) {
      console.log('Error in deletePhoto:', error);
      setError(error.message || 'Failed to delete photo');
      return { success: false, error: error.message || 'Failed to delete photo' };
    } finally {
      setIsLoading(false);
    }
  };

  const pickImageFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permission to access media library is required');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        return { success: true, uri: result.assets[0].uri };
      }

      return { success: false, cancelled: true };
    } catch (error: any) {
      console.log('Error picking image from gallery:', error);
      return { success: false, error: error.message || 'Failed to pick image' };
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permission to access camera is required');
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        return { success: true, uri: result.assets[0].uri };
      }

      return { success: false, cancelled: true };
    } catch (error: any) {
      console.log('Error taking photo:', error);
      return { success: false, error: error.message || 'Failed to take photo' };
    }
  };

  return {
    photos,
    isLoading,
    isUploading,
    error,
    loadPhotos,
    uploadPhoto,
    deletePhoto,
    pickImageFromGallery,
    takePhoto,
  };
};
