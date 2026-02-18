import { db } from '../lib/firebase';
import { auth } from '../lib/firebase';
import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc, query, where, orderBy, onSnapshot, deleteDoc,
  setDoc,
} from 'firebase/firestore';
import type { Conversation, ConversationParticipant, Message, UserProfile } from '../types/database.types';

// ═══════════════════════════════════════════════════════
// Message Service – Firestore only
// Conversations: conversations/{id}  (participants[] array)
// Messages: conversations/{id}/messages/{msgId}
// Profiles: user_profiles/{uid}
// ═══════════════════════════════════════════════════════

function uid() {
  const u = auth.currentUser?.uid;
  if (!u) throw new Error('Not authenticated');
  return u;
}

// ─── Profile cache ───

const profileCache = new Map<string, UserProfile>();

export async function fetchProfile(userId: string): Promise<UserProfile | null> {
  if (profileCache.has(userId)) return profileCache.get(userId)!;
  const snap = await getDoc(doc(db, 'user_profiles', userId));
  if (!snap.exists()) return null;
  const p = snap.data() as UserProfile;
  profileCache.set(userId, p);
  return p;
}

export async function fetchProfiles(userIds: string[]): Promise<Map<string, UserProfile>> {
  const map = new Map<string, UserProfile>();
  const missing: string[] = [];
  for (const id of userIds) {
    if (profileCache.has(id)) map.set(id, profileCache.get(id)!);
    else missing.push(id);
  }
  if (missing.length > 0) {
    // Chunk in 30
    for (let i = 0; i < missing.length; i += 30) {
      const chunk = missing.slice(i, i + 30);
      const q = query(collection(db, 'user_profiles'), where('__name__', 'in', chunk));
      const snap = await getDocs(q);
      snap.docs.forEach((d) => {
        const p = d.data() as UserProfile;
        profileCache.set(d.id, p);
        map.set(d.id, p);
      });
    }
  }
  return map;
}

// ─── Conversations ───

export async function getConversations(): Promise<Conversation[]> {
  const id = uid();
  try {
    const q = query(collection(db, 'conversations'), where('participants', 'array-contains', id), orderBy('updated_at', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Conversation, 'id'>) }));
  } catch (e) {
    // Fallback: query without orderBy if composite index is missing
    console.warn('[MessageService] getConversations: falling back to query without orderBy:', e);
    const q = query(collection(db, 'conversations'), where('participants', 'array-contains', id));
    const snap = await getDocs(q);
    const convs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Conversation, 'id'>) }));
    // Sort client-side
    convs.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
    return convs;
  }
}

export async function createConversation(participantIds: string[], name?: string): Promise<Conversation> {
  const id = uid();
  const allParticipants = [...new Set([id, ...participantIds])];

  console.log('[MessageService] Creating conversation with participants:', allParticipants);

  // Check if 1:1 conversation already exists (use simple query without orderBy to avoid composite index requirement)
  if (allParticipants.length === 2) {
    try {
      const checkQ = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', id)
      );
      const checkSnap = await getDocs(checkQ);
      const found = checkSnap.docs.find((d) => {
        const p = d.data().participants as string[] | undefined;
        return p && p.length === 2 && allParticipants.every((pp) => p.includes(pp));
      });
      if (found) {
        console.log('[MessageService] Found existing conversation:', found.id);
        return { id: found.id, ...(found.data() as Omit<Conversation, 'id'>) } as unknown as Conversation;
      }
    } catch (e) {
      console.warn('[MessageService] Could not check for existing conversation, proceeding to create:', e);
    }
  }

  const data = {
    name: name || null,
    is_group: allParticipants.length > 2,
    created_by: id,
    participants: allParticipants,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  
  try {
    const ref = await addDoc(collection(db, 'conversations'), data);
    console.log('[MessageService] Created new conversation:', ref.id);

    // Write participant subcollection docs
    for (const pid of allParticipants) {
      await setDoc(doc(db, 'conversations', ref.id, 'participants', pid), {
        conversation_id: ref.id,
        user_id: pid,
        joined_at: data.created_at,
        last_read_at: data.created_at,
      });
    }

    // Enrich with participant profiles so the UI can display names immediately
    const profileMap = await fetchProfiles(allParticipants);
    const enrichedParticipants = allParticipants.map((pid) => ({
      id: pid,
      conversation_id: ref.id,
      user_id: pid,
      joined_at: data.created_at,
      last_read_at: data.created_at,
      user: profileMap.get(pid) || undefined,
    }));

    return {
      id: ref.id,
      ...data,
      participants: enrichedParticipants,
    } as unknown as Conversation;
  } catch (error) {
    console.error('[MessageService] Error creating conversation:', error);
    throw error;
  }
}

// ─── Messages ───

export async function getMessages(conversationId: string): Promise<Message[]> {
  const q = query(
    collection(db, 'conversations', conversationId, 'messages'),
    orderBy('created_at', 'asc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Message, 'id'>) }));
}

export async function sendMessage(conversationId: string, content: string): Promise<Message> {
  const id = uid();
  const data = {
    conversation_id: conversationId,
    sender_id: id,
    content,
    message_type: 'text' as const,
    metadata: {},
    is_edited: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const ref = await addDoc(collection(db, 'conversations', conversationId, 'messages'), data);

  // Update conversation timestamp + last message preview
  await updateDoc(doc(db, 'conversations', conversationId), {
    updated_at: new Date().toISOString(),
    last_message: {
      id: ref.id,
      content,
      sender_id: id,
      message_type: 'text',
      created_at: data.created_at,
    },
  });

  // Send notification to other participants
  const convSnap = await getDoc(doc(db, 'conversations', conversationId));
  if (convSnap.exists()) {
    const participants = (convSnap.data().participants as string[]) || [];
    const myProfile = await fetchProfile(id);
    for (const pid of participants) {
      if (pid === id) continue;
      await addDoc(collection(db, 'users', pid, 'notifications'), {
        user_id: pid,
        type: 'message',
        title: 'New Message',
        body: `${myProfile?.full_name || 'Someone'}: ${content.slice(0, 50)}`,
        data: { conversation_id: conversationId },
        read: false,
        created_at: new Date().toISOString(),
      }).catch(() => {});
    }
  }

  return { id: ref.id, ...data };
}

export async function editMessage(conversationId: string, messageId: string, content: string): Promise<void> {
  await updateDoc(doc(db, 'conversations', conversationId, 'messages', messageId), {
    content, is_edited: true, updated_at: new Date().toISOString(),
  });
}

export async function deleteMessage(conversationId: string, messageId: string): Promise<void> {
  await deleteDoc(doc(db, 'conversations', conversationId, 'messages', messageId));
}

// ─── Conversation Participants (subcollection) ───

export async function getConversationParticipants(conversationId: string): Promise<ConversationParticipant[]> {
  const snap = await getDocs(collection(db, 'conversations', conversationId, 'participants'));
  const participants = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ConversationParticipant, 'id'>) }));

  // Attach profiles
  const userIds = participants.map((p) => p.user_id);
  const profileMap = await fetchProfiles(userIds);
  participants.forEach((p) => { p.user = profileMap.get(p.user_id) || undefined; });
  return participants;
}

export async function addConversationParticipant(conversationId: string, userId: string): Promise<void> {
  const now = new Date().toISOString();

  // Add to participants subcollection
  await setDoc(doc(db, 'conversations', conversationId, 'participants', userId), {
    conversation_id: conversationId,
    user_id: userId,
    joined_at: now,
    last_read_at: now,
  });

  // Also add to the participants array (for array-contains queries)
  const convSnap = await getDoc(doc(db, 'conversations', conversationId));
  if (convSnap.exists()) {
    const participants = (convSnap.data().participants as string[]) || [];
    if (!participants.includes(userId)) {
      participants.push(userId);
      await updateDoc(doc(db, 'conversations', conversationId), {
        participants,
        updated_at: now,
      });
    }
  }
}

export async function removeConversationParticipant(conversationId: string, userId: string): Promise<void> {
  // Remove from subcollection
  await deleteDoc(doc(db, 'conversations', conversationId, 'participants', userId));

  // Remove from participants array
  const convSnap = await getDoc(doc(db, 'conversations', conversationId));
  if (convSnap.exists()) {
    const participants = ((convSnap.data().participants as string[]) || []).filter((id) => id !== userId);
    await updateDoc(doc(db, 'conversations', conversationId), {
      participants,
      updated_at: new Date().toISOString(),
    });
  }
}

export async function updateLastReadAt(conversationId: string): Promise<void> {
  const id = uid();
  await setDoc(doc(db, 'conversations', conversationId, 'participants', id), {
    conversation_id: conversationId,
    user_id: id,
    last_read_at: new Date().toISOString(),
  }, { merge: true });
}

// ─── Realtime subscriptions ───

export function subscribeToConversations(callback: (conversations: Conversation[]) => void) {
  const id = uid();
  const q = query(collection(db, 'conversations'), where('participants', 'array-contains', id), orderBy('updated_at', 'desc'));
  return onSnapshot(q, (snap) => {
    const convs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Conversation, 'id'>) }));
    callback(convs);
  });
}

export function subscribeToMessages(conversationId: string, callback: (messages: Message[]) => void) {
  const q = query(collection(db, 'conversations', conversationId, 'messages'), orderBy('created_at', 'asc'));
  return onSnapshot(q, (snap) => {
    const msgs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Message, 'id'>) }));
    callback(msgs);
  });
}

export const MessageService = {
  getConversations, createConversation, getMessages, sendMessage, editMessage, deleteMessage,
  subscribeToConversations, subscribeToMessages,
  fetchProfile, fetchProfiles,
  // Conversation participants
  getConversationParticipants, addConversationParticipant, removeConversationParticipant,
  updateLastReadAt,
};
