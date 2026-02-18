import { db } from '../lib/firebase';
import { auth } from '../lib/firebase';
import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, setDoc,
} from 'firebase/firestore';
import type { UserProfile, Friendship } from '../types/database.types';

// ═══════════════════════════════════════════════════════
// Friend Service – Firestore only
// Collections: user_profiles/{uid}, friendships/{id},
//              users/{uid}/notifications/{id}
// ═══════════════════════════════════════════════════════

function uid() {
  const u = auth.currentUser?.uid;
  if (!u) throw new Error('Not authenticated');
  return u;
}

// ─── Profile helpers ───

export async function ensureProfile(): Promise<UserProfile | null> {
  const user = auth.currentUser;
  if (!user) return null;
  const ref = doc(db, 'user_profiles', user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await setDoc(ref, { status: 'online', last_seen: new Date().toISOString(), updated_at: new Date().toISOString() }, { merge: true });
    return snap.data() as UserProfile;
  }
  const profile: UserProfile = {
    id: user.uid,
    email: user.email || '',
    full_name: user.displayName || user.email?.split('@')[0] || '',
    username: null,
    avatar_url: user.photoURL || null,
    status: 'online',
    last_seen: new Date().toISOString(),
    is_private: false,
    bio: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  await setDoc(ref, profile);
  return profile;
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'user_profiles', userId));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function getProfiles(userIds: string[]): Promise<UserProfile[]> {
  if (userIds.length === 0) return [];
  const profiles: UserProfile[] = [];
  const foundIds = new Set<string>();
  // Firestore doesn't support `in` for >30 items, chunk
  const chunks: string[][] = [];
  for (let i = 0; i < userIds.length; i += 30) chunks.push(userIds.slice(i, i + 30));
  for (const chunk of chunks) {
    const q = query(collection(db, 'user_profiles'), where('__name__', 'in', chunk));
    const snap = await getDocs(q);
    snap.docs.forEach((d) => {
      const p = d.data() as UserProfile;
      // Ensure id field is set
      if (!p.id) p.id = d.id;
      foundIds.add(p.id);
      profiles.push(p);
    });
  }
  // Create fallback profiles for users not found in user_profiles
  for (const id of userIds) {
    if (!foundIds.has(id)) {
      profiles.push({
        id,
        email: '',
        username: null,
        full_name: null,
        avatar_url: null,
        status: 'offline',
        last_seen: new Date().toISOString(),
        is_private: false,
        bio: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }
  return profiles;
}

export async function searchUsers(searchTerm: string): Promise<UserProfile[]> {
  const term = searchTerm.toLowerCase().trim();
  if (!term) return [];
  const currentId = uid();

  // Firestore doesn't support ilike – fetch all profiles and filter client-side
  // For large user bases this should be replaced with Algolia / Typesense
  const snap = await getDocs(collection(db, 'user_profiles'));
  const results: UserProfile[] = [];
  snap.docs.forEach((d) => {
    if (d.id === currentId) return;
    const p = d.data() as UserProfile;
    // Ensure we have the id field
    if (!p.id) p.id = d.id;
    const match =
      (p.full_name?.toLowerCase().includes(term)) ||
      (p.username?.toLowerCase().includes(term)) ||
      (p.email?.toLowerCase().includes(term));
    if (match) results.push(p);
  });
  return results.slice(0, 20);
}

// ─── Friendship CRUD ───

export async function getFriends(): Promise<Friendship[]> {
  const id = uid();
  // Two queries: requester or addressee
  const q1 = query(collection(db, 'friendships'), where('requester_id', '==', id), where('status', '==', 'accepted'));
  const q2 = query(collection(db, 'friendships'), where('addressee_id', '==', id), where('status', '==', 'accepted'));
  const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
  const friendships: Friendship[] = [];
  const seen = new Set<string>();
  for (const d of [...s1.docs, ...s2.docs]) {
    if (seen.has(d.id)) continue;
    seen.add(d.id);
    friendships.push({ id: d.id, ...(d.data() as Omit<Friendship, 'id'>) });
  }

  // Attach profiles
  const profileIds = new Set<string>();
  friendships.forEach((f) => { profileIds.add(f.requester_id); profileIds.add(f.addressee_id); });
  const profiles = await getProfiles([...profileIds]);
  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  friendships.forEach((f) => { f.requester = profileMap.get(f.requester_id); f.addressee = profileMap.get(f.addressee_id); });
  return friendships;
}

export async function getPendingRequests(): Promise<Friendship[]> {
  const id = uid();
  const q = query(collection(db, 'friendships'), where('addressee_id', '==', id), where('status', '==', 'pending'));
  const snap = await getDocs(q);
  const friendships: Friendship[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Friendship, 'id'>) }));
  const profileIds = friendships.map((f) => f.requester_id);
  const profiles = await getProfiles(profileIds);
  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  friendships.forEach((f) => { f.requester = profileMap.get(f.requester_id); });
  return friendships;
}

export async function getSentRequests(): Promise<Friendship[]> {
  const id = uid();
  const q = query(collection(db, 'friendships'), where('requester_id', '==', id), where('status', '==', 'pending'));
  const snap = await getDocs(q);
  const friendships: Friendship[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Friendship, 'id'>) }));
  const profileIds = friendships.map((f) => f.addressee_id);
  const profiles = await getProfiles(profileIds);
  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  friendships.forEach((f) => { f.addressee = profileMap.get(f.addressee_id); });
  return friendships;
}

export async function sendFriendRequest(addresseeId: string): Promise<Friendship> {
  const id = uid();
  // Check for existing
  const q1 = query(collection(db, 'friendships'), where('requester_id', '==', id), where('addressee_id', '==', addresseeId));
  const q2 = query(collection(db, 'friendships'), where('requester_id', '==', addresseeId), where('addressee_id', '==', id));
  const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
  if (!s1.empty || !s2.empty) throw new Error('Friendship already exists');

  const data = {
    requester_id: id,
    addressee_id: addresseeId,
    status: 'pending' as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const ref = await addDoc(collection(db, 'friendships'), data);

  // Notification
  const myProfile = await getProfile(id);
  await addDoc(collection(db, 'users', addresseeId, 'notifications'), {
    user_id: addresseeId,
    type: 'friend_request',
    title: 'New Friend Request',
    body: `${myProfile?.full_name || 'Someone'} sent you a friend request`,
    data: { friendship_id: ref.id, requester_id: id },
    read: false,
    created_at: new Date().toISOString(),
  });

  return { id: ref.id, ...data };
}

export async function acceptFriendRequest(friendshipId: string): Promise<void> {
  await updateDoc(doc(db, 'friendships', friendshipId), { status: 'accepted', updated_at: new Date().toISOString() });

  const snap = await getDoc(doc(db, 'friendships', friendshipId));
  if (snap.exists()) {
    const f = snap.data();
    const myProfile = await getProfile(uid());
    await addDoc(collection(db, 'users', f.requester_id, 'notifications'), {
      user_id: f.requester_id,
      type: 'friend_accepted',
      title: 'Friend Request Accepted',
      body: `${myProfile?.full_name || 'Someone'} accepted your friend request`,
      data: { friendship_id: friendshipId },
      read: false,
      created_at: new Date().toISOString(),
    });
  }
}

export async function rejectFriendRequest(friendshipId: string): Promise<void> {
  await updateDoc(doc(db, 'friendships', friendshipId), { status: 'rejected', updated_at: new Date().toISOString() });
}

export async function removeFriend(friendshipId: string): Promise<void> {
  await deleteDoc(doc(db, 'friendships', friendshipId));
}

export async function updateOnlineStatus(status: 'online' | 'offline'): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const ref = doc(db, 'user_profiles', user.uid);
  await setDoc(ref, { status, last_seen: new Date().toISOString(), updated_at: new Date().toISOString() }, { merge: true });
}

export const FriendService = {
  ensureProfile, getProfile, getProfiles, searchUsers,
  getFriends, getPendingRequests, getSentRequests,
  sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend,
  updateOnlineStatus,
};
