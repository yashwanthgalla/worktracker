-- ═══════════════════════════════════════════════════════
-- Fix Missing RLS Policies for Messaging
-- ═══════════════════════════════════════════════════════
-- Safe to re-run: uses DROP IF EXISTS before CREATE
-- Fixes: send message failing, other user can't see/reply

-- ─── conversation_participants: UPDATE policy ───
DROP POLICY IF EXISTS "Participants can update own participation" ON conversation_participants;
CREATE POLICY "Participants can update own participation" ON conversation_participants
  FOR UPDATE USING (
    user_id = auth.uid()
  );

-- ─── conversation_participants: DELETE policy ───
DROP POLICY IF EXISTS "Participants can leave conversations" ON conversation_participants;
CREATE POLICY "Participants can leave conversations" ON conversation_participants
  FOR DELETE USING (
    user_id = auth.uid() OR
    conversation_id IN (SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid())
  );

-- ─── conversations: DELETE policy ───
DROP POLICY IF EXISTS "Creator can delete conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Creator can delete conversations" ON conversations;
CREATE POLICY "Creator can delete conversations" ON conversations
  FOR DELETE USING (
    created_by = auth.uid()
  );

-- ─── messages: DELETE policy ───
DROP POLICY IF EXISTS "Senders can delete own messages" ON messages;
CREATE POLICY "Senders can delete own messages" ON messages
  FOR DELETE USING (auth.uid() = sender_id);

-- ═══════════════════════════════════════════════════════
-- Clean up orphaned / broken conversations
-- 1. Conversations with NO participants at all
-- 2. Non-group conversations with only ONE participant (half-created)
-- ═══════════════════════════════════════════════════════
DELETE FROM conversations
WHERE id NOT IN (
  SELECT DISTINCT conversation_id FROM conversation_participants
);

DELETE FROM conversations
WHERE is_group = false
  AND id IN (
    SELECT conversation_id
    FROM conversation_participants
    GROUP BY conversation_id
    HAVING COUNT(*) < 2
  );

-- ═══════════════════════════════════════════════════════
-- Add Realtime for conversations table (may already exist)
-- This ensures both users get live updates when conversations change
-- ═══════════════════════════════════════════════════════
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
EXCEPTION WHEN duplicate_object THEN
  -- already added, ignore
END;
$$;
