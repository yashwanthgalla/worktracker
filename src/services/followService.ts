import { supabase } from '../lib/supabase';
import type { Follow, UserProfile, FollowCounts, FollowRelationship, UserBlock } from '../types/database.types';

// ═══════════════════════════════════════════
// Follow Service
// Instagram-style follow/unfollow/block system
// ═══════════════════════════════════════════

async function getAuthUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

// ─── Local change notification (cross-hook sync) ───

const changeCallbacks = new Set<() => void>();

export function subscribeToChanges(cb: () => void): () => void {
  changeCallbacks.add(cb);
  return () => { changeCallbacks.delete(cb); };
}

function emitChange() {
  setTimeout(() => {
    changeCallbacks.forEach(cb => { try { cb(); } catch { /* ignore */ } });
  }, 100);
}

// ─── Follow / Request ───

/**
 * Follow a user. If the target is private, creates a 'requested' follow.
 * If public, auto-accepts. Prevents self-follow, duplicate requests, and blocked users.
 */
export async function followUser(targetUserId: string): Promise<Follow | null> {
  const userId = await getAuthUserId();
  if (!userId) throw new Error('You must be logged in to follow users');
  if (userId === targetUserId) throw new Error('You cannot follow yourself');

  // Check if blocked
  const blocked = await isBlocked(userId, targetUserId);
  if (blocked) throw new Error('Unable to follow this user');

  // Check for existing follow
  const { data: existing } = await supabase
    .from('follows')
    .select('*')
    .eq('follower_id', userId)
    .eq('following_id', targetUserId)
    .maybeSingle();

  // If already following or requested, return existing
  if (existing && (existing.status === 'accepted' || existing.status === 'requested')) {
    return existing as Follow;
  }

  // If previously rejected, delete old row to allow re-follow
  if (existing && existing.status === 'rejected') {
    await supabase.from('follows').delete().eq('id', existing.id);
  }

  // Check if target is private (use select('*') to avoid error when is_private column missing)
  const { data: targetProfile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', targetUserId)
    .single();

  if (profileError || !targetProfile) {
    throw new Error('Could not find the target user profile.');
  }

  const isPrivate = (targetProfile as Record<string, unknown>).is_private === true;
  const status = isPrivate ? 'requested' : 'accepted';

  const { data, error } = await supabase
    .from('follows')
    .insert({ follower_id: userId, following_id: targetUserId, status })
    .select()
    .single();

  if (error) {
    throw new Error(
      error.message.includes('does not exist')
        ? 'Follow system tables not found. Please run migration 006_follow_system.sql in your Supabase SQL editor.'
        : `Follow failed: ${error.message}`
    );
  }

  // Log history
  await supabase.from('follow_history').insert({
    follower_id: userId,
    following_id: targetUserId,
    action: 'follow',
    metadata: { status },
  });

  // Get current user profile for notification
  const { data: myProfile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  const myName = myProfile?.full_name || myProfile?.username || 'Someone';

  if (isPrivate) {
    // Send follow request notification
    await supabase.from('realtime_notifications').insert({
      user_id: targetUserId,
      type: 'follow_request',
      title: 'New follow request',
      body: `${myName} wants to follow you`,
      data: { follow_id: data.id, from_user_id: userId },
    }).then(({ error: notifErr }) => {
      if (notifErr) console.warn('Notification insert failed:', notifErr.message);
    });
  } else {
    // Auto-accepted: notify as new follower
    await supabase.from('realtime_notifications').insert({
      user_id: targetUserId,
      type: 'new_follower',
      title: 'New follower',
      body: `${myName} started following you`,
      data: { follow_id: data.id, from_user_id: userId },
    }).then(({ error: notifErr }) => {
      if (notifErr) console.warn('Notification insert failed:', notifErr.message);
    });
  }

  emitChange();
  return data as Follow;
}

// ─── Accept Follow Request ───

export async function acceptFollowRequest(followId: string): Promise<void> {
  const userId = await getAuthUserId();
  if (!userId) return;

  const { data, error } = await supabase
    .from('follows')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', followId)
    .eq('following_id', userId) // Only the target can accept
    .eq('status', 'requested')
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Could not accept follow request');
  }

  emitChange();

  // Log history
  await supabase.from('follow_history').insert({
    follower_id: data.follower_id,
    following_id: userId,
    action: 'accept',
  });

  // Get current user profile for notification
  const { data: myProfile } = await supabase
    .from('user_profiles')
    .select('full_name, username')
    .eq('id', userId)
    .single();

  const myName = myProfile?.full_name || myProfile?.username || 'Someone';

  // Notify the follower that their request was accepted
  await supabase.from('realtime_notifications').insert({
    user_id: data.follower_id,
    type: 'follow_accepted',
    title: 'Follow request accepted',
    body: `${myName} accepted your follow request`,
    data: { follow_id: data.id, by_user_id: userId },
  });
}

// ─── Reject Follow Request ───

export async function rejectFollowRequest(followId: string): Promise<void> {
  const userId = await getAuthUserId();
  if (!userId) return;

  const { data } = await supabase
    .from('follows')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', followId)
    .eq('following_id', userId)
    .eq('status', 'requested')
    .select()
    .single();

  if (data) {
    emitChange();
    await supabase.from('follow_history').insert({
      follower_id: data.follower_id,
      following_id: userId,
      action: 'reject',
    });
  }
}

// ─── Cancel Sent Follow Request ───

export async function cancelFollowRequest(followId: string): Promise<void> {
  const userId = await getAuthUserId();
  if (!userId) return;

  const { data } = await supabase
    .from('follows')
    .select('*')
    .eq('id', followId)
    .eq('follower_id', userId)
    .eq('status', 'requested')
    .single();

  if (data) {
    await supabase.from('follows').delete().eq('id', followId);
    emitChange();
    await supabase.from('follow_history').insert({
      follower_id: userId,
      following_id: data.following_id,
      action: 'cancel',
    });
  }
}

// ─── Unfollow ───

export async function unfollowUser(targetUserId: string): Promise<void> {
  const userId = await getAuthUserId();
  if (!userId) return;

  await supabase
    .from('follows')
    .delete()
    .eq('follower_id', userId)
    .eq('following_id', targetUserId);

  emitChange();

  await supabase.from('follow_history').insert({
    follower_id: userId,
    following_id: targetUserId,
    action: 'unfollow',
  });
}

// ─── Remove Follower ───

export async function removeFollower(followerUserId: string): Promise<void> {
  const userId = await getAuthUserId();
  if (!userId) return;

  await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerUserId)
    .eq('following_id', userId);

  emitChange();

  await supabase.from('follow_history').insert({
    follower_id: followerUserId,
    following_id: userId,
    action: 'remove_follower',
  });
}

// ─── Block User ───

export async function blockUser(targetUserId: string): Promise<void> {
  const userId = await getAuthUserId();
  if (!userId || userId === targetUserId) return;

  // Remove any existing follow relationships in both directions
  await supabase.from('follows').delete()
    .or(`and(follower_id.eq.${userId},following_id.eq.${targetUserId}),and(follower_id.eq.${targetUserId},following_id.eq.${userId})`);

  // Insert block
  const { error } = await supabase.from('user_blocks').insert({
    blocker_id: userId,
    blocked_id: targetUserId,
  });

  if (!error) {
    emitChange();
    await supabase.from('follow_history').insert({
      follower_id: userId,
      following_id: targetUserId,
      action: 'block',
    });
  }
}

// ─── Unblock User ───

export async function unblockUser(targetUserId: string): Promise<void> {
  const userId = await getAuthUserId();
  if (!userId) return;

  await supabase.from('user_blocks').delete()
    .eq('blocker_id', userId)
    .eq('blocked_id', targetUserId);

  emitChange();

  await supabase.from('follow_history').insert({
    follower_id: userId,
    following_id: targetUserId,
    action: 'unblock',
  });
}

// ─── Check Block Status ───

export async function isBlocked(userId: string, targetUserId: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_blocks')
    .select('id')
    .or(`and(blocker_id.eq.${userId},blocked_id.eq.${targetUserId}),and(blocker_id.eq.${targetUserId},blocked_id.eq.${userId})`)
    .maybeSingle();

  return !!data;
}

// ─── Get Follow Relationship ───

export async function getFollowRelationship(targetUserId: string): Promise<{
  relationship: FollowRelationship;
  outgoingFollow: Follow | null;
  incomingFollow: Follow | null;
}> {
  const userId = await getAuthUserId();
  if (!userId || userId === targetUserId) {
    return { relationship: 'none', outgoingFollow: null, incomingFollow: null };
  }

  // Check blocked
  const blocked = await isBlocked(userId, targetUserId);
  if (blocked) {
    return { relationship: 'blocked', outgoingFollow: null, incomingFollow: null };
  }

  // Get both direction follows
  const { data: follows } = await supabase
    .from('follows')
    .select('*')
    .or(`and(follower_id.eq.${userId},following_id.eq.${targetUserId}),and(follower_id.eq.${targetUserId},following_id.eq.${userId})`)
    .in('status', ['requested', 'accepted']);

  const outgoing = follows?.find(
    (f) => f.follower_id === userId && f.following_id === targetUserId
  ) as Follow | undefined;
  const incoming = follows?.find(
    (f) => f.follower_id === targetUserId && f.following_id === userId
  ) as Follow | undefined;

  let relationship: FollowRelationship = 'none';

  if (outgoing?.status === 'requested') {
    relationship = 'requested';
  } else if (outgoing?.status === 'accepted' && incoming?.status === 'accepted') {
    relationship = 'mutual';
  } else if (outgoing?.status === 'accepted') {
    relationship = 'following';
  } else if (incoming?.status === 'accepted') {
    relationship = 'follower';
  }

  return {
    relationship,
    outgoingFollow: outgoing || null,
    incomingFollow: incoming || null,
  };
}

// ─── Get Followers List (paginated) ───

export async function getFollowers(
  userId: string,
  page = 0,
  pageSize = 50
): Promise<{ data: Follow[]; count: number }> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('follows')
    .select('*, follower:user_profiles!follows_follower_id_fkey(*)', { count: 'exact' })
    .eq('following_id', userId)
    .eq('status', 'accepted')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.warn('Get followers error:', error.message);
    return { data: [], count: 0 };
  }

  return { data: (data || []) as Follow[], count: count || 0 };
}

// ─── Get Following List (paginated) ───

export async function getFollowing(
  userId: string,
  page = 0,
  pageSize = 50
): Promise<{ data: Follow[]; count: number }> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('follows')
    .select('*, following:user_profiles!follows_following_id_fkey(*)', { count: 'exact' })
    .eq('follower_id', userId)
    .eq('status', 'accepted')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.warn('Get following error:', error.message);
    return { data: [], count: 0 };
  }

  return { data: (data || []) as Follow[], count: count || 0 };
}

// ─── Get Pending Follow Requests (received) ───

export async function getPendingFollowRequests(): Promise<Follow[]> {
  const userId = await getAuthUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('follows')
    .select('*, follower:user_profiles!follows_follower_id_fkey(*)')
    .eq('following_id', userId)
    .eq('status', 'requested')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Get pending follow requests error:', error.message);
    return [];
  }

  return (data || []) as Follow[];
}

// ─── Get Sent Follow Requests ───

export async function getSentFollowRequests(): Promise<Follow[]> {
  const userId = await getAuthUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('follows')
    .select('*, following:user_profiles!follows_following_id_fkey(*)')
    .eq('follower_id', userId)
    .eq('status', 'requested')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Get sent follow requests error:', error.message);
    return [];
  }

  return (data || []) as Follow[];
}

// ─── Get Follow Counts ───

export async function getFollowCounts(userId: string): Promise<FollowCounts> {
  const [{ count: followers }, { count: following }] = await Promise.all([
    supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('following_id', userId)
      .eq('status', 'accepted'),
    supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('follower_id', userId)
      .eq('status', 'accepted'),
  ]);

  return {
    followers: followers || 0,
    following: following || 0,
  };
}

// ─── Get Blocked Users ───

export async function getBlockedUsers(): Promise<UserBlock[]> {
  const userId = await getAuthUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('user_blocks')
    .select('*')
    .eq('blocker_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Get blocked users error:', error.message);
    return [];
  }

  return (data || []) as UserBlock[];
}

// ─── Check if target user follows me ───

export async function doesUserFollowMe(targetUserId: string): Promise<boolean> {
  const userId = await getAuthUserId();
  if (!userId) return false;

  const { data } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', targetUserId)
    .eq('following_id', userId)
    .eq('status', 'accepted')
    .maybeSingle();

  return !!data;
}

// ─── Toggle Account Privacy ───

export async function toggleAccountPrivacy(isPrivate: boolean): Promise<void> {
  const userId = await getAuthUserId();
  if (!userId) return;

  await supabase
    .from('user_profiles')
    .update({ is_private: isPrivate, updated_at: new Date().toISOString() })
    .eq('id', userId);
}

// ─── Update Bio ───

export async function updateBio(bio: string): Promise<void> {
  const userId = await getAuthUserId();
  if (!userId) return;

  await supabase
    .from('user_profiles')
    .update({ bio, updated_at: new Date().toISOString() })
    .eq('id', userId);
}

// ─── Get User Profile ───

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) return null;
  return data as UserProfile;
}

// ─── Search Users (for follow) ───

export async function searchUsersForFollow(query: string): Promise<UserProfile[]> {
  if (!query || query.length < 2) return [];

  const userId = await getAuthUserId();
  if (!userId) return [];

  const trimmed = query.trim();

  const [usernameRes, nameRes, emailRes] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('*')
      .neq('id', userId)
      .ilike('username', `%${trimmed}%`)
      .limit(10),
    supabase
      .from('user_profiles')
      .select('*')
      .neq('id', userId)
      .ilike('full_name', `%${trimmed}%`)
      .limit(10),
    supabase
      .from('user_profiles')
      .select('*')
      .neq('id', userId)
      .ilike('email', `%${trimmed}%`)
      .limit(10),
  ]);

  // Merge and deduplicate
  const merged = new Map<string, UserProfile>();
  [...(usernameRes.data || []), ...(nameRes.data || []), ...(emailRes.data || [])].forEach((u) => {
    merged.set(u.id, u as UserProfile);
  });

  // Filter out blocked users
  const { data: blocks } = await supabase
    .from('user_blocks')
    .select('blocker_id, blocked_id')
    .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);

  const blockedIds = new Set<string>();
  (blocks || []).forEach((b) => {
    if (b.blocker_id === userId) blockedIds.add(b.blocked_id);
    if (b.blocked_id === userId) blockedIds.add(b.blocker_id);
  });

  return Array.from(merged.values()).filter((u) => !blockedIds.has(u.id));
}

// ─── Get Follow-Back Suggestions (followers you don't follow back) ───

export async function getFollowBackSuggestions(): Promise<Follow[]> {
  const userId = await getAuthUserId();
  if (!userId) return [];

  // Get all accepted followers (people who follow me)
  const { data: followers } = await supabase
    .from('follows')
    .select('*, follower:user_profiles!follows_follower_id_fkey(*)')
    .eq('following_id', userId)
    .eq('status', 'accepted')
    .order('created_at', { ascending: false });

  if (!followers || followers.length === 0) return [];

  // Get all people I follow
  const { data: following } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)
    .eq('status', 'accepted');

  const followingIds = new Set((following || []).map((f) => f.following_id));

  // Return followers that I don't follow back
  return (followers as Follow[]).filter((f) => !followingIds.has(f.follower_id));
}

// ─── Export as namespace ───

export const FollowService = {
  subscribeToChanges,
  followUser,
  acceptFollowRequest,
  rejectFollowRequest,
  cancelFollowRequest,
  unfollowUser,
  removeFollower,
  blockUser,
  unblockUser,
  isBlocked,
  getFollowRelationship,
  getFollowers,
  getFollowing,
  getPendingFollowRequests,
  getSentFollowRequests,
  getFollowCounts,
  getBlockedUsers,
  doesUserFollowMe,
  toggleAccountPrivacy,
  updateBio,
  getUserProfile,
  searchUsersForFollow,
  getFollowBackSuggestions,
};
