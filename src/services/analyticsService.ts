import { supabase } from '../lib/supabase';
import type { ProductivityMetrics, TaskAnalytics, ProductivityTrend } from '../types/database.types';
import { getTasks } from './taskService';
import { getSessions, getTodaySessions } from './workSessionService';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

// Calculate daily productivity score (0-100)
function calculateDailyScore(
  completionRate: number,
  focusTime: number,
  missedDeadlines: number
): number {
  const completionWeight = 0.5;
  const focusWeight = 0.3;
  const deadlineWeight = 0.2;

  const normalizedFocus = Math.min((focusTime / 480) * 100, 100);
  const deadlinePenalty = Math.min(missedDeadlines * 10, 50);

  const score =
    completionRate * completionWeight +
    normalizedFocus * focusWeight +
    (100 - deadlinePenalty) * deadlineWeight;

  return Math.round(Math.max(0, Math.min(100, score)));
}

// Calculate burnout risk
function calculateBurnoutRisk(
  focusTime: number,
  taskCount: number
): 'low' | 'medium' | 'high' {
  const focusRisk = focusTime > 600;
  const taskRisk = taskCount > 20;

  if (focusRisk && taskRisk) return 'high';
  if (focusRisk || taskRisk) return 'medium';
  return 'low';
}

// Get productivity metrics for today
export async function getDailyProductivityMetrics(): Promise<ProductivityMetrics> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const today = new Date();
  const startDate = startOfDay(today);
  const endDate = endOfDay(today);

  const tasks = await getTasks(user.id);
  const todayTasks = tasks.filter((t) => {
    const createdToday = t.created_at >= startDate && t.created_at <= endDate;
    const dueToday = t.due_date && t.due_date >= startDate && t.due_date <= endDate;
    return createdToday || dueToday;
  });

  const sessions = await getTodaySessions();
  const totalFocusTime = sessions
    .filter((s) => s.completed && s.session_type !== 'break')
    .reduce((sum, s) => sum + s.duration, 0);

  const tasksCompleted = todayTasks.filter((t) => t.status === 'completed').length;
  const totalTasks = todayTasks.length;
  const completionRate = totalTasks > 0 ? (tasksCompleted / totalTasks) * 100 : 0;

  const missedDeadlines = tasks.filter((t) => {
    return t.due_date && t.due_date < today && t.status !== 'completed';
  }).length;

  const daily_score = calculateDailyScore(completionRate, totalFocusTime, missedDeadlines);
  const burnout_risk = calculateBurnoutRisk(totalFocusTime, todayTasks.length);

  return {
    daily_score,
    tasks_completed: tasksCompleted,
    total_focus_time: totalFocusTime,
    missed_deadlines: missedDeadlines,
    completion_rate: completionRate,
    burnout_risk,
  };
}

// Get task analytics
export async function getTaskAnalytics(): Promise<TaskAnalytics> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const tasks = await getTasks(user.id);
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  const completion_rate =
    tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;

  const tasksWithTime = completedTasks.filter((t) => t.actual_time);
  const avg_completion_time =
    tasksWithTime.length > 0
      ? tasksWithTime.reduce((sum, t) => sum + (t.actual_time || 0), 0) /
        tasksWithTime.length
      : 0;

  const overdue_count = tasks.filter(
    (t) =>
      t.due_date &&
      t.due_date < new Date() &&
      t.status !== 'completed'
  ).length;

  const by_priority: Record<string, number> = {
    low: 0,
    medium: 0,
    high: 0,
    urgent: 0,
  };
  tasks.forEach((t) => {
    by_priority[t.priority] = (by_priority[t.priority] || 0) + 1;
  });

  const by_category: Record<string, number> = {};
  tasks.forEach((t) => {
    if (t.category) {
      by_category[t.category] = (by_category[t.category] || 0) + 1;
    }
  });

  const productivity_trends = await getProductivityTrends(30);

  return {
    completion_rate,
    avg_completion_time,
    overdue_count,
    by_priority,
    by_category,
    productivity_trends,
  };
}

// Get productivity trends
export async function getProductivityTrends(days: number = 30): Promise<ProductivityTrend[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const trends: ProductivityTrend[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(today, i);
    const startDate = startOfDay(date);
    const endDate = endOfDay(date);

    const sessions = await getSessions(user.id, startDate, endDate);

    const focusTime = sessions
      .filter((s) => s.completed && s.session_type !== 'break')
      .reduce((sum, s) => sum + s.duration, 0);

    const tasks = await getTasks(user.id);
    const completedOnDay = tasks.filter(
      (t) =>
        t.completed_at &&
        t.completed_at >= startDate &&
        t.completed_at <= endDate
    ).length;

    const score = calculateDailyScore(
      completedOnDay > 0 ? 100 : 0,
      focusTime,
      0
    );

    trends.push({
      date: format(date, 'yyyy-MM-dd'),
      score,
      tasks_completed: completedOnDay,
      focus_time: focusTime,
    });
  }

  return trends;
}

// Log activity
export async function logActivity(taskId: string, action: string, details?: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  await supabase.from('activity_logs').insert({
    user_id: user.id,
    task_id: taskId,
    action,
    details,
  } as any);
}

// Re-export as namespace for backward compat
export const AnalyticsService = {
  getDailyProductivityMetrics,
  getTaskAnalytics,
  getProductivityTrends,
  logActivity,
};
