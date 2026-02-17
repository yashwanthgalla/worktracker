-- ═══════════════════════════════════════════════════════
-- 007: Fix Realtime for Follow System
-- 
-- Without REPLICA IDENTITY FULL, Supabase Realtime
-- cannot evaluate RLS policies on DELETE events because
-- only the primary key is included in the old record.
-- This means unfollow/cancel operations won't trigger
-- real-time updates for other users.
-- ═══════════════════════════════════════════════════════

ALTER TABLE follows REPLICA IDENTITY FULL;
ALTER TABLE user_blocks REPLICA IDENTITY FULL;
ALTER TABLE realtime_notifications REPLICA IDENTITY FULL;
