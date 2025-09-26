
import { supabase } from '../config/supabase';
import { Photo, User } from '../types';

export const uploadPhoto = async (
  eventId: string,
  imageUri: string,
  userId: string,
  caption?: string
): Promise<{ success: boolean; photo?: Photo; error?: string }> => {
  try {
    console.log('Uploading photo for event:', eventId);

    // Create filename
    const filename = `${eventId}/${Date.now()}.jpg`;
    
    // Convert image URI to blob
    const response = await fetch(imageUri);
    const blob = await response.blob();

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

    const photo: Photo = {
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

    console.log('Photo uploaded successfully:', photo.id);
    return { success: true, photo };
  } catch (error: any) {
    console.log('Error in uploadPhoto:', error);
    return { success: false, error: error.message || 'Failed to upload photo' };
  }
};

export const deletePhoto = async (
  photoId: string,
  eventId: string,
  userId: string,
  isOrganizer: boolean
): Promise<{ success: boolean; error?: string }> => {
  try {
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

    console.log('Photo deleted successfully:', photoId);
    return { success: true };
  } catch (error: any) {
    console.log('Error in deletePhoto:', error);
    return { success: false, error: error.message || 'Failed to delete photo' };
  }
};

export const getPhotosForEvent = async (eventId: string): Promise<Photo[]> => {
  try {
    console.log('Getting photos for event:', eventId);

    const { data: photosData, error } = await supabase
      .from('photos')
      .select(`
        *,
        uploader:users!photos_uploaded_by_fkey(*)
      `)
      .eq('event_id', eventId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.log('Error getting photos:', error);
      throw error;
    }

    const photos: Photo[] = (photosData || []).map(photoData => ({
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

    console.log('Retrieved photos:', photos.length);
    return photos;
  } catch (error: any) {
    console.log('Error in getPhotosForEvent:', error);
    throw error;
  }
};
