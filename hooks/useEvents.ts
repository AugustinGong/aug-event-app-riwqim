
import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  onSnapshot,
  arrayUnion,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Event, MenuCourse, User } from '../types';

export const useEvents = (userId?: string) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [userEvents, setUserEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Convert Firestore timestamp to Date
  const convertTimestamp = (timestamp: any): Date => {
    if (timestamp && timestamp.toDate) {
      return timestamp.toDate();
    }
    return new Date(timestamp);
  };

  // Convert Firestore document to Event object
  const convertFirestoreEvent = (doc: any): Event => {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title,
      description: data.description,
      date: convertTimestamp(data.date),
      location: data.location,
      organizerId: data.organizerId,
      organizer: data.organizer,
      menu: data.menu || [],
      participants: data.participants || [],
      qrCode: data.qrCode,
      isLive: data.isLive || false,
      createdAt: convertTimestamp(data.createdAt),
      expiresAt: convertTimestamp(data.expiresAt),
    };
  };

  const loadEvents = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      console.log('Loading events for user:', userId);
      
      // Load events where user is organizer or participant
      const eventsRef = collection(db, 'events');
      const organizerQuery = query(
        eventsRef, 
        where('organizerId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const participantQuery = query(
        eventsRef,
        where('participants', 'array-contains', userId),
        orderBy('createdAt', 'desc')
      );

      const [organizerSnapshot, participantSnapshot] = await Promise.all([
        getDocs(organizerQuery),
        getDocs(participantQuery)
      ]);

      const allEvents: Event[] = [];
      const eventIds = new Set();

      // Add organized events
      organizerSnapshot.forEach((doc) => {
        const event = convertFirestoreEvent(doc);
        allEvents.push(event);
        eventIds.add(doc.id);
      });

      // Add participated events (avoid duplicates)
      participantSnapshot.forEach((doc) => {
        if (!eventIds.has(doc.id)) {
          const event = convertFirestoreEvent(doc);
          allEvents.push(event);
        }
      });

      console.log('Loaded events:', allEvents.length);
      setEvents(allEvents);
      setUserEvents(allEvents);
    } catch (error) {
      console.log('Error loading events:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const createEvent = async (eventData: {
    title: string;
    description?: string;
    date: Date;
    location: string;
    menu: Omit<MenuCourse, 'id' | 'isServed'>[];
  }, organizer: User) => {
    try {
      console.log('Creating event:', eventData.title);
      
      const menuWithIds = eventData.menu.map((course, index) => ({
        ...course,
        id: `${Date.now()}_${index}`,
        isServed: false,
      }));

      const newEventData = {
        title: eventData.title,
        description: eventData.description || '',
        date: Timestamp.fromDate(eventData.date),
        location: eventData.location,
        organizerId: organizer.id,
        organizer: {
          id: organizer.id,
          name: organizer.name,
          email: organizer.email,
          avatar: organizer.avatar,
        },
        menu: menuWithIds,
        participants: [organizer.id],
        qrCode: '', // Will be updated after creation
        isLive: false,
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)), // 180 days
      };

      const docRef = await addDoc(collection(db, 'events'), newEventData);
      
      // Update with QR code that includes the document ID
      const qrCode = `aug-event://join/${docRef.id}`;
      await updateDoc(docRef, { qrCode });

      console.log('Event created with ID:', docRef.id);
      
      // Reload events to get the updated list
      await loadEvents();
      
      return { success: true, eventId: docRef.id };
    } catch (error) {
      console.log('Error creating event:', error);
      return { success: false, error: 'Failed to create event' };
    }
  };

  const joinEvent = async (eventId: string, user: User) => {
    try {
      console.log('Joining event:', eventId, 'for user:', user.id);
      
      const eventRef = doc(db, 'events', eventId);
      const eventDoc = await getDoc(eventRef);
      
      if (!eventDoc.exists()) {
        return { success: false, error: 'Event not found' };
      }

      const eventData = eventDoc.data();
      if (eventData.participants && eventData.participants.includes(user.id)) {
        return { success: false, error: 'Already joined this event' };
      }

      // Add user to participants array
      await updateDoc(eventRef, {
        participants: arrayUnion(user.id)
      });

      console.log('Successfully joined event');
      
      // Reload events to get the updated list
      await loadEvents();
      
      return { success: true };
    } catch (error) {
      console.log('Error joining event:', error);
      return { success: false, error: 'Failed to join event' };
    }
  };

  const updateEventStatus = async (eventId: string, isLive: boolean) => {
    try {
      console.log('Updating event status:', eventId, 'isLive:', isLive);
      
      const eventRef = doc(db, 'events', eventId);
      await updateDoc(eventRef, { isLive });
      
      // Update local state
      setEvents(prevEvents => 
        prevEvents.map(event => 
          event.id === eventId ? { ...event, isLive } : event
        )
      );
      
      setUserEvents(prevEvents => 
        prevEvents.map(event => 
          event.id === eventId ? { ...event, isLive } : event
        )
      );
      
      console.log('Event status updated successfully');
      return { success: true };
    } catch (error) {
      console.log('Error updating event status:', error);
      return { success: false, error: 'Failed to update event' };
    }
  };

  const markCourseServed = async (eventId: string, courseId: string) => {
    try {
      console.log('Marking course served:', eventId, courseId);
      
      const eventRef = doc(db, 'events', eventId);
      const eventDoc = await getDoc(eventRef);
      
      if (!eventDoc.exists()) {
        return { success: false, error: 'Event not found' };
      }

      const eventData = eventDoc.data();
      const updatedMenu = eventData.menu.map((course: MenuCourse) => 
        course.id === courseId ? { ...course, isServed: true } : course
      );

      await updateDoc(eventRef, { menu: updatedMenu });
      
      // Update local state
      const updateEventMenu = (event: Event) => {
        if (event.id === eventId) {
          return {
            ...event,
            menu: event.menu.map(course => 
              course.id === courseId ? { ...course, isServed: true } : course
            ),
          };
        }
        return event;
      };
      
      setEvents(prevEvents => prevEvents.map(updateEventMenu));
      setUserEvents(prevEvents => prevEvents.map(updateEventMenu));
      
      console.log('Course marked as served successfully');
      return { success: true };
    } catch (error) {
      console.log('Error marking course served:', error);
      return { success: false, error: 'Failed to update course' };
    }
  };

  const getEventById = async (eventId: string): Promise<Event | null> => {
    try {
      console.log('Getting event by ID:', eventId);
      
      const eventRef = doc(db, 'events', eventId);
      const eventDoc = await getDoc(eventRef);
      
      if (eventDoc.exists()) {
        return convertFirestoreEvent(eventDoc);
      }
      
      return null;
    } catch (error) {
      console.log('Error getting event by ID:', error);
      return null;
    }
  };

  return {
    events,
    userEvents,
    isLoading,
    createEvent,
    joinEvent,
    updateEventStatus,
    markCourseServed,
    refreshEvents: loadEvents,
    getEventById,
  };
};
