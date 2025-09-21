
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Event, MenuCourse, User } from '../types';

const EVENTS_KEY = 'events_data';
const USER_EVENTS_KEY = 'user_events';

export const useEvents = (userId?: string) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [userEvents, setUserEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, [userId]);

  const loadEvents = async () => {
    try {
      const eventsData = await AsyncStorage.getItem(EVENTS_KEY);
      const userEventsData = await AsyncStorage.getItem(`${USER_EVENTS_KEY}_${userId}`);
      
      if (eventsData) {
        setEvents(JSON.parse(eventsData));
      }
      
      if (userEventsData && userId) {
        setUserEvents(JSON.parse(userEventsData));
      }
    } catch (error) {
      console.log('Error loading events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createEvent = async (eventData: {
    title: string;
    description?: string;
    date: Date;
    location: string;
    menu: Omit<MenuCourse, 'id' | 'isServed'>[];
  }, organizer: User) => {
    try {
      const newEvent: Event = {
        id: Date.now().toString(),
        ...eventData,
        organizerId: organizer.id,
        organizer,
        menu: eventData.menu.map((course, index) => ({
          ...course,
          id: `${Date.now()}_${index}`,
          isServed: false,
        })),
        participants: [organizer.id],
        qrCode: `aug-event://join/${Date.now()}`,
        isLive: false,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 180 days
      };

      const updatedEvents = [...events, newEvent];
      const updatedUserEvents = [...userEvents, newEvent];
      
      await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(updatedEvents));
      await AsyncStorage.setItem(`${USER_EVENTS_KEY}_${organizer.id}`, JSON.stringify(updatedUserEvents));
      
      setEvents(updatedEvents);
      setUserEvents(updatedUserEvents);
      
      return { success: true, event: newEvent };
    } catch (error) {
      console.log('Error creating event:', error);
      return { success: false, error: 'Failed to create event' };
    }
  };

  const joinEvent = async (eventId: string, user: User) => {
    try {
      const event = events.find(e => e.id === eventId);
      if (!event) {
        return { success: false, error: 'Event not found' };
      }

      if (event.participants.includes(user.id)) {
        return { success: false, error: 'Already joined this event' };
      }

      const updatedEvent = {
        ...event,
        participants: [...event.participants, user.id],
      };

      const updatedEvents = events.map(e => e.id === eventId ? updatedEvent : e);
      const updatedUserEvents = [...userEvents, updatedEvent];
      
      await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(updatedEvents));
      await AsyncStorage.setItem(`${USER_EVENTS_KEY}_${user.id}`, JSON.stringify(updatedUserEvents));
      
      setEvents(updatedEvents);
      setUserEvents(updatedUserEvents);
      
      return { success: true, event: updatedEvent };
    } catch (error) {
      console.log('Error joining event:', error);
      return { success: false, error: 'Failed to join event' };
    }
  };

  const updateEventStatus = async (eventId: string, isLive: boolean) => {
    try {
      const updatedEvents = events.map(event => 
        event.id === eventId ? { ...event, isLive } : event
      );
      
      await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(updatedEvents));
      setEvents(updatedEvents);
      
      return { success: true };
    } catch (error) {
      console.log('Error updating event status:', error);
      return { success: false, error: 'Failed to update event' };
    }
  };

  const markCourseServed = async (eventId: string, courseId: string) => {
    try {
      const updatedEvents = events.map(event => {
        if (event.id === eventId) {
          return {
            ...event,
            menu: event.menu.map(course => 
              course.id === courseId ? { ...course, isServed: true } : course
            ),
          };
        }
        return event;
      });
      
      await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(updatedEvents));
      setEvents(updatedEvents);
      
      return { success: true };
    } catch (error) {
      console.log('Error marking course served:', error);
      return { success: false, error: 'Failed to update course' };
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
  };
};
