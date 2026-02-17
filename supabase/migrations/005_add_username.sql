-- ═══════════════════════════════════════════════════════
-- Add username column to user_profiles
-- ═══════════════════════════════════════════════════════

-- Add username column (nullable initially for existing users)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS username TEXT;

-- Create unique index on username (only on non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(LOWER(username)) WHERE username IS NOT NULL;

-- Create index for faster username searches
CREATE INDEX IF NOT EXISTS idx_user_profiles_username_search ON user_profiles(username);

-- Update the trigger function to include username from metadata
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, username, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
    username = COALESCE(EXCLUDED.username, user_profiles.username),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
