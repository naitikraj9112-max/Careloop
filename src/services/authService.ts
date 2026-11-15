import { supabase } from '@/config/supabase';
import type { UserProfile } from '@/types';
import { mapUserFromDb, mapUserToDb } from '@/lib/mappers';

/**
 * Sign up a new user with Supabase Auth + insert profile record in `users`.
 */
export async function signUp(
  email: string,
  password: string,
  displayName: string,
): Promise<UserProfile> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
    },
  });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error('Sign up failed: no user returned.');
  }

  const now = new Date().toISOString();
  const profile: UserProfile = {
    id: data.user.id,
    email,
    displayName,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    createdAt: now,
    updatedAt: now,
  };

  const { error: profileError } = await supabase
    .from('users')
    .upsert(mapUserToDb(profile));

  if (profileError) {
    console.error('Failed to create user profile in database:', profileError);
  }

  return profile;
}

/**
 * Sign in with email & password.
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

/**
 * Returns the currently authenticated user from local session.
 */
export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

/**
 * Fetch a UserProfile record from the database.
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }

  if (!data) {
    // If auth user exists, create default profile row
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user && authData.user.id === userId) {
      const now = new Date().toISOString();
      const defaultProfile: UserProfile = {
        id: userId,
        email: authData.user.email || '',
        displayName: authData.user.user_metadata?.display_name || authData.user.email?.split('@')[0] || 'User',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        createdAt: now,
        updatedAt: now,
      };
      await supabase.from('users').upsert(mapUserToDb(defaultProfile));
      return defaultProfile;
    }
    return null;
  }

  return mapUserFromDb(data);
}

/**
 * Partially update a UserProfile record.
 */
export async function updateUserProfile(
  userId: string,
  data: Partial<Omit<UserProfile, 'id' | 'createdAt'>>,
): Promise<void> {
  const now = new Date().toISOString();
  const dbData = mapUserToDb({ ...data, updatedAt: now });

  const { error } = await supabase
    .from('users')
    .update(dbData)
    .eq('id', userId);

  if (error) {
    throw error;
  }
}
