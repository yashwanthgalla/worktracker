-- WorkTracker Database Schema for Supabase
-- Execute this entire script in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed')) DEFAULT 'pending',
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  due_date TIMESTAMPTZ,
  estimated_time INTEGER, -- in minutes
  actual_time INTEGER, -- in minutes
  parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule JSONB,
  auto_priority_score FLOAT,
  category TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Task Dependencies table
CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  depends_on_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, depends_on_task_id)
);

-- Work Sessions table (Pomodoro / Focus timer)
CREATE TABLE IF NOT EXISTS work_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  session_type TEXT CHECK (session_type IN ('pomodoro', 'custom', 'break')) DEFAULT 'pomodoro',
  duration INTEGER NOT NULL, -- in minutes
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Suggestions table
CREATE TABLE IF NOT EXISTS ai_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  suggestion_type TEXT NOT NULL,
  content JSONB NOT NULL,
  applied BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shared Tasks table (Collaboration)
CREATE TABLE IF NOT EXISTS task_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  permission TEXT CHECK (permission IN ('view', 'edit', 'admin')) DEFAULT 'view',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, shared_with_user_id)
);

-- Enable Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tasks
DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
CREATE POLICY "Users can view own tasks" ON tasks 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own tasks" ON tasks;
CREATE POLICY "Users can insert own tasks" ON tasks 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
CREATE POLICY "Users can update own tasks" ON tasks 
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;
CREATE POLICY "Users can delete own tasks" ON tasks 
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for task_dependencies
DROP POLICY IF EXISTS "Users can manage own task dependencies" ON task_dependencies;
CREATE POLICY "Users can manage own task dependencies" ON task_dependencies 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_dependencies.task_id 
      AND tasks.user_id = auth.uid()
    )
  );

-- RLS Policies for work_sessions
DROP POLICY IF EXISTS "Users can view own sessions" ON work_sessions;
CREATE POLICY "Users can view own sessions" ON work_sessions 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own sessions" ON work_sessions;
CREATE POLICY "Users can insert own sessions" ON work_sessions 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sessions" ON work_sessions;
CREATE POLICY "Users can update own sessions" ON work_sessions 
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own sessions" ON work_sessions;
CREATE POLICY "Users can delete own sessions" ON work_sessions 
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for activity_logs
DROP POLICY IF EXISTS "Users can view own activity logs" ON activity_logs;
CREATE POLICY "Users can view own activity logs" ON activity_logs 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own activity logs" ON activity_logs;
CREATE POLICY "Users can insert own activity logs" ON activity_logs 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for ai_suggestions
DROP POLICY IF EXISTS "Users can manage own suggestions" ON ai_suggestions;
CREATE POLICY "Users can manage own suggestions" ON ai_suggestions 
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for task_shares
DROP POLICY IF EXISTS "Users can view shared tasks" ON task_shares;
CREATE POLICY "Users can view shared tasks" ON task_shares 
  FOR SELECT USING (
    auth.uid() = shared_with_user_id OR
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_shares.task_id 
      AND tasks.user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_work_sessions_user_id ON work_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_work_sessions_task_id ON work_sessions(task_id);
CREATE INDEX IF NOT EXISTS idx_work_sessions_started_at ON work_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_task_id ON activity_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════
-- Follow System Tables (Instagram-style)
-- ═══════════════════════════════════════════════════════

-- Add is_private and bio to user_profiles (if table exists from previous migrations)
DO $$ BEGIN
  ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;
  ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS bio TEXT;
EXCEPTION WHEN undefined_table THEN
  NULL; -- user_profiles may not exist yet if migration 005 not applied
END $$;

-- Follows Table (one-directional follow relationship)
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

-- User Blocks Table
CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  blocked_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

-- Follow History (audit log)
CREATE TABLE IF NOT EXISTS follow_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  action TEXT CHECK (action IN ('follow', 'unfollow', 'accept', 'reject', 'cancel', 'block', 'unblock', 'remove_follower')) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_history ENABLE ROW LEVEL SECURITY;

-- Follows RLS Policies
DROP POLICY IF EXISTS "Users see own follows" ON follows;
CREATE POLICY "Users see own follows" ON follows
  FOR SELECT USING (auth.uid() = follower_id OR auth.uid() = following_id);
DROP POLICY IF EXISTS "Users can follow" ON follows;
CREATE POLICY "Users can follow" ON follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);
DROP POLICY IF EXISTS "Users can update own follows" ON follows;
CREATE POLICY "Users can update own follows" ON follows
  FOR UPDATE USING (auth.uid() = follower_id OR auth.uid() = following_id);
DROP POLICY IF EXISTS "Users can delete own follows" ON follows;
CREATE POLICY "Users can delete own follows" ON follows
  FOR DELETE USING (auth.uid() = follower_id OR auth.uid() = following_id);

-- Blocks RLS Policies
DROP POLICY IF EXISTS "Users see own blocks" ON user_blocks;
CREATE POLICY "Users see own blocks" ON user_blocks
  FOR SELECT USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);
DROP POLICY IF EXISTS "Users can block" ON user_blocks;
CREATE POLICY "Users can block" ON user_blocks
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);
DROP POLICY IF EXISTS "Users can unblock" ON user_blocks;
CREATE POLICY "Users can unblock" ON user_blocks
  FOR DELETE USING (auth.uid() = blocker_id);

-- Follow History RLS Policies
DROP POLICY IF EXISTS "Users see own follow history" ON follow_history;
CREATE POLICY "Users see own follow history" ON follow_history
  FOR SELECT USING (auth.uid() = follower_id OR auth.uid() = following_id);
DROP POLICY IF EXISTS "Anyone can insert follow history" ON follow_history;
CREATE POLICY "Anyone can insert follow history" ON follow_history
  FOR INSERT WITH CHECK (true);

-- Follow System Indexes
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

-- Add follows to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE follows;
ALTER PUBLICATION supabase_realtime ADD TABLE user_blocks;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'WorkTracker database schema created successfully!';
  RAISE NOTICE 'You can now use the application with your Supabase project.';
END $$;
