
-- AUG-Event Database Schema for Supabase
-- Run these SQL commands in your Supabase SQL editor

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  push_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create events table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT NOT NULL,
  organizer_id UUID REFERENCES public.users(id) NOT NULL,
  qr_code TEXT NOT NULL UNIQUE,
  is_live BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create menu_courses table
CREATE TABLE IF NOT EXISTS public.menu_courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('appetizer', 'first', 'main', 'dessert', 'cake')),
  description TEXT,
  is_served BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create event_participants table
CREATE TABLE IF NOT EXISTS public.event_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('organizer', 'guest')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Create photos table
CREATE TABLE IF NOT EXISTS public.photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  uploaded_by UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  thumbnail TEXT,
  caption TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('course_ready', 'event_update', 'photo_uploaded')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create storage bucket for event photos
INSERT INTO storage.buckets (id, name, public) VALUES ('event-photos', 'event-photos', true);

-- Row Level Security Policies

-- Users table policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Events table policies
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view events they participate in" ON public.events
  FOR SELECT USING (
    organizer_id = auth.uid() OR 
    id IN (
      SELECT event_id FROM public.event_participants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create events" ON public.events
  FOR INSERT WITH CHECK (organizer_id = auth.uid());

CREATE POLICY "Organizers can update their events" ON public.events
  FOR UPDATE USING (organizer_id = auth.uid());

CREATE POLICY "Organizers can delete their events" ON public.events
  FOR DELETE USING (organizer_id = auth.uid());

-- Menu courses table policies
ALTER TABLE public.menu_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view menu courses for events they participate in" ON public.menu_courses
  FOR SELECT USING (
    event_id IN (
      SELECT id FROM public.events 
      WHERE organizer_id = auth.uid() OR 
      id IN (
        SELECT event_id FROM public.event_participants 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Organizers can manage menu courses for their events" ON public.menu_courses
  FOR ALL USING (
    event_id IN (
      SELECT id FROM public.events 
      WHERE organizer_id = auth.uid()
    )
  );

-- Event participants table policies
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view participants for events they participate in" ON public.event_participants
  FOR SELECT USING (
    event_id IN (
      SELECT id FROM public.events 
      WHERE organizer_id = auth.uid() OR 
      id IN (
        SELECT event_id FROM public.event_participants 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can join events" ON public.event_participants
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Organizers can manage participants for their events" ON public.event_participants
  FOR ALL USING (
    event_id IN (
      SELECT id FROM public.events 
      WHERE organizer_id = auth.uid()
    )
  );

-- Photos table policies
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view photos for events they participate in" ON public.photos
  FOR SELECT USING (
    event_id IN (
      SELECT id FROM public.events 
      WHERE organizer_id = auth.uid() OR 
      id IN (
        SELECT event_id FROM public.event_participants 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can upload photos to events they participate in" ON public.photos
  FOR INSERT WITH CHECK (
    uploaded_by = auth.uid() AND
    event_id IN (
      SELECT event_id FROM public.event_participants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own photos" ON public.photos
  FOR DELETE USING (uploaded_by = auth.uid());

CREATE POLICY "Organizers can delete any photos from their events" ON public.photos
  FOR DELETE USING (
    event_id IN (
      SELECT id FROM public.events 
      WHERE organizer_id = auth.uid()
    )
  );

-- Notifications table policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view notifications for events they participate in" ON public.notifications
  FOR SELECT USING (
    event_id IN (
      SELECT id FROM public.events 
      WHERE organizer_id = auth.uid() OR 
      id IN (
        SELECT event_id FROM public.event_participants 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Organizers can create notifications for their events" ON public.notifications
  FOR INSERT WITH CHECK (
    event_id IN (
      SELECT id FROM public.events 
      WHERE organizer_id = auth.uid()
    )
  );

-- Storage policies for event photos
CREATE POLICY "Users can view photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'event-photos');

CREATE POLICY "Users can upload photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'event-photos' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete their own photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'event-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON public.events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(date);
CREATE INDEX IF NOT EXISTS idx_events_qr_code ON public.events(qr_code);
CREATE INDEX IF NOT EXISTS idx_menu_courses_event_id ON public.menu_courses(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_event_id ON public.event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_user_id ON public.event_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_photos_event_id ON public.photos(event_id);
CREATE INDEX IF NOT EXISTS idx_photos_uploaded_by ON public.photos(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_notifications_event_id ON public.notifications(event_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at trigger to users table
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON public.users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
