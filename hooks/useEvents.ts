
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { Event, MenuCourse, User } from '../types';

export const useEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async (userId?: string) => {
    if (!userId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      console.log('Loading events for user:', userId);

      // Get events where user is organizer or participant
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select(`
          *,
          organizer:users!events_organizer_id_fkey(*),
          menu_courses(*),
          event_participants!inner(user_id)
        `)
        .or(`organizer_id.eq.${userId},event_participants.user_id.eq.${userId}`)
        .order('date', { ascending: true });

      if (eventsError) {
        console.log('Error loading events:', eventsError);
        throw eventsError;
      }

      const formattedEvents: Event[] = (eventsData || []).map(eventData => ({
        id: eventData.id,
        title: eventData.title,
        description: eventData.description,
        date: new Date(eventData.date),
        location: eventData.location,
        organizerId: eventData.organizer_id,
        organizer: {
          id: eventData.organizer.id,
          email: eventData.organizer.email,
          name: eventData.organizer.name,
          avatar: eventData.organizer.avatar,
          createdAt: new Date(eventData.organizer.created_at),
        },
        menu: (eventData.menu_courses || []).map((course: any) => ({
          id: course.id,
          name: course.name,
          type: course.type,
          description: course.description,
          isServed: course.is_served,
        })),
        participants: eventData.event_participants?.map((p: any) => p.user_id) || [],
        qrCode: eventData.qr_code,
        isLive: eventData.is_live,
        createdAt: new Date(eventData.created_at),
        expiresAt: new Date(eventData.expires_at),
      }));

      setEvents(formattedEvents);
      console.log('Loaded events:', formattedEvents.length);
    } catch (error: any) {
      console.log('Error in loadEvents:', error);
      setError(error.message || 'Failed to load events');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createEvent = async (eventData: {
    title: string;
    description?: string;
    date: Date;
    location: string;
    menu: Omit<MenuCourse, 'id' | 'isServed'>[];
    organizerId: string;
  }) => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('Creating event:', eventData.title);

      // Generate QR code data
      const qrCodeData = `aug-event://join/${Date.now()}`;
      
      // Calculate expiry date (180 days from event date)
      const expiresAt = new Date(eventData.date);
      expiresAt.setDate(expiresAt.getDate() + 180);

      // Create event
      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert([{
          title: eventData.title,
          description: eventData.description,
          date: eventData.date.toISOString(),
          location: eventData.location,
          organizer_id: eventData.organizerId,
          qr_code: qrCodeData,
          is_live: false,
          expires_at: expiresAt.toISOString(),
        }])
        .select()
        .single();

      if (eventError) {
        console.log('Error creating event:', eventError);
        throw eventError;
      }

      // Create menu courses
      if (eventData.menu.length > 0) {
        const menuCourses = eventData.menu.map(course => ({
          event_id: event.id,
          name: course.name,
          type: course.type,
          description: course.description,
          is_served: false,
        }));

        const { error: menuError } = await supabase
          .from('menu_courses')
          .insert(menuCourses);

        if (menuError) {
          console.log('Error creating menu courses:', menuError);
          throw menuError;
        }
      }

      // Add organizer as participant
      const { error: participantError } = await supabase
        .from('event_participants')
        .insert([{
          event_id: event.id,
          user_id: eventData.organizerId,
          role: 'organizer',
        }]);

      if (participantError) {
        console.log('Error adding organizer as participant:', participantError);
        throw participantError;
      }

      console.log('Event created successfully:', event.id);
      
      // Reload events
      await loadEvents(eventData.organizerId);
      
      return { success: true, eventId: event.id };
    } catch (error: any) {
      console.log('Error in createEvent:', error);
      setError(error.message || 'Failed to create event');
      return { success: false, error: error.message || 'Failed to create event' };
    } finally {
      setIsLoading(false);
    }
  };

  const joinEvent = async (qrCode: string, userId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('Joining event with QR code:', qrCode);

      // Find event by QR code
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('qr_code', qrCode)
        .single();

      if (eventError || !event) {
        console.log('Event not found:', eventError);
        throw new Error('Invalid QR code or event not found');
      }

      // Check if user is already a participant
      const { data: existingParticipant } = await supabase
        .from('event_participants')
        .select('*')
        .eq('event_id', event.id)
        .eq('user_id', userId)
        .single();

      if (existingParticipant) {
        console.log('User already joined this event');
        return { success: true, message: 'You are already part of this event' };
      }

      // Add user as participant
      const { error: participantError } = await supabase
        .from('event_participants')
        .insert([{
          event_id: event.id,
          user_id: userId,
          role: 'guest',
        }]);

      if (participantError) {
        console.log('Error joining event:', participantError);
        throw participantError;
      }

      console.log('Successfully joined event:', event.id);
      
      // Reload events
      await loadEvents(userId);
      
      return { success: true, eventId: event.id };
    } catch (error: any) {
      console.log('Error in joinEvent:', error);
      setError(error.message || 'Failed to join event');
      return { success: false, error: error.message || 'Failed to join event' };
    } finally {
      setIsLoading(false);
    }
  };

  const getEventById = useCallback(async (eventId: string) => {
    try {
      console.log('Getting event by ID:', eventId);

      const { data: eventData, error } = await supabase
        .from('events')
        .select(`
          *,
          organizer:users!events_organizer_id_fkey(*),
          menu_courses(*),
          event_participants(user_id, role, users(*))
        `)
        .eq('id', eventId)
        .single();

      if (error) {
        console.log('Error getting event:', error);
        throw error;
      }

      const event: Event = {
        id: eventData.id,
        title: eventData.title,
        description: eventData.description,
        date: new Date(eventData.date),
        location: eventData.location,
        organizerId: eventData.organizer_id,
        organizer: {
          id: eventData.organizer.id,
          email: eventData.organizer.email,
          name: eventData.organizer.name,
          avatar: eventData.organizer.avatar,
          createdAt: new Date(eventData.organizer.created_at),
        },
        menu: (eventData.menu_courses || []).map((course: any) => ({
          id: course.id,
          name: course.name,
          type: course.type,
          description: course.description,
          isServed: course.is_served,
        })),
        participants: eventData.event_participants?.map((p: any) => p.user_id) || [],
        qrCode: eventData.qr_code,
        isLive: eventData.is_live,
        createdAt: new Date(eventData.created_at),
        expiresAt: new Date(eventData.expires_at),
      };

      return event;
    } catch (error: any) {
      console.log('Error in getEventById:', error);
      throw error;
    }
  }, []);

  const toggleEventStatus = async (eventId: string, isLive: boolean) => {
    try {
      console.log('Toggling event status:', eventId, isLive);

      const { error } = await supabase
        .from('events')
        .update({ is_live: isLive })
        .eq('id', eventId);

      if (error) {
        console.log('Error toggling event status:', error);
        throw error;
      }

      // Update local state
      setEvents(prev => prev.map(event => 
        event.id === eventId ? { ...event, isLive } : event
      ));

      return { success: true };
    } catch (error: any) {
      console.log('Error in toggleEventStatus:', error);
      return { success: false, error: error.message || 'Failed to update event status' };
    }
  };

  const markCourseServed = async (eventId: string, courseId: string) => {
    try {
      console.log('Marking course as served:', courseId);

      const { error } = await supabase
        .from('menu_courses')
        .update({ is_served: true })
        .eq('id', courseId)
        .eq('event_id', eventId);

      if (error) {
        console.log('Error marking course as served:', error);
        throw error;
      }

      // Update local state
      setEvents(prev => prev.map(event => 
        event.id === eventId 
          ? {
              ...event,
              menu: event.menu.map(course =>
                course.id === courseId ? { ...course, isServed: true } : course
              )
            }
          : event
      ));

      return { success: true };
    } catch (error: any) {
      console.log('Error in markCourseServed:', error);
      return { success: false, error: error.message || 'Failed to mark course as served' };
    }
  };

  return {
    events,
    isLoading,
    error,
    loadEvents,
    createEvent,
    joinEvent,
    getEventById,
    toggleEventStatus,
    markCourseServed,
  };
};
