-- ═══════════════════════════════════════════════════
-- WorkTracker: Email Notification Database Setup
-- Run this SQL in Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════

-- 1. Notification Log Table
-- Tracks sent notifications to prevent duplicates
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('due_reminder', 'task_completed', 'daily_digest', 'streak')),
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_notification_log_user_type
  ON notification_log(user_id, type, sent_at DESC);

-- RLS policies for notification_log
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON notification_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications"
  ON notification_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- 2. User notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  due_reminders BOOLEAN DEFAULT true,
  completion_emails BOOLEAN DEFAULT true,
  daily_digest BOOLEAN DEFAULT true,
  reminder_days_before INTEGER DEFAULT 3,
  digest_time TIME DEFAULT '18:00:00',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies for notification_preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- 3. Function: Get tasks approaching due date for a user
CREATE OR REPLACE FUNCTION get_due_soon_tasks(p_user_id UUID, p_days_ahead INTEGER DEFAULT 3)
RETURNS TABLE (
  task_id UUID,
  title TEXT,
  priority TEXT,
  due_date TIMESTAMPTZ,
  status TEXT,
  due_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id AS task_id,
    t.title,
    t.priority,
    t.due_date,
    t.status,
    CASE
      WHEN t.due_date < NOW() THEN 'overdue'
      WHEN t.due_date::date = CURRENT_DATE THEN 'due_today'
      ELSE 'upcoming'
    END AS due_status
  FROM tasks t
  WHERE t.user_id = p_user_id
    AND t.status != 'completed'
    AND t.due_date IS NOT NULL
    AND t.due_date < NOW() + (p_days_ahead || ' days')::INTERVAL
  ORDER BY t.due_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Function: Get daily productivity stats for digest
CREATE OR REPLACE FUNCTION get_daily_stats(p_user_id UUID)
RETURNS TABLE (
  completed_today BIGINT,
  total_tasks BIGINT,
  overdue_count BIGINT,
  focus_minutes BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM tasks WHERE user_id = p_user_id AND status = 'completed'
     AND completed_at::date = CURRENT_DATE) AS completed_today,
    (SELECT COUNT(*) FROM tasks WHERE user_id = p_user_id) AS total_tasks,
    (SELECT COUNT(*) FROM tasks WHERE user_id = p_user_id AND status != 'completed'
     AND due_date IS NOT NULL AND due_date < NOW()) AS overdue_count,
    COALESCE(
      (SELECT SUM(duration) / 60 FROM focus_sessions WHERE user_id = p_user_id
       AND created_at::date = CURRENT_DATE), 0
    ) AS focus_minutes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. Function: Check if notification was already sent today
CREATE OR REPLACE FUNCTION notification_sent_today(
  p_user_id UUID,
  p_type TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM notification_log
    WHERE user_id = p_user_id
      AND type = p_type
      AND sent_at::date = CURRENT_DATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6. Auto-create notification preferences on user signup
CREATE OR REPLACE FUNCTION handle_new_user_notification_prefs()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: runs after user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_notification_prefs ON auth.users;
CREATE TRIGGER on_auth_user_created_notification_prefs
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_notification_prefs();
