import { supabase } from '../lib/supabase';
import type { Conversation, Message, ConversationParticipant } from '../types/database.types';

// ═══════════════════════════════════════════
// Message Service
// Handles conversations, messages, and real-time chat
// ═══════════════════════════════════════════

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

        if (conv) return conv as Conversation;
      }
    }
  }

  // Create new conversation
  const { data: conv, error: convError } = await supabase
    .from('conversations')
    .insert({ is_group: false, created_by: user.id })
    .select()
    .single();

  if (convError || !conv) {
    console.warn('Create conversation error:', convError?.message);
    return null;
  }

  // Add both participants
  await supabase.from('conversation_participants').insert([
    { conversation_id: conv.id, user_id: user.id },
    { conversation_id: conv.id, user_id: otherUserId },
  ]);

  return conv as Conversation;
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

/** Send a message */
export async function sendMessage(
  conversationId: string,
  content: string,
  messageType: 'text' | 'image' | 'file' = 'text',
  metadata?: any
): Promise<Message | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content,
      message_type: messageType,
      metadata,
    })
    .select('*, sender:user_profiles(*)')
    .single();

  if (error) {
    console.warn('Send message error:', error.message);
    return null;
  }

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
