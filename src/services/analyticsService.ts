import { db } from '../lib/firebase';
import { auth } from '../lib/firebase';
import {
  collection, addDoc,
} from 'firebase/firestore';
import { TaskService } from './taskService';
import { WorkSessionService } from './workSessionService';
import type { Task, ProductivityMetrics, TaskAnalytics, ProductivityTrend } from '../types/database.types';

// ═══════════════════════════════════════════════════════
// Analytics Service – Firestore only
// Activity logs: users/{uid}/activity_logs/{id}
// ═══════════════════════════════════════════════════════

function uid() {
  const u = auth.currentUser?.uid;
  if (!u) throw new Error('Not authenticated');
  return u;
}

function activityCol() { return collection(db, 'users', uid(), 'activity_logs'); }

// ─── Activity Logging ───

export async function logActivity(taskId: string, action: string, details?: Record<string, unknown>) {
  await addDoc(activityCol(), {
    user_id: uid(),
    task_id: taskId,
    action,
    details: details || null,
    created_at: new Date().toISOString(),
  });
}

// ─── Dashboard Metrics ───

export async function getDailyProductivityMetrics(): Promise<ProductivityMetrics> {
  const [tasks, sessions] = await Promise.all([
    TaskService.getTasks(),
    WorkSessionService.getTodaySessions(),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const completedToday = tasks.filter((t) => {
    if (t.status !== 'completed' || !t.completed_at) return false;
    const d = t.completed_at instanceof Date ? t.completed_at : new Date(t.completed_at);
    return d >= today;
  });

  const totalFocusTime = sessions.filter((s) => s.completed && s.session_type !== 'break')
    .reduce((acc, s) => acc + (s.duration || 0), 0);

  const now = new Date();
  const overdue = tasks.filter((t) => {
    if (t.status === 'completed' || !t.due_date) return false;
    const d = t.due_date instanceof Date ? t.due_date : new Date(t.due_date);
    return d < now;
  });

  const total = tasks.length || 1;
  const completedAll = tasks.filter((t) => t.status === 'completed').length;
  const completionRate = Math.round((completedAll / total) * 100);

  // Streak (consecutive days with completed tasks, simplified)
  const streak = calculateStreak(tasks);

  // Burnout risk
  let burnoutRisk: ProductivityMetrics['burnout_risk'] = 'low';
  if (totalFocusTime > 6 * 3600) burnoutRisk = 'high';
  else if (totalFocusTime > 4 * 3600) burnoutRisk = 'medium';

  const score = Math.min(100, Math.round(
    (completedToday.length * 15) + (totalFocusTime / 60) + (completionRate * 0.3) - (overdue.length * 5),
  ));

  return {
    daily_score: Math.max(0, score),
    tasks_completed: completedToday.length,
    total_focus_time: totalFocusTime,
    missed_deadlines: overdue.length,
    completion_rate: completionRate,
    burnout_risk: burnoutRisk,
    streak,
    best_streak: streak, // simplified
  };
}

function calculateStreak(tasks: Task[]): number {
  const completed = tasks
    .filter((t) => t.status === 'completed' && t.completed_at)
    .map((t) => {
      const d = t.completed_at instanceof Date ? t.completed_at : new Date(t.completed_at as unknown as string);
      return d.toDateString();
    });
  const unique = [...new Set(completed)].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  let streak = 0;
  const day = new Date();
  for (const dateStr of unique) {
    if (new Date(dateStr).toDateString() === day.toDateString()) { streak++; day.setDate(day.getDate() - 1); }
    else if (new Date(dateStr).toDateString() === new Date(day.getTime() - 86400000).toDateString()) { streak++; day.setDate(day.getDate() - 1); }
    else break;
  }
  return streak;
}

// ─── Task Analytics ───

export async function getTaskAnalytics(): Promise<TaskAnalytics> {
  const tasks = await TaskService.getTasks();
  const total = tasks.length || 1;
  const completed = tasks.filter((t) => t.status === 'completed');
  const completionRate = Math.round((completed.length / total) * 100);

  const avgTime = completed.length > 0
    ? completed.reduce((acc, t) => acc + (t.actual_time || t.estimated_time || 0), 0) / completed.length
    : 0;

  const now = new Date();
  const overdue = tasks.filter((t) => {
    if (t.status === 'completed' || !t.due_date) return false;
    const d = t.due_date instanceof Date ? t.due_date : new Date(t.due_date);
    return d < now;
  });

  const byPriority: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  tasks.forEach((t) => {
    byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
    if (t.category) byCategory[t.category] = (byCategory[t.category] || 0) + 1;
  });

  const trends = await getProductivityTrends(30);

  return {
    completion_rate: completionRate,
    avg_completion_time: Math.round(avgTime),
    overdue_count: overdue.length,
    by_priority: byPriority,
    by_category: byCategory,
    productivity_trends: trends,
  };
}

// ─── Trends ───

export async function getProductivityTrends(days: number = 30): Promise<ProductivityTrend[]> {
  const tasks = await TaskService.getTasks();
  const trends: ProductivityTrend[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    day.setHours(0, 0, 0, 0);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);

    const dayCompleted = tasks.filter((t) => {
      if (t.status !== 'completed' || !t.completed_at) return false;
      const d = t.completed_at instanceof Date ? t.completed_at : new Date(t.completed_at as unknown as string);
      return d >= day && d < nextDay;
    });

    trends.push({
      date: day.toISOString().split('T')[0],
      score: dayCompleted.length * 10,
      tasks_completed: dayCompleted.length,
      focus_time: 0, // Would need sessions-by-date query
    });
  }
  return trends;
}

export const AnalyticsService = {
  logActivity, getDailyProductivityMetrics, getTaskAnalytics, getProductivityTrends,
};
