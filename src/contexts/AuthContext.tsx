import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/config/supabase';
import type { UserProfile, Patient } from '@/types';
import * as authService from '@/services/authService';
import * as patientService from '@/services/patientService';

interface AuthContextType {
  user: UserProfile | null;
  supabaseUser: SupabaseUser | null;
  loading: boolean;
  error: string | null;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  seniorSignIn: (patient: Patient) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async (authUsr: SupabaseUser | null) => {
    if (!authUsr) {
      // Check if there is an active Senior Patient session
      const savedSenior = localStorage.getItem('careloop_senior_session');
      if (savedSenior) {
        try {
          const parsed = JSON.parse(savedSenior);
          const p = await patientService.getPatient(parsed.patientId);
          if (p) {
            setUser({
              id: p.id,
              email: p.emergencyContact?.email || `${p.uniquePatientId || p.id}@careloop.local`,
              displayName: p.name,
              defaultRole: 'elderly',
              timezone: p.timezone || 'UTC',
              createdAt: p.createdAt,
              updatedAt: p.updatedAt,
            });
            setLoading(false);
            return;
          }
        } catch (e) {
          console.warn('Failed to restore senior session:', e);
        }
      }

      setUser(null);
      setSupabaseUser(null);
      setLoading(false);
      return;
    }

    setSupabaseUser(authUsr);
    try {
      const profile = await authService.getUserProfile(authUsr.id);
      setUser(profile);
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchProfile(session?.user ?? null);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        fetchProfile(session?.user ?? null);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignUp = useCallback(async (email: string, password: string, displayName: string) => {
    setError(null);
    try {
      const profile = await authService.signUp(email, password, displayName);
      setUser(profile);
    } catch (err: any) {
      setError(err.message || 'Sign up failed');
      throw err;
    }
  }, []);

  const handleSignIn = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const data = await authService.signIn(email, password);
      if (data?.user) {
        localStorage.removeItem('careloop_senior_session');
        await fetchProfile(data.user);
      }
    } catch (err: any) {
      setError(err.message || 'Sign in failed');
      throw err;
    }
  }, []);

  const seniorSignIn = useCallback((patient: Patient) => {
    localStorage.setItem(
      'careloop_senior_session',
      JSON.stringify({ patientId: patient.id, patientName: patient.name })
    );
    setUser({
      id: patient.id,
      email: patient.emergencyContact?.email || `${patient.uniquePatientId || patient.id}@careloop.local`,
      displayName: patient.name,
      defaultRole: 'elderly',
      timezone: patient.timezone || 'UTC',
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
    });
  }, []);

  const handleSignOut = useCallback(async () => {
    localStorage.removeItem('careloop_senior_session');
    try {
      await authService.signOut();
      setUser(null);
      setSupabaseUser(null);
    } catch (err: any) {
      setError(err.message || 'Sign out failed');
      setUser(null);
      setSupabaseUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        supabaseUser,
        loading,
        error,
        signUp: handleSignUp,
        signIn: handleSignIn,
        seniorSignIn,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
