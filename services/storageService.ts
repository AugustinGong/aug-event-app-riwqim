
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, orderBy } from 'firebase/firestore';
import { storage, db } from '../config/firebase';
import { Photo, User } from '../types';

export class StorageService {
  // Upload photo to Firebase Storage and save metadata to Firestore
  static async uploadPhoto(
    eventId: string, 
    imageUri: string, 
    user: User, 
    caption?: string
  ): Promise<{ success: boolean; photo?: Photo; error?: string }> {
    try {
      console.log('Uploading photo for event:', eventId);
      
      // Convert image URI to blob
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      // Create unique filename
      const filename = `${Date.now()}_${user.id}.jpg`;
      const photoRef = ref(storage, `events/${eventId}/photos/${filename}`);
      
      // Upload to Firebase Storage
      const snapshot = await uploadBytes(photoRef, blob);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      // Save photo metadata to Firestore
      const photoData = {
        eventId,
        uploadedBy: user.id,
        uploader: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
        },
        url: downloadURL,
        caption: caption || '',
        uploadedAt: new Date(),
      };
      
      const docRef = await addDoc(collection(db, 'photos'), photoData);
      
      const photo: Photo = {
        id: docRef.id,
        ...photoData,
      };
      
      console.log('Photo uploaded successfully:', photo.id);
      return { success: true, photo };
    } catch (error) {
      console.log('Error uploading photo:', error);
      return { success: false, error: 'Failed to upload photo' };
    }
  }

  // Get all photos for an event
  static async getEventPhotos(eventId: string): Promise<Photo[]> {
    try {
      console.log('Getting photos for event:', eventId);
      
      const photosRef = collection(db, 'photos');
      const q = query(
        photosRef,
        where('eventId', '==', eventId),
        orderBy('uploadedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const photos: Photo[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        photos.push({
          id: doc.id,
          eventId: data.eventId,
          uploadedBy: data.uploadedBy,
          uploader: data.uploader,
          url: data.url,
          thumbnail: data.thumbnail,
          caption: data.caption,
          uploadedAt: data.uploadedAt.toDate(),
        });
      });
      
      console.log('Retrieved photos:', photos.length);
      return photos;
    } catch (error) {
      console.log('Error getting event photos:', error);
      return [];
    }
  }

  // Delete photo (organizer only)
  static async deletePhoto(
    photoId: string, 
    userId: string, 
    isOrganizer: boolean
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Deleting photo:', photoId);
      
      if (!isOrganizer) {
        return { success: false, error: 'Only organizers can delete photos' };
      }
      
      // Get photo document to get storage path
      const photoDoc = await getDocs(
        query(collection(db, 'photos'), where('__name__', '==', photoId))
      );
      
      if (photoDoc.empty) {
        return { success: false, error: 'Photo not found' };
      }
      
      const photoData = photoDoc.docs[0].data();
      
      // Delete from Firebase Storage
      const photoRef = ref(storage, photoData.url);
      await deleteObject(photoRef);
      
      // Delete from Firestore
      await deleteDoc(doc(db, 'photos', photoId));
      
      console.log('Photo deleted successfully');
      return { success: true };
    } catch (error) {
      console.log('Error deleting photo:', error);
      return { success: false, error: 'Failed to delete photo' };
    }
  }

  // Delete all photos for an event (when event expires)
  static async deleteEventPhotos(eventId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Deleting all photos for event:', eventId);
      
      // Get all photos for the event
      const photosRef = collection(db, 'photos');
      const q = query(photosRef, where('eventId', '==', eventId));
      const querySnapshot = await getDocs(q);
      
      // Delete from Storage and Firestore
      const deletePromises = querySnapshot.docs.map(async (photoDoc) => {
        const photoData = photoDoc.data();
        
        // Delete from Storage
        const photoRef = ref(storage, photoData.url);
        await deleteObject(photoRef);
        
        // Delete from Firestore
        await deleteDoc(photoDoc.ref);
      });
      
      await Promise.all(deletePromises);
      
      console.log('All event photos deleted successfully');
      return { success: true };
    } catch (error) {
      console.log('Error deleting event photos:', error);
      return { success: false, error: 'Failed to delete event photos' };
    }
  }
}
