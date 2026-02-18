import { db } from '../lib/firebase';
import { auth } from '../lib/firebase';
import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, writeBatch,
} from 'firebase/firestore';
import type {
  Follow, FollowHistory, UserBlock, FollowCounts,
  FollowRelationship, UserProfileWithFollowState,
} from '../types/database.types';
import { FriendService } from './friendService';

// ═══════════════════════════════════════════════════════
// Follow Service – Firestore only
// Collections: follows/{id}, follow_history/{id},
//              user_blocks/{id},
//              users/{uid}/notifications/{id}
// ═══════════════════════════════════════════════════════

function uid() {
  const u = auth.currentUser?.uid;
  if (!u) throw new Error('Not authenticated');
  return u;
}

// ─── Cross-hook event system ───

type ChangeCallback = () => void;
const changeListeners = new Set<ChangeCallback>();

export function subscribeToChanges(cb: ChangeCallback) {
  changeListeners.add(cb);
  return () => { changeListeners.delete(cb); };
}

function emitChange() {
  changeListeners.forEach((cb) => { try { cb(); } catch { /* */ } });
}

// ─── Follow History ───

async function logHistory(followerId: string, followingId: string, action: FollowHistory['action'], metadata?: Record<string, unknown>) {
  await addDoc(collection(db, 'follow_history'), {
    follower_id: followerId,
    following_id: followingId,
    action,
    metadata: metadata || null,
    created_at: new Date().toISOString(),
  });
}

// ─── Block helpers ───

async function isBlocked(userId1: string, userId2: string): Promise<boolean> {
  const q1 = query(collection(db, 'user_blocks'), where('blocker_id', '==', userId1), where('blocked_id', '==', userId2));
  const q2 = query(collection(db, 'user_blocks'), where('blocker_id', '==', userId2), where('blocked_id', '==', userId1));
  const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
  return !s1.empty || !s2.empty;
}

// ─── Follow CRUD ───

export async function followUser(targetId: string): Promise<Follow> {
  const id = uid();
  if (id === targetId) throw new Error('Cannot follow yourself');
  if (await isBlocked(id, targetId)) throw new Error('Cannot follow this user');

  // Already following?
  const existingQ = query(collection(db, 'follows'), where('follower_id', '==', id), where('following_id', '==', targetId));
  const existingSnap = await getDocs(existingQ);
  if (!existingSnap.empty) throw new Error('Already following or requested');

  // Check if target is private
  const targetProfile = await FriendService.getProfile(targetId);
  const initialStatus: Follow['status'] = targetProfile?.is_private ? 'requested' : 'accepted';

  // Check re-follow
  const reverseQ = query(collection(db, 'follows'), where('follower_id', '==', targetId), where('following_id', '==', id), where('status', '==', 'accepted'));
  const reverseSnap = await getDocs(reverseQ);
  const isRefollow = !reverseSnap.empty;

  const data = {
    follower_id: id,
    following_id: targetId,
    status: initialStatus,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const ref = await addDoc(collection(db, 'follows'), data);

  await logHistory(id, targetId, 'follow', { status: initialStatus, is_refollow: isRefollow });

  // Notification
  const myProfile = await FriendService.getProfile(id);
  const notifType = initialStatus === 'requested' ? 'follow_request' : (isRefollow ? 'refollow' : 'new_follower');
  const notifTitle = initialStatus === 'requested' ? 'New Follow Request' : (isRefollow ? 'Followed You Back!' : 'New Follower');
  const notifBody = initialStatus === 'requested'
    ? `${myProfile?.full_name || 'Someone'} wants to follow you`
    : (isRefollow ? `${myProfile?.full_name || 'Someone'} followed you back!` : `${myProfile?.full_name || 'Someone'} started following you`);

  await addDoc(collection(db, 'users', targetId, 'notifications'), {
    user_id: targetId, type: notifType, title: notifTitle, body: notifBody,
    data: { follow_id: ref.id, follower_id: id },
    read: false, created_at: new Date().toISOString(),
  });

  emitChange();
  return { id: ref.id, ...data } as Follow;
}

export async function unfollowUser(targetId: string): Promise<void> {
  const id = uid();
  const q = query(collection(db, 'follows'), where('follower_id', '==', id), where('following_id', '==', targetId));
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  await logHistory(id, targetId, 'unfollow');
  emitChange();
}

export async function acceptFollowRequest(followId: string): Promise<void> {
  const fSnap = await getDoc(doc(db, 'follows', followId));
  if (!fSnap.exists()) throw new Error('Follow not found');
  await updateDoc(doc(db, 'follows', followId), { status: 'accepted', updated_at: new Date().toISOString() });
  const f = fSnap.data();
  await logHistory(f.follower_id, f.following_id, 'accept');

  const myProfile = await FriendService.getProfile(uid());
  await addDoc(collection(db, 'users', f.follower_id, 'notifications'), {
    user_id: f.follower_id, type: 'follow_accepted', title: 'Follow Request Accepted',
    body: `${myProfile?.full_name || 'Someone'} accepted your follow request`,
    data: { follow_id: followId }, read: false, created_at: new Date().toISOString(),
  });
  emitChange();
}

export async function rejectFollowRequest(followId: string): Promise<void> {
  const fSnap = await getDoc(doc(db, 'follows', followId));
  if (!fSnap.exists()) throw new Error('Follow not found');
  const f = fSnap.data();
  await deleteDoc(doc(db, 'follows', followId));
  await logHistory(f.follower_id, f.following_id, 'reject');
  emitChange();
}

export async function cancelFollowRequest(targetId: string): Promise<void> {
  const id = uid();
  const q = query(collection(db, 'follows'), where('follower_id', '==', id), where('following_id', '==', targetId), where('status', '==', 'requested'));
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  await logHistory(id, targetId, 'cancel');
  emitChange();
}

export async function removeFollower(followerId: string): Promise<void> {
  const id = uid();
  const q = query(collection(db, 'follows'), where('follower_id', '==', followerId), where('following_id', '==', id));
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  await logHistory(followerId, id, 'remove_follower');
  emitChange();
}

export async function blockUser(targetId: string): Promise<void> {
  const id = uid();
  // Remove all follows between users
  const q1 = query(collection(db, 'follows'), where('follower_id', '==', id), where('following_id', '==', targetId));
  const q2 = query(collection(db, 'follows'), where('follower_id', '==', targetId), where('following_id', '==', id));
  const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
  const batch = writeBatch(db);
  [...s1.docs, ...s2.docs].forEach((d) => batch.delete(d.ref));
  await batch.commit();

  await addDoc(collection(db, 'user_blocks'), { blocker_id: id, blocked_id: targetId, created_at: new Date().toISOString() });
  await logHistory(id, targetId, 'block');
  emitChange();
}

export async function unblockUser(targetId: string): Promise<void> {
  const id = uid();
  const q = query(collection(db, 'user_blocks'), where('blocker_id', '==', id), where('blocked_id', '==', targetId));
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  await logHistory(id, targetId, 'unblock');
  emitChange();
}

// ─── Queries ───

export async function getFollowers(): Promise<Follow[]> {
  const id = uid();
  const q = query(collection(db, 'follows'), where('following_id', '==', id), where('status', '==', 'accepted'));
  const snap = await getDocs(q);
  const follows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Follow, 'id'>) })) as Follow[];
  const profileIds = follows.map((f) => f.follower_id);
  const profiles = await FriendService.getProfiles(profileIds);
  const map = new Map(profiles.map((p) => [p.id, p]));
  follows.forEach((f) => { 
    const profile = map.get(f.follower_id);
    if (profile) {
      if (!profile.id) profile.id = f.follower_id;
      f.follower = profile;
    }
  });
  return follows;
}

export async function getFollowing(): Promise<Follow[]> {
  const id = uid();
  const q = query(collection(db, 'follows'), where('follower_id', '==', id), where('status', '==', 'accepted'));
  const snap = await getDocs(q);
  const follows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Follow, 'id'>) })) as Follow[];
  const profileIds = follows.map((f) => f.following_id);
  const profiles = await FriendService.getProfiles(profileIds);
  const map = new Map(profiles.map((p) => [p.id, p]));
  follows.forEach((f) => { 
    const profile = map.get(f.following_id);
    if (profile) {
      if (!profile.id) profile.id = f.following_id;
      f.following = profile;
    }
  });
  return follows;
}

export async function getFollowRequests(): Promise<Follow[]> {
  const id = uid();
  const q = query(collection(db, 'follows'), where('following_id', '==', id), where('status', '==', 'requested'));
  const snap = await getDocs(q);
  const follows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Follow, 'id'>) })) as Follow[];
  const profileIds = follows.map((f) => f.follower_id);
  const profiles = await FriendService.getProfiles(profileIds);
  const map = new Map(profiles.map((p) => [p.id, p]));
  follows.forEach((f) => { 
    const profile = map.get(f.follower_id);
    if (profile) {
      if (!profile.id) profile.id = f.follower_id;
      f.follower = profile;
    }
  });
  return follows;
}

export async function getSentFollowRequests(): Promise<Follow[]> {
  const id = uid();
  const q = query(collection(db, 'follows'), where('follower_id', '==', id), where('status', '==', 'requested'));
  const snap = await getDocs(q);
  const follows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Follow, 'id'>) })) as Follow[];
  const profileIds = follows.map((f) => f.following_id);
  const profiles = await FriendService.getProfiles(profileIds);
  const map = new Map(profiles.map((p) => [p.id, p]));
  follows.forEach((f) => { 
    const profile = map.get(f.following_id);
    if (profile) {
      if (!profile.id) profile.id = f.following_id;
      f.following = profile;
    }
  });
  return follows;
}

export async function getFollowCounts(userId?: string): Promise<FollowCounts> {
  const id = userId || uid();
  const fersQ = query(collection(db, 'follows'), where('following_id', '==', id), where('status', '==', 'accepted'));
  const fingQ = query(collection(db, 'follows'), where('follower_id', '==', id), where('status', '==', 'accepted'));
  const [fersSnap, fingSnap] = await Promise.all([getDocs(fersQ), getDocs(fingQ)]);
  return { followers: fersSnap.size, following: fingSnap.size };
}

export async function getFollowRelationship(targetId: string): Promise<FollowRelationship> {
  const id = uid();
  if (id === targetId) return 'none';
  if (await isBlocked(id, targetId)) return 'blocked';

  const meToTarget = query(collection(db, 'follows'), where('follower_id', '==', id), where('following_id', '==', targetId));
  const targetToMe = query(collection(db, 'follows'), where('follower_id', '==', targetId), where('following_id', '==', id));
  const [s1, s2] = await Promise.all([getDocs(meToTarget), getDocs(targetToMe)]);

  const iFollow = s1.docs.find((d) => d.data().status === 'accepted');
  const theyFollow = s2.docs.find((d) => d.data().status === 'accepted');
  const iRequested = s1.docs.find((d) => d.data().status === 'requested');

  if (iFollow && theyFollow) return 'mutual';
  if (iFollow) return 'following';
  if (theyFollow) return 'follower';
  if (iRequested) return 'requested';
  return 'none';
}

export async function getBlockedUsers(): Promise<UserBlock[]> {
  const id = uid();
  const q = query(collection(db, 'user_blocks'), where('blocker_id', '==', id));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<UserBlock, 'id'>) })) as UserBlock[];
}

export async function getUsersWithFollowState(userIds: string[]): Promise<UserProfileWithFollowState[]> {
  if (userIds.length === 0) return [];
  const profiles = await FriendService.getProfiles(userIds);
  const results: UserProfileWithFollowState[] = [];
  for (const p of profiles) {
    const rel = await getFollowRelationship(p.id);
    results.push({ ...p, followRelationship: rel, isMutual: rel === 'mutual' });
  }
  return results;
}

export async function getFollowBackSuggestions(): Promise<Follow[]> {
  const id = uid();
  // People following me that I don't follow back
  const followersQ = query(collection(db, 'follows'), where('following_id', '==', id), where('status', '==', 'accepted'));
  const followingQ = query(collection(db, 'follows'), where('follower_id', '==', id), where('status', '==', 'accepted'));
  const [fSnap, gSnap] = await Promise.all([getDocs(followersQ), getDocs(followingQ)]);
  const followingSet = new Set(gSnap.docs.map((d) => d.data().following_id));
  const suggestions = fSnap.docs
    .filter((d) => !followingSet.has(d.data().follower_id))
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Follow, 'id'>) })) as Follow[];

  const profileIds = suggestions.map((f) => f.follower_id);
  const profiles = await FriendService.getProfiles(profileIds);
  const map = new Map(profiles.map((p) => [p.id, p]));
  suggestions.forEach((f) => { 
    const profile = map.get(f.follower_id);
    if (profile) {
      // Ensure id is set
      if (!profile.id) profile.id = f.follower_id;
      f.follower = profile;
    }
  });
  return suggestions;
}

export const FollowService = {
  followUser, unfollowUser, acceptFollowRequest, rejectFollowRequest,
  cancelFollowRequest, removeFollower, blockUser, unblockUser,
  getFollowers, getFollowing, getFollowRequests, getSentFollowRequests,
  getFollowCounts, getFollowRelationship, getBlockedUsers,
  getUsersWithFollowState, getFollowBackSuggestions,
  subscribeToChanges,
};
