// Application Types

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: Date;
  estimated_time?: number;
  actual_time?: number;
  parent_task_id?: string;
  is_recurring: boolean;
  recurrence_rule?: RecurrenceRule;
  auto_priority_score?: number;
  category?: string;
  tags?: string[];
  created_at: Date;
  updated_at: Date;
  completed_at?: Date;
  subtasks?: Task[];
  dependencies?: TaskDependency[];
  // Enhanced fields
  attachments?: TaskAttachment[];
  checklist?: ChecklistItem[];
  time_blocks?: TimeBlock[];
}

export interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  type: 'file' | 'image' | 'link';
  size?: number;
  created_at: Date;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  order: number;
}

export interface TimeBlock {
  id: string;
  task_id: string;
  date: string;
  start_time: string; // HH:mm
  end_time: string;   // HH:mm
  color?: string;
}

export interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  created_at: Date;
  depends_on_task?: Task;
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  end_date?: Date;
  days_of_week?: number[];
  month_day?: number;
}

export interface WorkSession {
  id: string;
  user_id: string;
  task_id?: string;
  session_type: 'pomodoro' | 'custom' | 'break';
  duration: number;
  started_at: Date;
  ended_at?: Date;
  completed: boolean;
  created_at: Date;
  task?: Task;
  // Enhanced fields
  notes?: string;
  mood?: 'great' | 'good' | 'okay' | 'tired' | 'burned_out';
  distractions?: number;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  task_id: string;
  action: string;
  details?: Record<string, unknown>;
  created_at: Date;
  task?: Task;
}

export interface AISuggestion {
  id: string;
  user_id: string;
  task_id: string;
  suggestion_type: string;
  content: Record<string, unknown>;
  applied: boolean;
  created_at: Date;
}

export interface ProductivityMetrics {
  daily_score: number;
  tasks_completed: number;
  total_focus_time: number;
  missed_deadlines: number;
  completion_rate: number;
  burnout_risk: 'low' | 'medium' | 'high';
  streak: number;
  best_streak: number;
}

export interface ProductivityTrend {
  date: string;
  score: number;
  tasks_completed: number;
  focus_time: number;
}

export interface HeatmapDay {
  date: string;
  value: number;   // 0-4 intensity level
  tasks: number;
  minutes: number;
}

export interface TaskAnalytics {
  completion_rate: number;
  avg_completion_time: number;
  overdue_count: number;
  by_priority: Record<string, number>;
  by_category: Record<string, number>;
  productivity_trends: ProductivityTrend[];
  heatmap?: HeatmapDay[];
  peak_hours?: Record<number, number>;
  avg_tasks_per_day?: number;
}

// ─── Kanban Types ───

export interface KanbanColumn {
  id: string;
  title: string;
  status: Task['status'];
  color: string;
  tasks: Task[];
}

// ─── Onboarding Types ───

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  action?: () => void;
}

// ─── Friends & Messaging Types ───

export interface UserProfile {
  id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  status: 'online' | 'offline' | 'away' | 'busy';
  last_seen: string;
  is_private: boolean;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  created_at: string;
  updated_at: string;
  // Joined profile info
  requester?: UserProfile;
  addressee?: UserProfile;
}

export interface Conversation {
  id: string;
  name: string | null;
  is_group: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  participants?: ConversationParticipant[];
  last_message?: Message;
  unread_count?: number;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string;
  // Joined
  user?: UserProfile;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  metadata: Record<string, unknown>;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  sender?: UserProfile;
}

export interface RealtimeNotification {
  id: string;
  user_id: string;
  type: 'friend_request' | 'message' | 'task_reminder' | 'task_due' | 'task_completed' | 'friend_accepted' | 'follow_request' | 'follow_accepted' | 'new_follower' | 'refollow';
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

// ─── Follow System Types ───

export type FollowStatus = 'requested' | 'accepted' | 'rejected';

export type FollowRelationship = 'none' | 'requested' | 'following' | 'follower' | 'mutual' | 'blocked';

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  status: FollowStatus;
  created_at: string;
  updated_at: string;
  // Joined
  follower?: UserProfile;
  following?: UserProfile;
}

export interface UserBlock {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export interface FollowHistory {
  id: string;
  follower_id: string;
  following_id: string;
  action: 'follow' | 'unfollow' | 'accept' | 'reject' | 'cancel' | 'block' | 'unblock' | 'remove_follower';
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface FollowCounts {
  followers: number;
  following: number;
}

export interface UserProfileWithFollowState extends UserProfile {
  followRelationship: FollowRelationship;
  followId?: string;
  isBlocked?: boolean;
  isMutual?: boolean;
}
