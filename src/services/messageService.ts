import { db } from '../lib/firebase';
import { auth } from '../lib/firebase';
import { storage } from '../lib/firebase';
import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc, query, where, orderBy, onSnapshot, deleteDoc,
  setDoc,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
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

export async function sendMessage(
  conversationId: string,
  content: string,
  options?: {
    message_type?: Message['message_type'];
    media_url?: string;
    media_thumbnail?: string;
    media_duration?: number;
    media_filename?: string;
  }
): Promise<Message> {
  const id = uid();
  const msgType = options?.message_type || 'text';
  const data: Record<string, unknown> = {
    conversation_id: conversationId,
    sender_id: id,
    content,
    message_type: msgType,
    metadata: {},
    is_edited: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    read_by: { [id]: new Date().toISOString() },
    delivered_to: { [id]: new Date().toISOString() },
  };
  if (options?.media_url) data.media_url = options.media_url;
  if (options?.media_thumbnail) data.media_thumbnail = options.media_thumbnail;
  if (options?.media_duration) data.media_duration = options.media_duration;
  if (options?.media_filename) data.media_filename = options.media_filename;

  const refDoc = await addDoc(collection(db, 'conversations', conversationId, 'messages'), data);

  // Build preview text
  let previewContent = content;
  if (msgType === 'image') previewContent = '📷 Photo';
  else if (msgType === 'video') previewContent = '🎥 Video';
  else if (msgType === 'voice') previewContent = '🎙️ Voice message';

  // Update conversation timestamp + last message preview
  await updateDoc(doc(db, 'conversations', conversationId), {
    updated_at: new Date().toISOString(),
    last_message: {
      id: refDoc.id,
      content: previewContent,
      sender_id: id,
      message_type: msgType,
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
        body: `${myProfile?.full_name || 'Someone'}: ${previewContent.slice(0, 50)}`,
        data: { conversation_id: conversationId },
        read: false,
        created_at: new Date().toISOString(),
      }).catch(() => {});
    }
  }

  return { id: refDoc.id, ...data } as unknown as Message;
}

// ─── Image Compression ───

function compressImage(file: File | Blob, maxWidth = 1200, maxHeight = 1200, quality = 0.75): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      let { width, height } = img;

      // Scale down if larger than max dimensions
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Compression failed'));
        },
        'image/jpeg',
        quality,
      );
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file instanceof File ? file : new File([file], 'image'));
  });
}

function generateImageThumbnail(file: File | Blob, size = 200, quality = 0.5): Promise<Blob> {
  return compressImage(file, size, size, quality);
}

function generateVideoThumbnail(file: File | Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;

    video.onloadeddata = () => {
      // Seek to 1 second or 10% of duration — whichever is less
      video.currentTime = Math.min(1, video.duration * 0.1);
    };

    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(300 / video.videoWidth, 300 / video.videoHeight, 1);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(video.src);
          if (blob) resolve(blob);
          else reject(new Error('Thumbnail generation failed'));
        },
        'image/jpeg',
        0.6,
      );
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video'));
    };

    video.src = URL.createObjectURL(file instanceof File ? file : new File([file], 'video'));
  });
}

// ─── Media upload (resumable with progress) ───

export type UploadProgressCallback = (progress: number) => void;

export async function uploadMedia(
  conversationId: string,
  file: File | Blob,
  type: 'image' | 'video' | 'voice',
  filename?: string,
  onProgress?: UploadProgressCallback,
): Promise<{ url: string; filename: string }> {
  const id = uid();
  const ext = filename ? filename.split('.').pop() : (type === 'voice' ? 'webm' : type === 'image' ? 'jpg' : 'mp4');
  const storagePath = `conversations/${conversationId}/${type}/${id}_${Date.now()}.${ext}`;
  const storageRef = ref(storage, storagePath);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        onProgress?.(progress);
      },
      (error) => reject(error),
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ url, filename: filename || `${type}_${Date.now()}.${ext}` });
        } catch (e) {
          reject(e);
        }
      },
    );
  });
}

async function uploadThumbnail(
  conversationId: string,
  thumbnail: Blob,
  _type: 'image' | 'video',
): Promise<string> {
  const id = uid();
  const storagePath = `conversations/${conversationId}/thumbnails/${id}_${Date.now()}.jpg`;
  const storageRef = ref(storage, storagePath);
  const uploadTask = uploadBytesResumable(storageRef, thumbnail);
  await new Promise<void>((resolve, reject) => {
    uploadTask.on('state_changed', null, reject, () => resolve());
  });
  return getDownloadURL(uploadTask.snapshot.ref);
}

export async function sendMediaMessage(
  conversationId: string,
  file: File | Blob,
  type: 'image' | 'video' | 'voice',
  options?: { duration?: number; filename?: string; onProgress?: UploadProgressCallback },
): Promise<Message> {
  let processedFile = file;
  let thumbnailUrl: string | undefined;

  if (type === 'image') {
    // Compress the image before uploading
    try {
      const compressed = await compressImage(file);
      // Only use compressed if it's actually smaller
      if (compressed.size < file.size) {
        processedFile = compressed;
        console.log(`[Media] Image compressed: ${(file.size / 1024).toFixed(0)}KB → ${(compressed.size / 1024).toFixed(0)}KB`);
      }
    } catch (e) {
      console.warn('[Media] Image compression failed, uploading original:', e);
    }

    // Generate thumbnail
    try {
      const thumb = await generateImageThumbnail(file);
      thumbnailUrl = await uploadThumbnail(conversationId, thumb, 'image');
    } catch (e) {
      console.warn('[Media] Thumbnail generation failed:', e);
    }
  }

  if (type === 'video') {
    // Generate video thumbnail
    try {
      const thumb = await generateVideoThumbnail(file);
      thumbnailUrl = await uploadThumbnail(conversationId, thumb, 'video');
    } catch (e) {
      console.warn('[Media] Video thumbnail generation failed:', e);
    }
  }

  const { url, filename } = await uploadMedia(
    conversationId,
    processedFile,
    type,
    options?.filename || (file instanceof File ? file.name : undefined),
    options?.onProgress,
  );

  const contentMap = { image: '📷 Photo', video: '🎥 Video', voice: '🎙️ Voice message' };
  return sendMessage(conversationId, contentMap[type], {
    message_type: type,
    media_url: url,
    media_thumbnail: thumbnailUrl,
    media_filename: filename,
    media_duration: options?.duration,
  });
}

// ─── Read receipts ───

export async function markMessageAsRead(conversationId: string, messageId: string): Promise<void> {
  const id = uid();
  const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
  const snap = await getDoc(msgRef);
  if (!snap.exists()) return;
  const readBy = (snap.data().read_by as Record<string, string>) || {};
  if (readBy[id]) return; // already read
  readBy[id] = new Date().toISOString();
  await updateDoc(msgRef, { read_by: readBy });
}

export async function markConversationAsRead(conversationId: string): Promise<void> {
  const id = uid();
  // Get all unread messages from others
  const q = query(
    collection(db, 'conversations', conversationId, 'messages'),
    orderBy('created_at', 'desc'),
  );
  const snap = await getDocs(q);
  const batch: Promise<void>[] = [];
  for (const d of snap.docs) {
    const data = d.data();
    if (data.sender_id === id) continue;
    const readBy = (data.read_by as Record<string, string>) || {};
    if (readBy[id]) continue;
    readBy[id] = new Date().toISOString();
    batch.push(updateDoc(d.ref, { read_by: readBy }));
  }
  await Promise.all(batch);
  // Also update the participant's last_read_at
  await updateLastReadAt(conversationId);
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
  // Media
  uploadMedia, sendMediaMessage,
  // Read receipts
  markMessageAsRead, markConversationAsRead,
};
