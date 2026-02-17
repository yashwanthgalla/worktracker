// Database Types
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          status: 'pending' | 'in_progress' | 'completed'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          due_date: string | null
          estimated_time: number | null
          actual_time: number | null
          parent_task_id: string | null
          is_recurring: boolean
          recurrence_rule: Json | null
          auto_priority_score: number | null
          category: string | null
          tags: string[] | null
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          status?: 'pending' | 'in_progress' | 'completed'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          due_date?: string | null
          estimated_time?: number | null
          actual_time?: number | null
          parent_task_id?: string | null
          is_recurring?: boolean
          recurrence_rule?: Json | null
          auto_priority_score?: number | null
          category?: string | null
          tags?: string[] | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          status?: 'pending' | 'in_progress' | 'completed'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          due_date?: string | null
          estimated_time?: number | null
          actual_time?: number | null
          parent_task_id?: string | null
          is_recurring?: boolean
          recurrence_rule?: Json | null
          auto_priority_score?: number | null
          category?: string | null
          tags?: string[] | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          }
        ]
      }
      task_dependencies: {
        Row: {
          id: string
          task_id: string
          depends_on_task_id: string
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          depends_on_task_id: string
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          depends_on_task_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_dependencies_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_depends_on_task_id_fkey"
            columns: ["depends_on_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          }
        ]
      }
      work_sessions: {
        Row: {
          id: string
          user_id: string
          task_id: string | null
          session_type: 'pomodoro' | 'custom' | 'break'
          duration: number
          started_at: string
          ended_at: string | null
          completed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          task_id?: string | null
          session_type?: 'pomodoro' | 'custom' | 'break'
          duration: number
          started_at: string
          ended_at?: string | null
          completed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          task_id?: string | null
          session_type?: 'pomodoro' | 'custom' | 'break'
          duration?: number
          started_at?: string
          ended_at?: string | null
          completed?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_sessions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          }
        ]
      }
      activity_logs: {
        Row: {
          id: string
          user_id: string
          task_id: string
          action: string
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          task_id: string
          action: string
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          task_id?: string
          action?: string
          details?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          }
        ]
      }
      ai_suggestions: {
        Row: {
          id: string
          user_id: string
          task_id: string
          suggestion_type: string
          content: Json
          applied: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          task_id: string
          suggestion_type: string
          content: Json
          applied?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          task_id?: string
          suggestion_type?: string
          content?: Json
          applied?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_suggestions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          }
        ]
      }
      task_shares: {
        Row: {
          id: string
          task_id: string
          shared_with_user_id: string
          permission: 'view' | 'edit' | 'admin'
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          shared_with_user_id: string
          permission?: 'view' | 'edit' | 'admin'
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          shared_with_user_id?: string
          permission?: 'view' | 'edit' | 'admin'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_shares_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          }
        ]
      }
      user_profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          status: 'online' | 'offline' | 'away' | 'busy'
          last_seen: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          status?: 'online' | 'offline' | 'away' | 'busy'
          last_seen?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          status?: 'online' | 'offline' | 'away' | 'busy'
          last_seen?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          id: string
          requester_id: string
          addressee_id: string
          status: 'pending' | 'accepted' | 'rejected' | 'blocked'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          requester_id: string
          addressee_id: string
          status?: 'pending' | 'accepted' | 'rejected' | 'blocked'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          requester_id?: string
          addressee_id?: string
          status?: 'pending' | 'accepted' | 'rejected' | 'blocked'
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      conversations: {
        Row: {
          id: string
          name: string | null
          is_group: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name?: string | null
          is_group?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          is_group?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          id: string
          conversation_id: string
          user_id: string
          joined_at: string
          last_read_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          user_id: string
          joined_at?: string
          last_read_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          user_id?: string
          joined_at?: string
          last_read_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          content: string
          message_type: 'text' | 'image' | 'file' | 'system'
          metadata: Json | null
          is_edited: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          content: string
          message_type?: 'text' | 'image' | 'file' | 'system'
          metadata?: Json | null
          is_edited?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string
          content?: string
          message_type?: 'text' | 'image' | 'file' | 'system'
          metadata?: Json | null
          is_edited?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      realtime_notifications: {
        Row: {
          id: string
          user_id: string
          type: 'friend_request' | 'message' | 'task_reminder' | 'task_due' | 'task_completed' | 'friend_accepted'
          title: string
          body: string | null
          data: Json | null
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'friend_request' | 'message' | 'task_reminder' | 'task_due' | 'task_completed' | 'friend_accepted'
          title: string
          body?: string | null
          data?: Json | null
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'friend_request' | 'message' | 'task_reminder' | 'task_due' | 'task_completed' | 'friend_accepted'
          title?: string
          body?: string | null
          data?: Json | null
          read?: boolean
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Application-level types
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
  details?: any;
  created_at: Date;
  task?: Task;
}

export interface AISuggestion {
  id: string;
  user_id: string;
  task_id: string;
  suggestion_type: string;
  content: any;
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
  full_name: string | null;
  avatar_url: string | null;
  status: 'online' | 'offline' | 'away' | 'busy';
  last_seen: string;
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
  metadata: any;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  sender?: UserProfile;
}

export interface RealtimeNotification {
  id: string;
  user_id: string;
  type: 'friend_request' | 'message' | 'task_reminder' | 'task_due' | 'task_completed' | 'friend_accepted';
  title: string;
  body: string | null;
  data: any;
  read: boolean;
  created_at: string;
}
