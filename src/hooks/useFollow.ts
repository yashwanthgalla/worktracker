import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import { FollowService } from '../services/followService';
import type {
  Follow,
  FollowCounts,
  FollowRelationship,
  UserProfile,
} from '../types/database.types';

// ═══════════════════════════════════════════
// useFollow – manages follow state for a target user
// ═══════════════════════════════════════════
export function useFollow(targetUserId: string | null) {
  const [relationship, setRelationship] = useState<FollowRelationship>('none');
  const [outgoingFollow, setOutgoingFollow] = useState<Follow | null>(null);
  const [incomingFollow, setIncomingFollow] = useState<Follow | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const user = useAppStore((s) => s.user);

  const loadRelationship = useCallback(async () => {
    if (!targetUserId || !user) {
      setRelationship('none');
      return;
    }
    setLoading(true);
    try {
      const result = await FollowService.getFollowRelationship(targetUserId);
      setRelationship(result.relationship);
      setOutgoingFollow(result.outgoingFollow);
      setIncomingFollow(result.incomingFollow);
    } catch (e) {
      console.warn('Failed to load follow relationship:', e);
    } finally {
      setLoading(false);
    }
  }, [targetUserId, user]);

  useEffect(() => {
    loadRelationship();
  }, [loadRelationship]);

  // Real-time subscription for follow changes
  useEffect(() => {
    if (!targetUserId || !user) return;

    const channel = supabase
      .channel(`follow-rel:${user.id}:${targetUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'follows' },
        (payload) => {
          const row = payload.new as Follow | undefined;
          const oldRow = payload.old as Follow | undefined;
          const relevantIds = [user.id, targetUserId];
          const isRelevant =
            (row && relevantIds.includes(row.follower_id) && relevantIds.includes(row.following_id)) ||
            (oldRow && relevantIds.includes(oldRow.follower_id) && relevantIds.includes(oldRow.following_id));
          if (isRelevant) {
            loadRelationship();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [targetUserId, user, loadRelationship]);

  // Local change subscription – instant sync across hooks on same client
  useEffect(() => {
    return FollowService.subscribeToChanges(loadRelationship);
  }, [loadRelationship]);

  const follow = useCallback(async () => {
    if (!targetUserId) return;
    setActionLoading(true);
    try {
      const result = await FollowService.followUser(targetUserId);
      if (result) {
        // Optimistic update
        if (result.status === 'requested') {
          setRelationship('requested');
          toast.success('Follow request sent');
        } else {
          setRelationship('following');
          toast.success('Now following!');
        }
        setOutgoingFollow(result);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to follow user';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  }, [targetUserId]);

  const unfollow = useCallback(async () => {
    if (!targetUserId) return;
    setActionLoading(true);
    try {
      await FollowService.unfollowUser(targetUserId);
      setRelationship(incomingFollow?.status === 'accepted' ? 'follower' : 'none');
      setOutgoingFollow(null);
      toast.success('Unfollowed');
    } catch (e) {
      toast.error('Failed to unfollow');
    } finally {
      setActionLoading(false);
    }
  }, [targetUserId, incomingFollow]);

  const cancelRequest = useCallback(async () => {
    if (!outgoingFollow) return;
    setActionLoading(true);
    try {
      await FollowService.cancelFollowRequest(outgoingFollow.id);
      setRelationship('none');
      setOutgoingFollow(null);
      toast.success('Follow request cancelled');
    } catch (e) {
      toast.error('Failed to cancel request');
    } finally {
      setActionLoading(false);
    }
  }, [outgoingFollow]);

  const acceptRequest = useCallback(async () => {
    if (!incomingFollow) return;
    setActionLoading(true);
    try {
      await FollowService.acceptFollowRequest(incomingFollow.id);
      setRelationship(outgoingFollow?.status === 'accepted' ? 'mutual' : 'follower');
      setIncomingFollow({ ...incomingFollow, status: 'accepted' });
      toast.success('Follow request accepted');
    } catch (e) {
      toast.error('Failed to accept request');
    } finally {
      setActionLoading(false);
    }
  }, [incomingFollow, outgoingFollow]);

  const rejectRequest = useCallback(async () => {
    if (!incomingFollow) return;
    setActionLoading(true);
    try {
      await FollowService.rejectFollowRequest(incomingFollow.id);
      setRelationship(outgoingFollow?.status === 'accepted' ? 'following' : 'none');
      setIncomingFollow(null);
      toast.success('Follow request rejected');
    } catch (e) {
      toast.error('Failed to reject request');
    } finally {
      setActionLoading(false);
    }
  }, [incomingFollow, outgoingFollow]);

  const block = useCallback(async () => {
    if (!targetUserId) return;
    setActionLoading(true);
    try {
      await FollowService.blockUser(targetUserId);
      setRelationship('blocked');
      setOutgoingFollow(null);
      setIncomingFollow(null);
      toast.success('User blocked');
    } catch (e) {
      toast.error('Failed to block user');
    } finally {
      setActionLoading(false);
    }
  }, [targetUserId]);

  const unblock = useCallback(async () => {
    if (!targetUserId) return;
    setActionLoading(true);
    try {
      await FollowService.unblockUser(targetUserId);
      setRelationship('none');
      toast.success('User unblocked');
    } catch (e) {
      toast.error('Failed to unblock user');
    } finally {
      setActionLoading(false);
    }
  }, [targetUserId]);

  return {
    relationship,
    outgoingFollow,
    incomingFollow,
    loading,
    actionLoading,
    follow,
    unfollow,
    cancelRequest,
    acceptRequest,
    rejectRequest,
    block,
    unblock,
    refresh: loadRelationship,
  };
}

// ═══════════════════════════════════════════
// useFollowCounts – real-time follower/following counts
// ═══════════════════════════════════════════
export function useFollowCounts(userId: string | null) {
  const [counts, setCounts] = useState<FollowCounts>({ followers: 0, following: 0 });
  const [loading, setLoading] = useState(true);

  const loadCounts = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const c = await FollowService.getFollowCounts(userId);
      setCounts(c);
    } catch (e) {
      console.warn('Failed to load follow counts:', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  // Real-time subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`follow-counts:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'follows' },
        (payload) => {
          const row = (payload.new || payload.old) as Follow | undefined;
          if (row && (row.follower_id === userId || row.following_id === userId)) {
            loadCounts();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, loadCounts]);

  // Local change subscription – instant sync across hooks
  useEffect(() => {
    return FollowService.subscribeToChanges(loadCounts);
  }, [loadCounts]);

  return { counts, loading, refresh: loadCounts };
}

// ═══════════════════════════════════════════
// useFollowRequests – pending follow requests management
// ═══════════════════════════════════════════
export function useFollowRequests() {
  const [pendingRequests, setPendingRequests] = useState<Follow[]>([]);
  const [sentRequests, setSentRequests] = useState<Follow[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useAppStore((s) => s.user);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [pending, sent] = await Promise.all([
        FollowService.getPendingFollowRequests(),
        FollowService.getSentFollowRequests(),
      ]);
      setPendingRequests(pending);
      setSentRequests(sent);
    } catch (e) {
      console.warn('Failed to load follow requests:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Real-time subscription for follow requests
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`follow-requests:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'follows' },
        () => {
          refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refresh]);

  // Local change subscription – instant sync across hooks
  useEffect(() => {
    return FollowService.subscribeToChanges(refresh);
  }, [refresh]);

  const accept = useCallback(async (followId: string) => {
    await FollowService.acceptFollowRequest(followId);
    await refresh();
  }, [refresh]);

  const reject = useCallback(async (followId: string) => {
    await FollowService.rejectFollowRequest(followId);
    await refresh();
  }, [refresh]);

  const cancel = useCallback(async (followId: string) => {
    await FollowService.cancelFollowRequest(followId);
    await refresh();
  }, [refresh]);

  return {
    pendingRequests,
    sentRequests,
    loading,
    accept,
    reject,
    cancel,
    refresh,
  };
}

// ═══════════════════════════════════════════
// useFollowersList – paginated followers/following lists
// ═══════════════════════════════════════════
export function useFollowersList(userId: string | null, type: 'followers' | 'following') {
  const [list, setList] = useState<Follow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 50;

  const loadPage = useCallback(async (pageNum: number, append = false) => {
    if (!userId) return;
    setLoading(true);
    try {
      const result = type === 'followers'
        ? await FollowService.getFollowers(userId, pageNum, pageSize)
        : await FollowService.getFollowing(userId, pageNum, pageSize);

      if (append) {
        setList((prev) => [...prev, ...result.data]);
      } else {
        setList(result.data);
      }
      setTotalCount(result.count);
      setHasMore(result.data.length === pageSize);
    } catch (e) {
      console.warn('Failed to load followers list:', e);
    } finally {
      setLoading(false);
    }
  }, [userId, type]);

  useEffect(() => {
    setPage(0);
    loadPage(0);
  }, [loadPage]);

  // Real-time subscription — auto-refresh when follows table changes
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`follow-list:${userId}:${type}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'follows' },
        (payload) => {
          const row = (payload.new || payload.old) as Follow | undefined;
          if (row && (row.follower_id === userId || row.following_id === userId)) {
            // Reset to page 0 and reload
            setPage(0);
            loadPage(0);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, type, loadPage]);

  // Local change subscription – instant sync across hooks
  useEffect(() => {
    return FollowService.subscribeToChanges(() => {
      setPage(0);
      loadPage(0);
    });
  }, [loadPage]);

  const loadMore = useCallback(() => {
    if (!hasMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadPage(nextPage, true);
  }, [page, hasMore, loading, loadPage]);

  const refresh = useCallback(() => {
    setPage(0);
    loadPage(0);
  }, [loadPage]);

  return { list, totalCount, loading, hasMore, loadMore, refresh };
}

// ═══════════════════════════════════════════
// useFollowSearch – search users with follow state enrichment
// ═══════════════════════════════════════════
export function useFollowSearch() {
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const user = useAppStore((s) => s.user);

  const search = useCallback(async (query: string) => {
    if (!query || query.length < 2 || !user) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const users = await FollowService.searchUsersForFollow(query);
      setResults(users);
    } catch (e) {
      console.warn('Follow search error:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  return { results, loading, search, setResults };
}

// ═══════════════════════════════════════════
// useFollowBackSuggestions – followers you don't follow back
// ═══════════════════════════════════════════
export function useFollowBackSuggestions() {
  const [list, setList] = useState<Follow[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useAppStore((s) => s.user);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const suggestions = await FollowService.getFollowBackSuggestions();
      setList(suggestions);
    } catch (e) {
      console.warn('Follow-back suggestions error:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Real-time: refresh when follows change
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`follow-back:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'follows' },
        (payload) => {
          const row = (payload.new || payload.old) as Follow | undefined;
          if (row && (row.follower_id === user.id || row.following_id === user.id)) {
            load();
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, load]);

  // Local change subscription
  useEffect(() => {
    return FollowService.subscribeToChanges(() => { load(); });
  }, [load]);

  return { list, loading, refresh: load };
}
