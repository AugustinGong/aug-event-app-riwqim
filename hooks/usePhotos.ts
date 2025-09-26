
import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../config/supabase';
import * as ImagePicker from 'expo-image-picker';
import { Photo, User } from '../types';

export const usePhotos = (eventId: string) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPhotos = useCallback(async () => {
    if (!isSupabaseConfigured) {
      console.log('Supabase not configured, using mock photos');
      setPhotos([]);
      setLoading(false);
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
        url: photo.url,
        eventId: photo.event_id,
        uploadedBy: photo.uploaded_by,
        uploader: photo.uploader,
        caption: photo.caption,
        thumbnail: photo.thumbnail,
        uploadedAt: new Date(photo.uploaded_at),
      }));

      setPhotos(formattedPhotos);
    } catch (err: any) {
      console.log('Error loading photos:', err);
      setError(err.message || 'Failed to load photos');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const uploadPhoto = async (imageUri: string, user: User) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured. Please set up your Supabase connection first.');
    }

    try {
      setUploading(true);
      console.log('Uploading photo for event:', eventId);

      // Create a unique filename
      const fileName = `${eventId}/${user.id}/${Date.now()}.jpg`;

      // Convert image to blob
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) {
        console.log('Error uploading photo:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(fileName);

      // Save photo record to database
      const { data: photoData, error: dbError } = await supabase
        .from('photos')
        .insert([{
          url: publicUrl,
          event_id: eventId,
          uploaded_by: user.id,
          uploaded_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (dbError) {
        console.log('Error saving photo record:', dbError);
        throw dbError;
      }

      console.log('Photo uploaded successfully:', photoData.id);
      
      // Reload photos to get the updated list
      await loadPhotos();
      
      return photoData;
    } catch (error: any) {
      console.log('Error uploading photo:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async (photoId: string, userId: string) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured. Please set up your Supabase connection first.');
    }

    try {
      console.log('Deleting photo:', photoId);

      // Get photo details first
      const { data: photo, error: fetchError } = await supabase
        .from('photos')
        .select('*')
        .eq('id', photoId)
        .single();

      if (fetchError) {
        console.log('Error fetching photo:', fetchError);
        throw fetchError;
      }

      // Extract filename from URL
      const urlParts = photo.url.split('/');
      const fileName = urlParts.slice(-3).join('/'); // Get the last 3 parts: eventId/userId/filename

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('photos')
        .remove([fileName]);

      if (storageError) {
        console.log('Error deleting from storage:', storageError);
        // Continue with database deletion even if storage deletion fails
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('photos')
        .delete()
        .eq('id', photoId);

      if (dbError) {
        console.log('Error deleting photo record:', dbError);
        throw dbError;
      }

      console.log('Photo deleted successfully');
      
      // Reload photos to get the updated list
      await loadPhotos();
    } catch (error: any) {
      console.log('Error deleting photo:', error);
      throw error;
    }
  };

  const pickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permission to access media library is required');
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        return result.assets[0].uri;
      }

      return null;
    } catch (error: any) {
      console.log('Error picking image:', error);
      throw error;
    }
  };

  const takePhoto = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permission to access camera is required');
      }

      // Take photo
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        return result.assets[0].uri;
      }

      return null;
    } catch (error: any) {
      console.log('Error taking photo:', error);
      throw error;
    }
  };

  return {
    photos,
    loading,
    uploading,
    error,
    loadPhotos,
    uploadPhoto,
    deletePhoto,
    pickImage,
    takePhoto,
  };
};
