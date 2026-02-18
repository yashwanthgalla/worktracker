import { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/firebase';
import { auth } from '../lib/firebase';
import {
  collection, query, where, getDocs,
} from 'firebase/firestore';
import { FollowService } from '../services/followService';
import { FriendService } from '../services/friendService';
import type { Follow, FollowCounts, FollowRelationship, UserProfile } from '../types/database.types';

// ═══════════════════════════════════════════════════════
// Follow hooks – Firestore only
// ═══════════════════════════════════════════════════════

function uid() { return auth.currentUser?.uid ?? null; }

// ─── useFollow ───
// For a single target user – returns relationship + actions

export function useFollow(targetUserId: string | null) {
  const [relationship, setRelationship] = useState<FollowRelationship>('none');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const userId = uid();

  const refresh = useCallback(async () => {
    if (!userId || !targetUserId || userId === targetUserId) { setRelationship('none'); setLoading(false); return; }
    try {
      const rel = await FollowService.getFollowRelationship(targetUserId);
      setRelationship(rel);
    } catch { setRelationship('none'); }
    setLoading(false);
  }, [userId, targetUserId]);

  useEffect(() => { refresh(); }, [refresh]);

  // Listen for cross-hook changes
  useEffect(() => {
    const unsub = FollowService.subscribeToChanges(() => refresh());
    return unsub;
  }, [refresh]);

  const follow = useCallback(async () => {
    if (!targetUserId) return;
    setActionLoading(true);
    try { await FollowService.followUser(targetUserId); await refresh(); } finally { setActionLoading(false); }
  }, [targetUserId, refresh]);

  const unfollow = useCallback(async () => {
    if (!targetUserId) return;
    setActionLoading(true);
    try { await FollowService.unfollowUser(targetUserId); await refresh(); } finally { setActionLoading(false); }
  }, [targetUserId, refresh]);

  const cancelRequest = useCallback(async () => {
    if (!targetUserId) return;
    setActionLoading(true);
    try { await FollowService.cancelFollowRequest(targetUserId); await refresh(); } finally { setActionLoading(false); }
  }, [targetUserId, refresh]);

  const block = useCallback(async () => {
    if (!targetUserId) return;
    setActionLoading(true);
    try { await FollowService.blockUser(targetUserId); await refresh(); } finally { setActionLoading(false); }
  }, [targetUserId, refresh]);

  const unblock = useCallback(async () => {
    if (!targetUserId) return;
    setActionLoading(true);
    try { await FollowService.unblockUser(targetUserId); await refresh(); } finally { setActionLoading(false); }
  }, [targetUserId, refresh]);

  const removeFollower = useCallback(async () => {
    if (!targetUserId) return;
    setActionLoading(true);
    try { await FollowService.removeFollower(targetUserId); await refresh(); } finally { setActionLoading(false); }
  }, [targetUserId, refresh]);

  return { relationship, loading, actionLoading, follow, unfollow, cancelRequest, block, unblock, removeFollower, refresh };
}

// ─── useFollowCounts ───

export function useFollowCounts(userId: string | null) {
  const [counts, setCounts] = useState<FollowCounts>({ followers: 0, following: 0 });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) { setCounts({ followers: 0, following: 0 }); setLoading(false); return; }
    try {
      const c = await FollowService.getFollowCounts(userId);
      setCounts(c);
    } catch { /* */ }
    setLoading(false);
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const unsub = FollowService.subscribeToChanges(() => refresh());
    return unsub;
  }, [refresh]);

  return { counts, loading, refresh };
}

// ─── useFollowRequests ───

export function useFollowRequests() {
  const [pendingRequests, setPendingRequests] = useState<Follow[]>([]);
  const [sentRequests, setSentRequests] = useState<Follow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [pending, sent] = await Promise.all([
        FollowService.getFollowRequests(),
        FollowService.getSentFollowRequests(),
      ]);
      setPendingRequests(pending);
      setSentRequests(sent);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const unsub = FollowService.subscribeToChanges(() => refresh());
    return unsub;
  }, [refresh]);

  const accept = useCallback(async (followId: string) => {
    await FollowService.acceptFollowRequest(followId);
    await refresh();
  }, [refresh]);

  const reject = useCallback(async (followId: string) => {
    await FollowService.rejectFollowRequest(followId);
    await refresh();
  }, [refresh]);

  const cancel = useCallback(async (targetIdOrFollowId: string) => {
    // targetIdOrFollowId can be either the target user's ID or the follow document ID
    await FollowService.cancelFollowRequest(targetIdOrFollowId);
    await refresh();
  }, [refresh]);

  return { pendingRequests, sentRequests, loading, accept, reject, cancel, refresh };
}

// ─── useFollowersList ───

export function useFollowersList(userId: string | null, type: 'followers' | 'following') {
  const [list, setList] = useState<Follow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!userId) { setList([]); setLoading(false); return; }
    try {
      // We need to query for the specific user, not just current user
      // So we query the follows collection directly
      const col = collection(db, 'follows');
      let q;
      if (type === 'followers') {
        q = query(col, where('following_id', '==', userId), where('status', '==', 'accepted'));
      } else {
        q = query(col, where('follower_id', '==', userId), where('status', '==', 'accepted'));
      }
      const snap = await getDocs(q);
      const follows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Follow, 'id'>) })) as Follow[];

      // Attach profiles
      const profileIds = follows.map((f) => type === 'followers' ? f.follower_id : f.following_id);
      const profiles = await FriendService.getProfiles(profileIds);
      const map = new Map(profiles.map((p) => [p.id, p]));
      follows.forEach((f) => {
        if (type === 'followers') {
          const profileId = f.follower_id;
          const profile = map.get(profileId) || {
            id: profileId, email: '', username: null, full_name: null,
            avatar_url: null, status: 'offline' as const, last_seen: new Date().toISOString(),
            is_private: false, bio: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          };
          if (!profile.id) profile.id = profileId;
          f.follower = profile;
        } else {
          const profileId = f.following_id;
          const profile = map.get(profileId) || {
            id: profileId, email: '', username: null, full_name: null,
            avatar_url: null, status: 'offline' as const, last_seen: new Date().toISOString(),
            is_private: false, bio: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          };
          if (!profile.id) profile.id = profileId;
          f.following = profile;
        }
      });

      setList(follows);
      setTotalCount(follows.length);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [userId, type]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const unsub = FollowService.subscribeToChanges(() => refresh());
    return unsub;
  }, [refresh]);

  const hasMore = false;
  const loadMore = () => {};

  return { list, totalCount, loading, hasMore, loadMore, refresh };
}

// ─── useFollowSearch ───

export function useFollowSearch() {
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (searchQuery: string) => {
    const term = searchQuery.trim();
    if (!term) { setResults([]); return; }
    setLoading(true);
    try {
      const users = await FriendService.searchUsers(term);
      setResults(users);
    } catch (e) { console.error(e); setResults([]); }
    setLoading(false);
  }, []);

  return { results, loading, search };
}

// ─── useFollowBackSuggestions ───

export function useFollowBackSuggestions() {
  const [list, setList] = useState<Follow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const suggestions = await FollowService.getFollowBackSuggestions();
      setList(suggestions);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const unsub = FollowService.subscribeToChanges(() => refresh());
    return unsub;
  }, [refresh]);

  return { list, loading, refresh };
}
