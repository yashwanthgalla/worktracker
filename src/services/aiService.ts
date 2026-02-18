import { db } from '../lib/firebase';
import { auth } from '../lib/firebase';
import {
  collection, addDoc, getDocs, updateDoc, query, where, orderBy,
} from 'firebase/firestore';
import { TaskService } from './taskService';
import type { Task, AISuggestion } from '../types/database.types';

// ═══════════════════════════════════════════════════════
// AI Service – Firestore only (local logic)
// Suggestions: users/{uid}/ai_suggestions/{id}
// ═══════════════════════════════════════════════════════

function uid() {
  const u = auth.currentUser?.uid;
  if (!u) throw new Error('Not authenticated');
  return u;
}

function suggestionsCol() { return collection(db, 'users', uid(), 'ai_suggestions'); }

// ─── Priority Scoring ───

export function calculateAutoPriority(task: Task): number {
  let score = 0;
  const pWeights: Record<string, number> = { urgent: 40, high: 30, medium: 20, low: 10 };
  score += pWeights[task.priority] || 20;

  if (task.due_date) {
    const due = task.due_date instanceof Date ? task.due_date : new Date(task.due_date as unknown as string);
    const daysUntil = (due.getTime() - Date.now()) / 86400000;
    if (daysUntil < 0) score += 30;
    else if (daysUntil < 1) score += 25;
    else if (daysUntil < 3) score += 15;
    else if (daysUntil < 7) score += 5;
  }

  if (task.subtasks && task.subtasks.length > 0) score += 5;
  return Math.min(100, Math.max(0, score));
}

// ─── Analyze Missed / Overdue Tasks ───

export async function analyzeMissedTasks(tasks: Task[]): Promise<string[]> {
  const insights: string[] = [];
  const now = new Date();

  const overdue = tasks.filter((t) => {
    if (t.status === 'completed' || !t.due_date) return false;
    const due = t.due_date instanceof Date ? t.due_date : new Date(t.due_date as unknown as string);
    return due < now;
  });

  if (overdue.length > 0) {
    insights.push(`You have ${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}. Consider rescheduling or breaking them into smaller subtasks.`);
  }

  const urgentOverdue = overdue.filter((t) => t.priority === 'urgent' || t.priority === 'high');
  if (urgentOverdue.length > 0) {
    insights.push(`${urgentOverdue.length} high/urgent priority task${urgentOverdue.length > 1 ? 's are' : ' is'} overdue: ${urgentOverdue.map((t) => `"${t.title}"`).join(', ')}. These need immediate attention.`);
  }

  // Tasks stuck in progress for too long
  const stuckTasks = tasks.filter((t) => {
    if (t.status !== 'in_progress') return false;
    const updated = t.updated_at instanceof Date ? t.updated_at : new Date(t.updated_at as unknown as string);
    const daysSinceUpdate = (now.getTime() - updated.getTime()) / 86400000;
    return daysSinceUpdate > 3;
  });
  if (stuckTasks.length > 0) {
    insights.push(`${stuckTasks.length} task${stuckTasks.length > 1 ? 's have' : ' has'} been in progress for over 3 days without updates. Consider reviewing or breaking them down.`);
  }

  // Completion rate analysis
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const total = tasks.length;
  if (total > 0) {
    const rate = Math.round((completed / total) * 100);
    if (rate < 30) {
      insights.push(`Your completion rate is ${rate}%. Try focusing on one task at a time instead of multitasking.`);
    } else if (rate > 80) {
      insights.push(`Great job! Your completion rate is ${rate}%. Keep up the excellent momentum.`);
    }
  }

  // Tasks without due dates
  const noDueDate = tasks.filter((t) => t.status !== 'completed' && !t.due_date);
  if (noDueDate.length > 3) {
    insights.push(`${noDueDate.length} tasks have no due date set. Adding deadlines can improve your focus and accountability.`);
  }

  // No time estimates
  const noEstimate = tasks.filter((t) => t.status !== 'completed' && !t.estimated_time);
  if (noEstimate.length > 3) {
    insights.push(`${noEstimate.length} tasks are missing time estimates. Adding estimates helps plan your day more effectively.`);
  }

  return insights.length > 0 ? insights : ['All caught up! No critical issues detected with your current tasks.'];
}

// ─── Weekly Suggestions ───

export async function getWeeklySuggestions(tasks: Task[]): Promise<string[]> {
  const suggestions: string[] = [];
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 86400000);

  // Tasks due this week
  const dueThisWeek = tasks.filter((t) => {
    if (t.status === 'completed' || !t.due_date) return false;
    const due = t.due_date instanceof Date ? t.due_date : new Date(t.due_date as unknown as string);
    return due >= now && due <= weekFromNow;
  });

  if (dueThisWeek.length > 0) {
    const totalEstimated = dueThisWeek.reduce((sum, t) => sum + (t.estimated_time || 30), 0);
    suggestions.push(`You have ${dueThisWeek.length} task${dueThisWeek.length > 1 ? 's' : ''} due this week, estimated at ~${Math.round(totalEstimated / 60)} hours. Plan your schedule accordingly.`);
  }

  // Priority distribution
  const pending = tasks.filter((t) => t.status !== 'completed');
  const priorities = { urgent: 0, high: 0, medium: 0, low: 0 };
  pending.forEach((t) => { if (t.priority in priorities) priorities[t.priority as keyof typeof priorities]++; });

  if (priorities.urgent > 3) {
    suggestions.push(`You have ${priorities.urgent} urgent tasks. Consider re-evaluating priorities — not everything can be urgent at once.`);
  }

  if (priorities.low > 5) {
    suggestions.push(`${priorities.low} low-priority tasks are piling up. Schedule a "cleanup day" to tackle them and reduce mental clutter.`);
  }

  // Category insights
  const categoryMap: Record<string, number> = {};
  pending.forEach((t) => { if (t.category) categoryMap[t.category] = (categoryMap[t.category] || 0) + 1; });
  const topCategory = Object.entries(categoryMap).sort(([, a], [, b]) => b - a)[0];
  if (topCategory && topCategory[1] > 3) {
    suggestions.push(`Most of your pending tasks are in "${topCategory[0]}" (${topCategory[1]} tasks). Consider batching similar tasks together for efficiency.`);
  }

  // Recurring tasks
  const recurring = tasks.filter((t) => t.is_recurring);
  if (recurring.length > 0) {
    suggestions.push(`You have ${recurring.length} recurring task${recurring.length > 1 ? 's' : ''}. Make sure they're still relevant and adjust if needed.`);
  }

  // Work-life balance
  if (pending.length > 15) {
    suggestions.push(`You have ${pending.length} pending tasks. Consider delegating or postponing some to avoid burnout.`);
  }

  // Subtask usage
  const complexWithoutSubtasks = pending.filter((t) => (t.estimated_time || 0) > 120 && (!t.subtasks || t.subtasks.length === 0));
  if (complexWithoutSubtasks.length > 0) {
    suggestions.push(`${complexWithoutSubtasks.length} complex task${complexWithoutSubtasks.length > 1 ? 's don\'t' : ' doesn\'t'} have subtasks. Breaking them down can make progress more visible and manageable.`);
  }

  return suggestions.length > 0 ? suggestions : ['Your task distribution looks balanced! Keep maintaining this workflow.'];
}

// ─── Generate Daily Plan ───

export async function generateDailyPlan(tasks: Task[]): Promise<{ id: string; title: string; priority: string; estimated_time?: number }[]> {
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  // Filter active tasks and score them
  const candidates = tasks
    .filter((t) => t.status !== 'completed')
    .map((t) => {
      let score = 0;
      // Priority weight
      const pWeights: Record<string, number> = { urgent: 50, high: 35, medium: 20, low: 5 };
      score += pWeights[t.priority] || 15;

      // Due date urgency
      if (t.due_date) {
        const due = t.due_date instanceof Date ? t.due_date : new Date(t.due_date as unknown as string);
        const daysUntil = (due.getTime() - now.getTime()) / 86400000;
        if (daysUntil < 0) score += 40;       // Overdue
        else if (daysUntil < 1) score += 30;   // Due today
        else if (daysUntil < 2) score += 20;   // Due tomorrow
        else if (daysUntil < 7) score += 10;
      }

      // In-progress tasks get a boost
      if (t.status === 'in_progress') score += 15;

      // Tasks with dependencies completed
      if (t.dependencies && t.dependencies.length > 0) {
        const allDone = t.dependencies.every((dep) => dep.depends_on_task?.status === 'completed');
        if (allDone) score += 10;
        else score -= 20; // Blocked
      }

      return { ...t, _score: score };
    })
    .sort((a, b) => b._score - a._score)
    .slice(0, 8); // Top 8 tasks for the day

  return candidates.map((t) => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    estimated_time: t.estimated_time || undefined,
  }));
}

// ─── Productivity Score ───

export function calculateProductivityScore(tasks: Task[]): {
  score: number;
  level: string;
  completedToday: number;
  streakDays: number;
  avgCompletionTime: number;
  topCategory: string;
} {
  const now = new Date();
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);

  const completedToday = tasks.filter((t) => {
    if (t.status !== 'completed' || !t.completed_at) return false;
    const completed = t.completed_at instanceof Date ? t.completed_at : new Date(t.completed_at as unknown as string);
    return completed >= startOfDay;
  }).length;

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const completionRate = total > 0 ? completed / total : 0;

  // Calculate streak
  let streakDays = 0;
  const checkDate = new Date(now);
  for (let i = 0; i < 30; i++) {
    const dayStart = new Date(checkDate); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(checkDate); dayEnd.setHours(23, 59, 59, 999);
    const completedInDay = tasks.filter((t) => {
      if (t.status !== 'completed' || !t.completed_at) return false;
      const c = t.completed_at instanceof Date ? t.completed_at : new Date(t.completed_at as unknown as string);
      return c >= dayStart && c <= dayEnd;
    }).length;
    if (completedInDay > 0) streakDays++;
    else if (i > 0) break;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Avg completion time
  const tasksWithTime = tasks.filter((t) => t.actual_time && t.actual_time > 0);
  const avgCompletionTime = tasksWithTime.length > 0
    ? Math.round(tasksWithTime.reduce((sum, t) => sum + (t.actual_time || 0), 0) / tasksWithTime.length)
    : 0;

  // Top category
  const catCounts: Record<string, number> = {};
  tasks.forEach((t) => { if (t.category) catCounts[t.category] = (catCounts[t.category] || 0) + 1; });
  const topCategory = Object.entries(catCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'General';

  // Score: 0-100
  const score = Math.min(100, Math.round(
    completionRate * 40 +
    Math.min(completedToday, 5) * 8 +
    Math.min(streakDays, 7) * (60 / 7)
  ));

  const level = score >= 80 ? 'Outstanding' : score >= 60 ? 'Great' : score >= 40 ? 'Good' : score >= 20 ? 'Getting Started' : 'Just Beginning';

  return { score, level, completedToday, streakDays, avgCompletionTime, topCategory };
}

// ─── Pattern Analysis ───

export function analyzePatterns(tasks: Task[]): {
  peakDay: string;
  avgTasksPerDay: number;
  mostProductiveCategory: string;
  burnoutRisk: 'low' | 'medium' | 'high';
} {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayCounts = new Array(7).fill(0);

  const completedTasks = tasks.filter((t) => t.status === 'completed' && t.completed_at);
  completedTasks.forEach((t) => {
    const d = t.completed_at instanceof Date ? t.completed_at : new Date(t.completed_at as unknown as string);
    dayCounts[d.getDay()]++;
  });

  const peakDayIdx = dayCounts.indexOf(Math.max(...dayCounts));
  const peakDay = dayCounts[peakDayIdx] > 0 ? dayNames[peakDayIdx] : 'N/A';

  // Average tasks per day over last 14 days
  const now = new Date();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000);
  const recentCompleted = completedTasks.filter((t) => {
    const d = t.completed_at instanceof Date ? t.completed_at : new Date(t.completed_at as unknown as string);
    return d >= twoWeeksAgo;
  });
  const avgTasksPerDay = Math.round((recentCompleted.length / 14) * 10) / 10;

  // Most productive category
  const catMap: Record<string, number> = {};
  completedTasks.forEach((t) => { if (t.category) catMap[t.category] = (catMap[t.category] || 0) + 1; });
  const mostProductiveCategory = Object.entries(catMap).sort(([, a], [, b]) => b - a)[0]?.[0] || 'General';

  // Burnout risk
  const pending = tasks.filter((t) => t.status !== 'completed');
  const overdue = pending.filter((t) => {
    if (!t.due_date) return false;
    const due = t.due_date instanceof Date ? t.due_date : new Date(t.due_date as unknown as string);
    return due < now;
  });
  const burnoutRisk: 'low' | 'medium' | 'high' =
    overdue.length > 5 || pending.length > 20 ? 'high' :
    overdue.length > 2 || pending.length > 10 ? 'medium' : 'low';

  return { peakDay, avgTasksPerDay, mostProductiveCategory, burnoutRisk };
}

// ─── Smart Suggestions ───

export async function generateSmartSuggestions(tasks: Task[]): Promise<AISuggestion[]> {
  const suggestions: AISuggestion[] = [];
  const userId = uid();

  for (const task of tasks) {
    if (task.status === 'completed') continue;

    if (task.due_date) {
      const due = task.due_date instanceof Date ? task.due_date : new Date(task.due_date as unknown as string);
      if (due < new Date()) {
        suggestions.push({
          id: `overdue-${task.id}`, user_id: userId, task_id: task.id,
          suggestion_type: 'deadline_warning',
          content: { message: `"${task.title}" is overdue. Consider updating the deadline or prioritizing it.`, action: 'reschedule', urgency: 'high' },
          applied: false, created_at: new Date(),
        });
      }
    }

    if ((task.priority === 'urgent' || task.priority === 'high') && task.status === 'pending') {
      suggestions.push({
        id: `priority-${task.id}`, user_id: userId, task_id: task.id,
        suggestion_type: 'priority_alert',
        content: { message: `"${task.title}" is ${task.priority} priority but hasn't been started yet.`, action: 'start_now', urgency: task.priority === 'urgent' ? 'critical' : 'high' },
        applied: false, created_at: new Date(),
      });
    }

    if (!task.estimated_time) {
      suggestions.push({
        id: `time-${task.id}`, user_id: userId, task_id: task.id,
        suggestion_type: 'time_estimate',
        content: { message: `Consider adding a time estimate for "${task.title}" to improve planning.`, action: 'add_estimate', suggested_time: 30 },
        applied: false, created_at: new Date(),
      });
    }
  }

  return suggestions.slice(0, 10);
}

// ─── Persistence ───

export async function saveSuggestion(suggestion: AISuggestion): Promise<void> {
  await addDoc(suggestionsCol(), {
    user_id: uid(), task_id: suggestion.task_id,
    suggestion_type: suggestion.suggestion_type,
    content: suggestion.content,
    applied: false, created_at: new Date().toISOString(),
  });
}

export async function applySuggestion(suggestionId: string): Promise<void> {
  const q = query(suggestionsCol());
  const snap = await getDocs(q);
  const found = snap.docs.find((d) => d.id === suggestionId);
  if (found) await updateDoc(found.ref, { applied: true });
}

export async function getSuggestions(): Promise<AISuggestion[]> {
  const q = query(suggestionsCol(), where('applied', '==', false), orderBy('created_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id, user_id: data.user_id, task_id: data.task_id,
      suggestion_type: data.suggestion_type,
      content: data.content as Record<string, unknown>,
      applied: data.applied,
      created_at: data.created_at ? new Date(data.created_at) : new Date(),
    } as AISuggestion;
  });
}

// ─── Batch recalculate priorities ───

export async function recalculatePriorities(): Promise<void> {
  const tasks = await TaskService.getTasks();
  for (const task of tasks) {
    if (task.status === 'completed') continue;
    const score = calculateAutoPriority(task);
    if (score !== task.auto_priority_score) {
      await TaskService.updateTask(task.id, { auto_priority_score: score });
    }
  }
}

export const AIService = {
  calculateAutoPriority, generateSmartSuggestions,
  saveSuggestion, applySuggestion, getSuggestions, recalculatePriorities,
  analyzeMissedTasks, getWeeklySuggestions, generateDailyPlan,
  calculateProductivityScore, analyzePatterns,
};
