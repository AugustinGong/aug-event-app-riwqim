
import { Event, MenuCourse, User } from '../types';
import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../config/supabase';

export const useEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    if (!isSupabaseConfigured) {
      console.log('Supabase not configured, using mock events');
      setEvents([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          organizer:users!events_organizer_id_fkey(*),
          event_participants(
            user_id,
            role,
            joined_at,
            user:users(*)
          ),
          menu_courses(*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.log('Error loading events:', error);
        setError(error.message);
        return;
      }

      const formattedEvents: Event[] = (data || []).map((event: any) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        date: new Date(event.date),
        location: event.location,
        organizerId: event.organizer_id,
        organizer: event.organizer,
        status: event.status || 'upcoming',
        qrCode: event.qr_code,
        isLive: event.is_live || false,
        menu: (event.menu_courses || []).map((course: any) => ({
          id: course.id,
          name: course.name,
          type: course.type,
          description: course.description,
          isServed: course.is_served,
        })),
        participants: (event.event_participants || []).map((participant: any) => participant.user),
        createdAt: new Date(event.created_at),
        expiresAt: event.expires_at ? new Date(event.expires_at) : undefined,
      }));

      setEvents(formattedEvents);
    } catch (err: any) {
      console.log('Error loading events:', err);
      setError(err.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const createEvent = async (eventData: {
    title: string;
    description: string;
    date: Date;
    location: string;
    menu: MenuCourse[];
  }) => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase is not configured. Please set up your Supabase connection first.' };
    }

    try {
      console.log('Creating event:', eventData.title);

      // Get current user from auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.log('Authentication error:', authError);
        return { success: false, error: 'User not authenticated. Please log in again.' };
      }

      console.log('Authenticated user:', user.id);

      // Generate QR code data
      const qrCodeData = `aug-event://${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const { data, error } = await supabase
        .from('events')
        .insert([{
          title: eventData.title,
          description: eventData.description,
          date: eventData.date.toISOString(),
          location: eventData.location,
          organizer_id: user.id,
          qr_code: qrCodeData,
          status: 'upcoming',
          is_live: false,
          expires_at: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(), // 180 days from now
        }])
        .select()
        .single();

      if (error) {
        console.log('Error creating event:', error);
        return { success: false, error: error.message };
      }

      console.log('Event created successfully:', data.id);
      console.log('Event data:', data);

      // Create menu courses
      if (eventData.menu.length > 0) {
        const { error: menuError } = await supabase
          .from('menu_courses')
          .insert(
            eventData.menu.map(course => ({
              event_id: data.id,
              name: course.name,
              type: course.type,
              description: course.description,
              is_served: false,
            }))
          );

        if (menuError) {
          console.log('Error creating menu courses:', menuError);
          // Don't fail the whole operation for menu course errors
        } else {
          console.log('Menu courses created successfully');
        }
      }
      
      // Reload events to get the updated list
      await loadEvents();
      
      return { success: true, event: data };
    } catch (error: any) {
      console.log('Error creating event:', error);
      return { success: false, error: error.message || 'Failed to create event' };
    }
  };

  const getEventById = async (id: string): Promise<Event | null> => {
    if (!isSupabaseConfigured) {
      console.log('Supabase not configured, returning null event');
      return null;
    }

    try {
      console.log('Loading event:', id);

      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          organizer:users!events_organizer_id_fkey(*),
          event_participants(
            user_id,
            role,
            joined_at,
            user:users(*)
          ),
          menu_courses(*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.log('Error loading event:', error);
        throw error;
      }

      const event: Event = {
        id: data.id,
        title: data.title,
        description: data.description,
        date: new Date(data.date),
        location: data.location,
        organizerId: data.organizer_id,
        organizer: data.organizer,
        status: data.status || 'upcoming',
        qrCode: data.qr_code,
        isLive: data.is_live || false,
        menu: (data.menu_courses || []).map((course: any) => ({
          id: course.id,
          name: course.name,
          type: course.type,
          description: course.description,
          isServed: course.is_served,
        })),
        participants: (data.event_participants || []).map((participant: any) => participant.user),
        createdAt: new Date(data.created_at),
        expiresAt: data.expires_at ? new Date(data.expires_at) : undefined,
      };

      return event;
    } catch (error: any) {
      console.log('Error loading event:', error);
      throw error;
    }
  };

  const updateEventStatus = async (eventId: string, status: 'upcoming' | 'live' | 'ended') => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured. Please set up your Supabase connection first.');
    }

    try {
      console.log('Updating event status:', eventId, status);

      const { error } = await supabase
        .from('events')
        .update({ status })
        .eq('id', eventId);

      if (error) {
        console.log('Error updating event status:', error);
        throw error;
      }

      // Reload events to get the updated list
      await loadEvents();
    } catch (error: any) {
      console.log('Error updating event status:', error);
      throw error;
    }
  };

  const joinEvent = async (eventId: string, userId?: string) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured. Please set up your Supabase connection first.');
    }

    try {
      console.log('Joining event:', eventId);

      // Get current user from auth if userId not provided
      let currentUserId = userId;
      if (!currentUserId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          throw new Error('User not authenticated');
        }
        currentUserId = user.id;
      }

      // Check if user is already a participant
      const { data: existingParticipant, error: checkError } = await supabase
        .from('event_participants')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', currentUserId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.log('Error checking participant:', checkError);
        throw checkError;
      }

      if (existingParticipant) {
        console.log('User already joined this event');
        return;
      }

      // Add user as participant with 'guest' role
      const { error } = await supabase
        .from('event_participants')
        .insert([{
          event_id: eventId,
          user_id: currentUserId,
          role: 'guest',
        }]);

      if (error) {
        console.log('Error joining event:', error);
        throw error;
      }

      console.log('Successfully joined event');
      
      // Reload events to get the updated list
      await loadEvents();
    } catch (error: any) {
      console.log('Error joining event:', error);
      throw error;
    }
  };

  const markCourseServed = async (courseId: string) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured. Please set up your Supabase connection first.');
    }

    try {
      console.log('Marking course as served:', courseId);

      const { error } = await supabase
        .from('menu_courses')
        .update({ is_served: true })
        .eq('id', courseId);

      if (error) {
        console.log('Error marking course as served:', error);
        throw error;
      }

      console.log('Course marked as served successfully');
      
      // Reload events to get the updated list
      await loadEvents();
    } catch (error: any) {
      console.log('Error marking course as served:', error);
      throw error;
    }
  };

  return {
    events,
    loading,
    error,
    loadEvents,
    createEvent,
    getEventById,
    updateEventStatus,
    joinEvent,
    markCourseServed,
  };
};
