
import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../config/supabase';
import { User } from '../types';
import { Session } from '@supabase/supabase-js';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      console.log('Supabase not configured, skipping auth initialization');
      setIsLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session:', session?.user?.id);
      handleAuthChange(session);
    }).catch((error) => {
      console.log('Error getting initial session:', error);
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', session?.user?.id);
      handleAuthChange(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthChange = async (session: Session | null) => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    if (session?.user) {
      try {
        // Get user profile from database
        const { data: profile, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.log('Error fetching user profile:', error);
          throw error;
        }

        const user: User = {
          id: session.user.id,
          email: session.user.email || '',
          name: profile?.name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || '',
          avatar: profile?.avatar || session.user.user_metadata?.avatar_url || undefined,
          createdAt: profile?.created_at ? new Date(profile.created_at) : new Date(),
        };

        // Create user profile if it doesn't exist
        if (!profile) {
          const { error: insertError } = await supabase
            .from('users')
            .insert([{
              id: session.user.id,
              email: user.email,
              name: user.name,
              avatar: user.avatar,
              created_at: new Date().toISOString(),
            }]);

          if (insertError) {
            console.log('Error creating user profile:', insertError);
          }
        }

        setUser(user);
        setIsAuthenticated(true);
      } catch (error) {
        console.log('Error handling auth change:', error);
        setUser(null);
        setIsAuthenticated(false);
      }
    } else {
      setUser(null);
      setIsAuthenticated(false);
    }
    
    setIsLoading(false);
  };

  const login = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase is not configured. Please set up your Supabase connection first.' };
    }

    try {
      setIsLoading(true);
      console.log('Attempting login for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.log('Login error:', error.message);
        
        let errorMessage = 'Login failed';
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please check your email and confirm your account';
        } else if (error.message.includes('Too many requests')) {
          errorMessage = 'Too many failed attempts. Please try again later';
        }
        
        return { success: false, error: errorMessage };
      }

      console.log('Login successful:', data.user?.id);
      return { success: true };
    } catch (error: any) {
      console.log('Login error:', error.message);
      return { success: false, error: 'Login failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase is not configured. Please set up your Supabase connection first.' };
    }

    try {
      setIsLoading(true);
      console.log('Attempting registration for:', email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'https://natively.dev/email-confirmed',
          data: {
            name: name,
          }
        }
      });

      if (error) {
        console.log('Registration error:', error.message);
        
        let errorMessage = 'Registration failed';
        if (error.message.includes('User already registered')) {
          errorMessage = 'An account with this email already exists';
        } else if (error.message.includes('Password should be at least')) {
          errorMessage = 'Password should be at least 6 characters';
        } else if (error.message.includes('Invalid email')) {
          errorMessage = 'Invalid email address';
        }
        
        return { success: false, error: errorMessage };
      }

      console.log('Registration successful:', data.user?.id);
      
      // Check if email confirmation is required
      if (data.user && !data.session) {
        return { 
          success: true, 
          message: 'Please check your email to confirm your account' 
        };
      }
      
      return { success: true };
    } catch (error: any) {
      console.log('Registration error:', error.message);
      return { success: false, error: 'Registration failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    if (!isSupabaseConfigured) {
      return { success: true };
    }

    try {
      console.log('Logging out user');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.log('Logout error:', error.message);
        return { success: false, error: 'Logout failed' };
      }
      
      return { success: true };
    } catch (error: any) {
      console.log('Logout error:', error.message);
      return { success: false, error: 'Logout failed' };
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
  };
};
