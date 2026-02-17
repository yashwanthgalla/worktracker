-- ═══════════════════════════════════════════════════════
-- 006: Instagram-Style Follow System
-- ═══════════════════════════════════════════════════════

-- Add is_private and bio to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- ═══════════════════════════════════════════════════════
-- Follows Table (one-directional follow relationship)
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('requested', 'accepted', 'rejected')) DEFAULT 'requested',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- ═══════════════════════════════════════════════════════
-- User Blocks Table
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  blocked_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

-- ═══════════════════════════════════════════════════════
-- Follow History (audit log / soft-delete archive)
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS follow_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  action TEXT CHECK (action IN ('follow', 'unfollow', 'accept', 'reject', 'cancel', 'block', 'unblock', 'remove_follower')) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════
-- Indexes for Performance
-- ═══════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_status ON follows(status);
CREATE INDEX IF NOT EXISTS idx_follows_composite ON follows(follower_id, following_id, status);
CREATE INDEX IF NOT EXISTS idx_follows_following_status ON follows(following_id, status);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_composite ON user_blocks(blocker_id, blocked_id);
CREATE INDEX IF NOT EXISTS idx_follow_history_users ON follow_history(follower_id, following_id);
CREATE INDEX IF NOT EXISTS idx_follow_history_created ON follow_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_private ON user_profiles(is_private);

-- ═══════════════════════════════════════════════════════
-- RLS Policies
-- ═══════════════════════════════════════════════════════
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_history ENABLE ROW LEVEL SECURITY;

-- Follows: viewable by involved parties
CREATE POLICY "Users see own follows" ON follows
  FOR SELECT USING (auth.uid() = follower_id OR auth.uid() = following_id);
CREATE POLICY "Users can follow" ON follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can update own follows" ON follows
  FOR UPDATE USING (auth.uid() = follower_id OR auth.uid() = following_id);
CREATE POLICY "Users can delete own follows" ON follows
  FOR DELETE USING (auth.uid() = follower_id OR auth.uid() = following_id);

-- Blocks: only blocker can see/manage
CREATE POLICY "Users see own blocks" ON user_blocks
  FOR SELECT USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);
CREATE POLICY "Users can block" ON user_blocks
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Users can unblock" ON user_blocks
  FOR DELETE USING (auth.uid() = blocker_id);

-- Follow History: only involved users can see
CREATE POLICY "Users see own follow history" ON follow_history
  FOR SELECT USING (auth.uid() = follower_id OR auth.uid() = following_id);
CREATE POLICY "Anyone can insert follow history" ON follow_history
  FOR INSERT WITH CHECK (true);

-- ═══════════════════════════════════════════════════════
-- Realtime
-- ═══════════════════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE follows;
ALTER PUBLICATION supabase_realtime ADD TABLE user_blocks;

-- ═══════════════════════════════════════════════════════
-- Update handle_new_user to include is_private/bio
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, username, avatar_url, is_private, bio)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE((NEW.raw_user_meta_data->>'is_private')::boolean, false),
    NEW.raw_user_meta_data->>'bio'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
    username = COALESCE(EXCLUDED.username, user_profiles.username),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
