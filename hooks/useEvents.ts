
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
          organizer:users!events_organizer_id_fkey(*)
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
        menu: event.menu || [],
        participants: event.participants || [],
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
        return { success: false, error: 'User not authenticated' };
      }

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
        }
      }

      console.log('Event created successfully:', data.id);
      
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
          organizer:users!events_organizer_id_fkey(*)
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
        menu: data.menu || [],
        participants: data.participants || [],
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

  const joinEvent = async (eventId: string, userId: string) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured. Please set up your Supabase connection first.');
    }

    try {
      console.log('Joining event:', eventId, userId);

      // First get the current event
      const { data: event, error: fetchError } = await supabase
        .from('events')
        .select('participants')
        .eq('id', eventId)
        .single();

      if (fetchError) {
        console.log('Error fetching event:', fetchError);
        throw fetchError;
      }

      const participants = event.participants || [];
      
      // Check if user is already a participant
      if (participants.includes(userId)) {
        console.log('User already joined this event');
        return;
      }

      // Add user to participants
      const updatedParticipants = [...participants, userId];

      const { error } = await supabase
        .from('events')
        .update({ participants: updatedParticipants })
        .eq('id', eventId);

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

  return {
    events,
    loading,
    error,
    loadEvents,
    createEvent,
    getEventById,
    updateEventStatus,
    joinEvent,
  };
};
