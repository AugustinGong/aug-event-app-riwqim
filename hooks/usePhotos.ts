
import { useState, useEffect, useCallback } from 'react';
import { StorageService } from '../services/storageService';
import { Photo, User } from '../types';

export const usePhotos = (eventId?: string) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const loadPhotos = useCallback(async () => {
    if (!eventId) return;
    
    setIsLoading(true);
    try {
      console.log('Loading photos for event:', eventId);
      const eventPhotos = await StorageService.getEventPhotos(eventId);
      setPhotos(eventPhotos);
    } catch (error) {
      console.log('Error loading photos:', error);
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const uploadPhoto = async (
    imageUri: string,
    user: User,
    caption?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!eventId) {
      return { success: false, error: 'No event ID provided' };
    }

    setIsUploading(true);
    try {
      console.log('Uploading photo to event:', eventId);
      
      const result = await StorageService.uploadPhoto(eventId, imageUri, user, caption);
      
      if (result.success && result.photo) {
        // Add new photo to the beginning of the list
        setPhotos(prevPhotos => [result.photo!, ...prevPhotos]);
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.log('Error uploading photo:', error);
      return { success: false, error: 'Failed to upload photo' };
    } finally {
      setIsUploading(false);
    }
  };

  const deletePhoto = async (
    photoId: string,
    userId: string,
    isOrganizer: boolean
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('Deleting photo:', photoId);
      
      const result = await StorageService.deletePhoto(photoId, userId, isOrganizer);
      
      if (result.success) {
        // Remove photo from local state
        setPhotos(prevPhotos => prevPhotos.filter(photo => photo.id !== photoId));
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.log('Error deleting photo:', error);
      return { success: false, error: 'Failed to delete photo' };
    }
  };

  const refreshPhotos = () => {
    loadPhotos();
  };

  return {
    photos,
    isLoading,
    isUploading,
    uploadPhoto,
    deletePhoto,
    refreshPhotos,
  };
};
