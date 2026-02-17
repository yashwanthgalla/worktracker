import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import { FriendService } from '../services/friendService';
import { MessageService } from '../services/messageService';
import type {
  UserProfile,
  Friendship,
  Conversation,
  Message,
  RealtimeNotification,
} from '../types/database.types';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ═══════════════════════════════════════════
// useFriends – manages friend list, requests, search
// ═══════════════════════════════════════════
export function useFriends() {
  const [friends, setFriends] = useState<Array<Friendship & { friend: UserProfile }>>([]);
  const [pendingRequests, setPendingRequests] = useState<Array<Friendship & { requester: UserProfile }>>([]);
  const [sentRequests, setSentRequests] = useState<Array<Friendship & { addressee: UserProfile }>>([]);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useAppStore((s) => s.user);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [f, p, s] = await Promise.all([
        FriendService.getFriends(),
        FriendService.getPendingRequests(),
        FriendService.getSentRequests(),
      ]);
      setFriends(f);
      setPendingRequests(p);
      setSentRequests(s);
    } catch (e) {
      console.warn('Failed to load friends:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Subscribe to friendship changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('friendships-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships' },
        () => {
          refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refresh]);

  const searchUsers = useCallback(async (query: string) => {
    const results = await FriendService.searchUsers(query);
    setSearchResults(results);
    return results;
  }, []);

  const sendRequest = useCallback(async (addresseeId: string) => {
    const result = await FriendService.sendFriendRequest(addresseeId);
    if (result) await refresh();
    return result;
  }, [refresh]);

  const acceptRequest = useCallback(async (friendshipId: string) => {
    await FriendService.acceptFriendRequest(friendshipId);
    await refresh();
  }, [refresh]);

  const rejectRequest = useCallback(async (friendshipId: string) => {
    await FriendService.rejectFriendRequest(friendshipId);
    await refresh();
  }, [refresh]);

  const removeFriend = useCallback(async (friendshipId: string) => {
    await FriendService.removeFriend(friendshipId);
    await refresh();
  }, [refresh]);

  return {
    friends,
    pendingRequests,
    sentRequests,
    searchResults,
    loading,
    searchUsers,
    sendRequest,
    acceptRequest,
    rejectRequest,
    removeFriend,
    refresh,
  };
}

// ═══════════════════════════════════════════
// useConversations – list of conversations
// ═══════════════════════════════════════════
export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useAppStore((s) => s.user);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const convs = await MessageService.getConversations();
      setConversations(convs);
    } catch (e) {
      console.warn('Failed to load conversations:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Listen for new messages to update conversation list
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('conversations-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => {
          refresh();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversation_participants', filter: `user_id=eq.${user.id}` },
        () => {
          refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refresh]);

  const startDirectChat = useCallback(async (otherUserId: string) => {
    const conv = await MessageService.getOrCreateDirectConversation(otherUserId);
    if (conv) await refresh();
    return conv;
  }, [refresh]);

  return { conversations, loading, refresh, startDirectChat };
}

// ═══════════════════════════════════════════
// useMessages – real-time messages for a conversation
// ═══════════════════════════════════════════
export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const user = useAppStore((s) => s.user);

  // Load messages
  const loadMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    setLoading(true);
    try {
      const msgs = await MessageService.getMessages(conversationId);
      setMessages(msgs);
      // Mark as read
      await MessageService.markConversationRead(conversationId);
    } catch (e) {
      console.warn('Failed to load messages:', e);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Real-time subscription
  useEffect(() => {
    if (!conversationId || !user) return;

    // Clean up previous subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          // Fetch the full message with sender profile
          const { data: newMsg } = await supabase
            .from('messages')
            .select('*, sender:user_profiles(*)')
            .eq('id', payload.new.id)
            .single();

          if (newMsg) {
            setMessages((prev) => {
              // Avoid duplicates
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg as Message];
            });
          }

          // Auto mark as read
          await MessageService.markConversationRead(conversationId);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === payload.new.id ? { ...m, ...payload.new } : m))
          );
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [conversationId, user]);

  const send = useCallback(
    async (content: string) => {
      if (!conversationId || !content.trim()) return null;
      return MessageService.sendMessage(conversationId, content.trim());
    },
    [conversationId]
  );

  return { messages, loading, send, refresh: loadMessages };
}

// ═══════════════════════════════════════════
// useRealtimeNotifications – real-time notification bell
// ═══════════════════════════════════════════
export function useRealtimeNotifications() {
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useAppStore((s) => s.user);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('realtime_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      setNotifications((data || []) as RealtimeNotification[]);
    } catch (e) {
      console.warn('Failed to load notifications:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Real-time subscription for new notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'realtime_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as RealtimeNotification;
          setNotifications((prev) => [newNotif, ...prev]);

          // Show browser notification if supported
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(newNotif.title, {
              body: newNotif.body || undefined,
              icon: '/favicon.ico',
            });
          }
        }
      )
      .subscribe();

    // Request browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markRead = useCallback(async (id: string) => {
    await supabase
      .from('realtime_notifications')
      .update({ read: true })
      .eq('id', id);

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    await supabase
      .from('realtime_notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [user]);

  const clearAll = useCallback(async () => {
    if (!user) return;
    await supabase
      .from('realtime_notifications')
      .delete()
      .eq('user_id', user.id);

    setNotifications([]);
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    loading,
    unreadCount,
    markRead,
    markAllRead,
    clearAll,
    refresh: loadNotifications,
  };
}
