import { supabase } from '../lib/supabase';
import type { WorkSession } from '../types/database.types';

// Helper
function mapSessionFromDB(dbSession: Record<string, unknown>): WorkSession {
  return {
    ...dbSession,
    started_at: new Date(dbSession.started_at),
    ended_at: dbSession.ended_at ? new Date(dbSession.ended_at) : undefined,
    created_at: new Date(dbSession.created_at),
  };
}

// Create session
export async function startSession(
  taskId: string | null,
  duration: number,
  sessionType: 'pomodoro' | 'custom' | 'break' = 'pomodoro'
): Promise<WorkSession> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('work_sessions')
    .insert({
      user_id: user.id,
      task_id: taskId,
      session_type: sessionType,
      duration,
      started_at: new Date().toISOString(),
      completed: false,
    })
    .select()
    .single();

  if (error) throw error;
  return mapSessionFromDB(data);
}

// End session
export async function endSession(sessionId: string, completed: boolean = true) {
  const { data, error } = await supabase
    .from('work_sessions')
    .update({
      ended_at: new Date().toISOString(),
      completed,
    })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw error;
  return mapSessionFromDB(data);
}

// Get sessions
export async function getSessions(userId?: string, startDate?: Date, endDate?: Date) {
  const { data: { user } } = await supabase.auth.getUser();
  const targetUserId = userId || user?.id;
  if (!targetUserId) throw new Error('User not authenticated');

  let query = supabase
    .from('work_sessions')
    .select('*, task:task_id(*)')
    .eq('user_id', targetUserId)
    .order('started_at', { ascending: false });

  if (startDate) {
    query = query.gte('started_at', startDate.toISOString());
  }
  if (endDate) {
    query = query.lte('started_at', endDate.toISOString());
  }

  const { data, error } = await query;

  if (error) throw error;
  return data.map(mapSessionFromDB);
}

// Get today's sessions
export async function getTodaySessions() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  return getSessions(undefined, startOfDay);
}

// Calculate total focus time
export async function getTotalFocusTime(startDate: Date, endDate: Date): Promise<number> {
  const sessions = await getSessions(undefined, startDate, endDate);
  return sessions
    .filter((s) => s.completed && s.session_type !== 'break')
    .reduce((total, session) => total + session.duration, 0);
}

// Re-export as namespace for backward compat
export const WorkSessionService = {
  startSession,
  endSession,
  getSessions,
  getTodaySessions,
  getTotalFocusTime,
};
