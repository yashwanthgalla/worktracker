import { supabase } from '../lib/supabase';
import type { Conversation, Message, ConversationParticipant } from '../types/database.types';

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Message Service
// Handles conversations, messages, and real-time chat
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/** Get or create a 1:1 conversation between current user and another */
export async function getOrCreateDirectConversation(otherUserId: string): Promise<Conversation | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Find existing 1:1 conversation
  const { data: myConvs } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', user.id);

  if (myConvs && myConvs.length > 0) {
    const convIds = myConvs.map(c => c.conversation_id);

    const { data: sharedConvs } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', otherUserId)
      .in('conversation_id', convIds);

    if (sharedConvs && sharedConvs.length > 0) {
      // Check if any of them are non-group
      for (const sc of sharedConvs) {
        const { data: conv } = await supabase
          .from('conversations')
          .select('*')
          .eq('id', sc.conversation_id)
          .eq('is_group', false)
          .single();

        if (conv) {
          console.log('[getOrCreateDM] Found existing conversation:', conv.id);
          return conv as Conversation;
        }
      }
    }
  }

  // Also check: are there any conversations I created with this person that are
  // broken (conversation exists but participant rows are missing)?
  // Look for conversations created by me that have no participants at all
  const { data: orphanConvs } = await supabase
    .from('conversations')
    .select('id')
    .eq('created_by', user.id)
    .eq('is_group', false);

  if (orphanConvs && orphanConvs.length > 0) {
    // Delete any orphaned conversations I created (no participants)
    for (const oc of orphanConvs) {
      const { count } = await supabase
        .from('conversation_participants')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', oc.id);

      if (count === 0 || count === null) {
        console.log('[getOrCreateDM] Cleaning up orphaned conversation:', oc.id);
        await supabase.from('conversations').delete().eq('id', oc.id);
      }
    }
  }

  // Create new conversation
  const convId = crypto.randomUUID();
  console.log('[getOrCreateDM] Creating new conversation:', convId);

  const { error: convError } = await supabase
    .from('conversations')
    .insert({ id: convId, is_group: false, created_by: user.id });

  if (convError) {
    console.error('[getOrCreateDM] Create conversation error:', convError.message);
    return null;
  }

  // Add current user first (satisfies RLS: user_id = auth.uid())
  const { error: selfErr } = await supabase
    .from('conversation_participants')
    .insert({ conversation_id: convId, user_id: user.id });

  if (selfErr) {
    console.error('[getOrCreateDM] Add self failed:', selfErr.message, selfErr.details);
    await supabase.from('conversations').delete().eq('id', convId);
    return null;
  }

  // Now add the other user (RLS passes: conversation_id has auth.uid() as participant)
  const { error: otherErr } = await supabase
    .from('conversation_participants')
    .insert({ conversation_id: convId, user_id: otherUserId });

  if (otherErr) {
    console.error('[getOrCreateDM] Add other user failed:', otherErr.message, otherErr.details);
    // Don't delete — self is already a participant, so the conversation is half-created.
    // sendMessage's auto-repair might fix this later, or we can still use it.
    // But log it clearly.
    console.warn('[getOrCreateDM] Conversation created with only self as participant');
  } else {
    console.log('[getOrCreateDM] Both participants added successfully');
  }

  // Now we can SELECT the conversation (user is a participant, RLS passes)
  const { data: newConv } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', convId)
    .single();

  return (newConv || { id: convId, is_group: false, created_by: user.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }) as Conversation;
}

/** Get all conversations for current user with last message and unread count */
export async function getConversations(): Promise<Conversation[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Get conversations user is part of
  const { data: participations } = await supabase
    .from('conversation_participants')
    .select('conversation_id, last_read_at')
    .eq('user_id', user.id);

  if (!participations || participations.length === 0) return [];

  const convIds = participations.map(p => p.conversation_id);
  const lastReads = new Map(participations.map(p => [p.conversation_id, p.last_read_at]));

  // Get conversations
  const { data: conversations, error } = await supabase
    .from('conversations')
    .select('*')
    .in('id', convIds)
    .order('updated_at', { ascending: false });

  if (error || !conversations) return [];

  // For each conversation, get participants, last message, unread count
  const enriched = await Promise.all(
    conversations.map(async (conv) => {
      // Participants with profiles
      const { data: parts } = await supabase
        .from('conversation_participants')
        .select('*, user:user_profiles(*)')
        .eq('conversation_id', conv.id);

      // Last message
      const { data: lastMsg } = await supabase
        .from('messages')
        .select('*, sender:user_profiles(*)')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Unread count
      const lastRead = lastReads.get(conv.id) || conv.created_at;
      const { count: unreadCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .neq('sender_id', user.id)
        .gt('created_at', lastRead);

      return {
        ...conv,
        participants: (parts || []) as ConversationParticipant[],
        last_message: lastMsg as Message | undefined,
        unread_count: unreadCount || 0,
      } as Conversation;
    })
  );

  // Sort by last message time
  return enriched.sort((a, b) => {
    const aTime = a.last_message?.created_at || a.updated_at;
    const bTime = b.last_message?.created_at || b.updated_at;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });
}

/** Get messages for a conversation */
export async function getMessages(conversationId: string, limit = 50, before?: string): Promise<Message[]> {
  let query = supabase
    .from('messages')
    .select('*, sender:user_profiles(*)')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt('created_at', before);
  }

  const { data, error } = await query;

  if (error) {
    console.warn('Get messages error:', error.message);
    return [];
  }

  return ((data || []) as Message[]).reverse();
}

/** Send a message (self-healing: auto-repairs missing participant rows) */
export async function sendMessage(
  conversationId: string,
  content: string,
  messageType: 'text' | 'image' | 'file' = 'text',
  metadata?: Record<string, unknown>
): Promise<Message | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('[sendMessage] No authenticated user');
    return null;
  }

  // Helper: attempt to insert the message
  const tryInsert = async () => {
    return supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
        message_type: messageType,
        metadata: metadata ? (metadata as unknown as import('../types/database.types').Json) : undefined,
      })
      .select('*, sender:user_profiles(*)')
      .single();
  };

  // First attempt
  let { data, error } = await tryInsert();

  // If RLS blocked us (user not a participant), auto-repair and retry
  if (error) {
    console.warn('[sendMessage] First insert failed:', error.code, error.message);

    // Ensure conversation exists
    const { data: convExists } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .maybeSingle();

    if (!convExists) {
      console.error('[sendMessage] Conversation does not exist:', conversationId);
      return null;
    }

    // Auto-repair: add current user as participant (upsert to avoid conflicts)
    console.log('[sendMessage] Auto-repairing: adding self as participant...');
    const { error: repairErr } = await supabase
      .from('conversation_participants')
      .upsert(
        { conversation_id: conversationId, user_id: user.id },
        { onConflict: 'conversation_id,user_id' }
      );

    if (repairErr) {
      console.error('[sendMessage] Auto-repair failed:', repairErr.message);
      return null;
    }

    // Retry insert after repair
    const retry = await tryInsert();
    data = retry.data;
    error = retry.error;

    if (error) {
      console.error('[sendMessage] Retry after repair still failed:', error.code, error.message, error.details);
      return null;
    }

    console.log('[sendMessage] Auto-repair succeeded, message sent!');
  }

  if (!data) return null;

  // Update conversation timestamp
  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  // Update sender's last_read_at
  await supabase
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id);

  // Create notifications for other participants
  const { data: participants } = await supabase
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', conversationId)
    .neq('user_id', user.id);

  if (participants) {
    const notifications = participants.map(p => ({
      user_id: p.user_id,
      type: 'message' as const,
      title: 'New message',
      body: content.length > 80 ? content.substring(0, 80) + '...' : content,
      data: { conversation_id: conversationId, message_id: data.id, sender_id: user.id },
    }));

    await supabase.from('realtime_notifications').insert(notifications);
  }

  return data as Message;
}

/** Edit a message */
export async function editMessage(messageId: string, newContent: string): Promise<void> {
  await supabase
    .from('messages')
    .update({ content: newContent, is_edited: true, updated_at: new Date().toISOString() })
    .eq('id', messageId);
}

/** Delete a message (replace content) */
export async function deleteMessage(messageId: string): Promise<void> {
  await supabase
    .from('messages')
    .update({
      content: 'This message was deleted',
      message_type: 'system' as const,
      updated_at: new Date().toISOString()
    })
    .eq('id', messageId);
}

/** Mark conversation as read */
export async function markConversationRead(conversationId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id);
}

export const MessageService = {
  getOrCreateDirectConversation,
  getConversations,
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  markConversationRead,
};
