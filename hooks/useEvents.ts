
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
        organizer: event.organizer,
        status: event.status,
        qrCode: event.qr_code,
        menu: event.menu || [],
        participants: event.participants || [],
        createdAt: new Date(event.created_at),
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
    organizerId: string;
  }) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured. Please set up your Supabase connection first.');
    }

    try {
      console.log('Creating event:', eventData.title);

      const { data, error } = await supabase
        .from('events')
        .insert([{
          title: eventData.title,
          description: eventData.description,
          date: eventData.date.toISOString(),
          location: eventData.location,
          menu: eventData.menu,
          organizer_id: eventData.organizerId,
          status: 'upcoming',
          participants: [],
          created_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) {
        console.log('Error creating event:', error);
        throw error;
      }

      console.log('Event created successfully:', data.id);
      
      // Reload events to get the updated list
      await loadEvents();
      
      return data;
    } catch (error: any) {
      console.log('Error creating event:', error);
      throw error;
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
        organizer: data.organizer,
        status: data.status,
        qrCode: data.qr_code,
        menu: data.menu || [],
        participants: data.participants || [],
        createdAt: new Date(data.created_at),
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
