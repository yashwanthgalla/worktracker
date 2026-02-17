import { supabase } from '../lib/supabase';

// Sign up with email and password
export async function signUp(email: string, password: string, fullName?: string, username?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        username: username,
      },
    },
  });

  if (error) throw error;

  // Also upsert user_profiles to set username immediately
  if (data.user && username) {
    await supabase.from('user_profiles').upsert({
      id: data.user.id,
      email,
      full_name: fullName || email.split('@')[0],
      username,
      status: 'online',
      last_seen: new Date().toISOString(),
    });
  }

  return data;
}

// Sign in with email and password
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

// Sign out
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Get current session
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}

// Get current user
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

// Reset password
export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  if (error) throw error;
}

// Update password
export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) throw error;
}

// Update user profile
export async function updateProfile(updates: Record<string, unknown>) {
  const { error } = await supabase.auth.updateUser({
    data: updates,
  });

  if (error) throw error;
}

// Listen to auth state changes
export function onAuthStateChange(callback: (user: unknown) => void) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      callback(session?.user || null);
    }
  );

  return () => subscription.unsubscribe();
}

// Re-export as namespace for backward compat
export const AuthService = {
  signUp,
  signIn,
  signOut,
  getSession,
  getCurrentUser,
  resetPassword,
  updatePassword,
  updateProfile,
  onAuthStateChange,
};
