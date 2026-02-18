import { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/firebase';
import { auth } from '../lib/firebase';
import {
  collection, doc, query, where, orderBy, onSnapshot, getDocs, updateDoc, writeBatch,
} from 'firebase/firestore';
import { MessageService } from '../services/messageService';
import { FriendService } from '../services/friendService';
import type { Conversation, Message, UserProfile, RealtimeNotification } from '../types/database.types';

// ═══════════════════════════════════════════════════════
// Messaging hooks – Firestore
// ═══════════════════════════════════════════════════════

function uid() { return auth.currentUser?.uid ?? null; }

// ─── useConversations ───

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = uid();

  useEffect(() => {
    if (!userId) { setConversations([]); setLoading(false); return; }

    const processSnapshot = async (snap: import('firebase/firestore').QuerySnapshot) => {
      try {
        const convs = snap.docs.map((d) => {
          const data = d.data();
          const conv = { id: d.id, ...data } as unknown as Conversation;
          // Preserve last_message from Firestore doc
          if (data.last_message) {
            conv.last_message = data.last_message as unknown as Message;
          }
          return conv;
        });
        // Sort client-side as fallback
        convs.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
        // Attach profile info
        const profileIds = new Set<string>();
        convs.forEach((c) => {
          const participants = (c as unknown as Record<string, unknown>).participants as string[] | undefined;
          participants?.forEach((p) => { if (typeof p === 'string' && p !== userId) profileIds.add(p); });
        });
        if (profileIds.size > 0) {
          const profiles = await MessageService.fetchProfiles([...profileIds]);
          convs.forEach((c) => {
            const participants = (c as unknown as Record<string, unknown>).participants as string[] | undefined;
            if (participants) {
              c.participants = (participants as unknown as string[]).filter((p) => typeof p === 'string').map((pid: string) => ({
                id: pid,
                conversation_id: c.id,
                user_id: pid,
                joined_at: c.created_at,
                last_read_at: c.created_at,
                user: profiles.get(pid) || undefined,
              }));
            }
          });
        }
        setConversations(convs);
      } catch (err) {
        console.error('[useConversations] Error processing snapshot:', err);
      }
      setLoading(false);
    };

    // Try with orderBy first (requires composite index), fallback without it
    let unsub: (() => void) | undefined;
    try {
      const q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', userId),
        orderBy('updated_at', 'desc'),
      );
      unsub = onSnapshot(q, processSnapshot, (error) => {
        console.warn('[useConversations] Snapshot error with orderBy, trying fallback:', error.message);
        // Fallback: query without orderBy
        const fallbackQ = query(
          collection(db, 'conversations'),
          where('participants', 'array-contains', userId),
        );
        unsub = onSnapshot(fallbackQ, processSnapshot, (fallbackError) => {
          console.error('[useConversations] Fallback snapshot error:', fallbackError);
          setLoading(false);
        });
      });
    } catch {
      // If query construction itself fails, try without orderBy
      const fallbackQ = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', userId),
      );
      unsub = onSnapshot(fallbackQ, processSnapshot, (error) => {
        console.error('[useConversations] Snapshot error:', error);
        setLoading(false);
      });
    }
    return () => { if (unsub) unsub(); };
  }, [userId]);

  const startDirectChat = useCallback(async (otherUserId: string): Promise<Conversation | null> => {
    const currentUid = uid();
    if (!currentUid) {
      console.error('[useConversations] Not authenticated');
      return null;
    }
    if (!otherUserId) {
      console.error('[useConversations] Invalid user ID provided');
      return null;
    }
    try {
      console.log('[useConversations] Starting direct chat with:', otherUserId);
      const conv = await MessageService.createConversation([otherUserId]);
      console.log('[useConversations] Chat started successfully:', conv.id);
      return conv;
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error('[useConversations] Failed to start chat:', errMsg, e);
      // If it's an index error, log a helpful message
      if (errMsg.includes('index')) {
        console.error('[useConversations] This may be a missing Firestore composite index. Check the Firebase console.');
      }
      return null;
    }
  }, []);

  const refresh = useCallback(() => {
    // onSnapshot handles real-time updates automatically
  }, []);

  return { conversations, loading, startDirectChat, refresh };
}

// ─── useMessages ───

export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = uid();

  useEffect(() => {
    if (!conversationId || !userId) { setMessages([]); setLoading(false); return; }
    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('created_at', 'asc'),
    );
    const unsub = onSnapshot(q, async (snap) => {
      const msgs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Message, 'id'>) }));
      // Attach sender profiles
      const senderIds = [...new Set(msgs.map((m) => m.sender_id))];
      const profiles = await MessageService.fetchProfiles(senderIds);
      msgs.forEach((m) => { m.sender = profiles.get(m.sender_id) || undefined; });
      setMessages(msgs);
      setLoading(false);
    });
    return unsub;
  }, [conversationId, userId]);

  const send = useCallback(async (content: string): Promise<Message | null> => {
    if (!conversationId || !content.trim()) return null;
    try { return await MessageService.sendMessage(conversationId, content); } catch (e) { console.error('Send failed:', e); return null; }
  }, [conversationId]);

  return { messages, loading, send };
}

// ─── useRealtimeNotifications ───

export function useRealtimeNotifications() {
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const userId = uid();

  useEffect(() => {
    if (!userId) { setNotifications([]); setUnreadCount(0); return; }
    const q = query(
      collection(db, 'users', userId, 'notifications'),
      orderBy('created_at', 'desc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      const notifs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<RealtimeNotification, 'id'>) }));
      setNotifications(notifs);
      setUnreadCount(notifs.filter((n) => !n.read).length);
    });
    return unsub;
  }, [userId]);

  const markRead = useCallback(async (id: string) => {
    if (!userId) return;
    await updateDoc(doc(db, 'users', userId, 'notifications', id), { read: true });
  }, [userId]);

  const clearAll = useCallback(async () => {
    if (!userId) return;
    const notifQuery = query(collection(db, 'users', userId, 'notifications'));
    const snap = await getDocs(notifQuery);
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    setNotifications([]);
    setUnreadCount(0);
  }, [userId]);

  return { notifications, unreadCount, markRead, clearAll };
}

// ─── useFriends (for legacy compatibility) ───

export function useFriends() {
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = uid();

  useEffect(() => {
    if (!userId) { setFriends([]); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const friendships = await FriendService.getFriends();
        const profiles: UserProfile[] = friendships.map((f) =>
          f.requester_id === userId ? f.addressee! : f.requester!
        ).filter(Boolean) as UserProfile[];
        if (!cancelled) setFriends(profiles);
      } catch (e) { console.error(e); }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  return { friends, loading };
}
