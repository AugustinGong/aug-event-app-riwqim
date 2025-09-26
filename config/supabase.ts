
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase configuration - now connected!
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://jzpwseajbygpvicipkla.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6cHdzZWFqYnlncHZpY2lwa2xhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4NzY0MjQsImV4cCI6MjA3NDQ1MjQyNH0.rgBycBIwVDNs3afgvJ93WMZfp_bDubaDtGCzmXUnX4Y';

// Check if Supabase is properly configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== '' && supabaseAnonKey !== '');

// Create a mock client for when Supabase is not configured
const createMockClient = () => ({
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
    signUp: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
    signOut: () => Promise.resolve({ error: null }),
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
      }),
      order: () => Promise.resolve({ data: [], error: null }),
    }),
    insert: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
    update: () => ({
      eq: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
    }),
    delete: () => ({
      eq: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
    }),
  }),
  storage: {
    from: () => ({
      upload: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
      remove: () => Promise.resolve({ error: { message: 'Supabase not configured' } }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
    }),
  },
});

// Create the Supabase client or mock client
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : createMockClient();

if (!isSupabaseConfigured) {
  console.warn('Supabase is not configured. Using mock client. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY environment variables.');
} else {
  console.log('✅ Supabase is connected and ready!');
}

export default supabase;
