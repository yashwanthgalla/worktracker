import { supabase } from '../lib/supabase';
import type { UserProfile, Friendship } from '../types/database.types';

// ═══════════════════════════════════════════
// Friend Service
// Handles user search, friend requests, and friendships
// ═══════════════════════════════════════════

/** Ensure current user has a profile row */
export async function ensureProfile(): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: existing } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (existing) return existing as UserProfile;

  const profile = {
    id: user.id,
    email: user.email!,
    full_name: user.user_metadata?.full_name || user.email!.split('@')[0],
    username: user.user_metadata?.username || null,
    avatar_url: user.user_metadata?.avatar_url || null,
    status: 'online' as const,
    last_seen: new Date().toISOString(),
    is_private: false,
    bio: null as string | null,
  };

  const { data, error } = await supabase
    .from('user_profiles')
    .upsert(profile)
    .select()
    .single();

  if (error) {
    console.warn('Failed to create profile:', error.message);
    return null;
  }
  return data as UserProfile;
}

/** Update current user's online status */
export async function updateOnlineStatus(status: 'online' | 'offline' | 'away' | 'busy'): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('user_profiles')
    .update({ status, last_seen: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', user.id);
}

/** Search users by email or name (not self, not already friends) */
export async function searchUsers(query: string): Promise<UserProfile[]> {
  if (!query || query.length < 2) return [];

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Ensure the current user's profile exists before searching
  await ensureProfile();

  const trimmed = query.trim();

  // Try exact email match first (most common use case)
  if (trimmed.includes('@')) {
    const { data: exactMatch } = await supabase
      .from('user_profiles')
      .select('*')
      .neq('id', user.id)
      .ilike('email', trimmed)
      .limit(1);

    if (exactMatch && exactMatch.length > 0) {
      return exactMatch as UserProfile[];
    }
  }

  // Search by email, username, and name separately
  const [emailRes, usernameRes, nameRes] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('*')
      .neq('id', user.id)
      .ilike('email', `%${trimmed}%`)
      .limit(10),
    supabase
      .from('user_profiles')
      .select('*')
      .neq('id', user.id)
      .ilike('username', `%${trimmed}%`)
      .limit(10),
    supabase
      .from('user_profiles')
      .select('*')
      .neq('id', user.id)
      .ilike('full_name', `%${trimmed}%`)
      .limit(10),
  ]);

  if (emailRes.error) console.warn('Email search error:', emailRes.error.message);
  if (usernameRes.error) console.warn('Username search error:', usernameRes.error.message);
  if (nameRes.error) console.warn('Name search error:', nameRes.error.message);

  // Merge and deduplicate results
  const merged = new Map<string, UserProfile>();
  [...(emailRes.data || []), ...(usernameRes.data || []), ...(nameRes.data || [])].forEach((u) => {
    const profile = u as UserProfile;
    merged.set(profile.id, profile);
  });
  return Array.from(merged.values());
}

/** Send a friend request */
export async function sendFriendRequest(addresseeId: string): Promise<Friendship | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Check if friendship already exists
  const { data: existing } = await supabase
    .from('friendships')
    .select('*')
    .or(`and(requester_id.eq.${user.id},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${user.id})`)
    .maybeSingle();

  if (existing) return existing as Friendship;

  const { data, error } = await supabase
    .from('friendships')
    .insert({ requester_id: user.id, addressee_id: addresseeId })
    .select()
    .single();

  if (error) {
    console.warn('Send friend request error:', error.message);
    return null;
  }

  // Create notification for addressee
  await supabase.from('realtime_notifications').insert({
    user_id: addresseeId,
    type: 'friend_request',
    title: 'New friend request',
    body: `You have a new friend request!`,
    data: { friendship_id: data.id, from_user_id: user.id },
  });

  return data as Friendship;
}

/** Accept a friend request */
export async function acceptFriendRequest(friendshipId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data, error } = await supabase
    .from('friendships')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', friendshipId)
    .eq('addressee_id', user.id)
    .select()
    .single();

  if (error) {
    console.warn('Accept friend error:', error.message);
    return;
  }

  // Notify the requester
  if (data) {
    await supabase.from('realtime_notifications').insert({
      user_id: data.requester_id,
      type: 'friend_accepted',
      title: 'Friend request accepted!',
      body: `Your friend request was accepted.`,
      data: { friendship_id: data.id, by_user_id: user.id },
    });
  }
}

/** Reject a friend request */
export async function rejectFriendRequest(friendshipId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('friendships')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', friendshipId)
    .eq('addressee_id', user.id);
}

/** Remove a friend */
export async function removeFriend(friendshipId: string): Promise<void> {
  await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId);
}

/** Get all friends (accepted friendships) */
export async function getFriends(): Promise<Array<Friendship & { friend: UserProfile }>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('friendships')
    .select('*, requester:user_profiles!friendships_requester_id_fkey(*), addressee:user_profiles!friendships_addressee_id_fkey(*)')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

  if (error) {
    console.warn('Get friends error:', error.message);
    return [];
  }

  return (data || []).map((f: Record<string, unknown> & { requester_id: string; addressee: unknown; requester: unknown }) => ({
    ...f,
    friend: f.requester_id === user.id ? f.addressee : f.requester,
  })) as Array<Friendship & { friend: UserProfile }>;
}

/** Get pending friend requests (received) */
export async function getPendingRequests(): Promise<Array<Friendship & { requester: UserProfile }>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('friendships')
    .select('*, requester:user_profiles!friendships_requester_id_fkey(*)')
    .eq('addressee_id', user.id)
    .eq('status', 'pending');

  if (error) {
    console.warn('Get pending requests error:', error.message);
    return [];
  }

  return (data || []) as Array<Friendship & { requester: UserProfile }>;
}

/** Get sent friend requests */
export async function getSentRequests(): Promise<Array<Friendship & { addressee: UserProfile }>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('friendships')
    .select('*, addressee:user_profiles!friendships_addressee_id_fkey(*)')
    .eq('requester_id', user.id)
    .eq('status', 'pending');

  if (error) {
    console.warn('Get sent requests error:', error.message);
    return [];
  }

  return (data || []) as Array<Friendship & { addressee: UserProfile }>;
}

export const FriendService = {
  ensureProfile,
  updateOnlineStatus,
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  getFriends,
  getPendingRequests,
  getSentRequests,
};
