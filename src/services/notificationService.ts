import { supabase } from '../lib/supabase';
import { EmailTemplates } from './emailTemplates';
import { isBefore, isToday, addDays, startOfDay, format } from 'date-fns';
import type { Task } from '../types/database.types';

const APP_URL = window.location.origin;

// ═══════════════════════════════════════════
// Email Notification Service
// Checks tasks and triggers email notifications
// for due dates, completions, and digests.
// ═══════════════════════════════════════════

/** Get user email from auth session */
async function getCurrentUserEmail(): Promise<{ email: string; name: string } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;
  return {
    email: user.email,
    name: user.user_metadata?.full_name || user.email.split('@')[0],
  };
}

/** Send email via Supabase Edge Function (or fallback to client-side storage for demo) */
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    // Try calling the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { to, subject, html },
    });

    if (error) {
      console.warn('Edge Function not available, storing notification locally:', error.message);
      storeNotificationLocally(to, subject, html);
      return false;
    }

    return data?.success || false;
  } catch (err) {
    console.warn('Email sending failed, storing locally:', err);
    storeNotificationLocally(to, subject, html);
    return false;
  }
}

/** Store notification locally when edge function is unavailable */
function storeNotificationLocally(to: string, subject: string, html: string) {
  const notifications = JSON.parse(localStorage.getItem('worktracker_notifications') || '[]');
  notifications.push({
    id: crypto.randomUUID(),
    to,
    subject,
    html,
    createdAt: new Date().toISOString(),
    read: false,
  });
  // Keep only last 50
  if (notifications.length > 50) notifications.splice(0, notifications.length - 50);
  localStorage.setItem('worktracker_notifications', JSON.stringify(notifications));
}

/** Get locally stored notifications */
export function getStoredNotifications(): Array<{
  id: string;
  to: string;
  subject: string;
  html: string;
  createdAt: string;
  read: boolean;
}> {
  return JSON.parse(localStorage.getItem('worktracker_notifications') || '[]');
}

/** Mark notification as read */
export function markNotificationRead(id: string) {
  const notifications = getStoredNotifications();
  const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
  localStorage.setItem('worktracker_notifications', JSON.stringify(updated));
}

/** Clear all notifications */
export function clearNotifications() {
  localStorage.removeItem('worktracker_notifications');
}

// ─── Check & Send Logic ──────────────────────────

/** Check for tasks approaching or past due and send reminder */
export async function checkAndSendDueReminders(tasks: Task[]): Promise<void> {
  const user = await getCurrentUserEmail();
  if (!user) return;

  const now = startOfDay(new Date());
  const threeDaysFromNow = addDays(now, 3);

  // Last reminder check timestamp
  const lastCheck = localStorage.getItem('worktracker_last_due_check');
  const lastCheckDate = lastCheck ? new Date(lastCheck) : null;

  // Only send once per day
  if (lastCheckDate && isToday(lastCheckDate)) return;

  const overdue: Array<{ title: string; priority: string; due_date: string; status: 'overdue' }> = [];
  const dueToday: Array<{ title: string; priority: string; due_date: string; status: 'due_today' }> = [];
  const upcoming: Array<{ title: string; priority: string; due_date: string; status: 'upcoming' }> = [];

  tasks.forEach((task) => {
    if (task.status === 'completed' || !task.due_date) return;

    const dueDate = new Date(task.due_date);
    const formattedDue = format(dueDate, 'MMM d, yyyy');

    if (isBefore(dueDate, now)) {
      overdue.push({ title: task.title, priority: task.priority, due_date: formattedDue, status: 'overdue' });
    } else if (isToday(dueDate)) {
      dueToday.push({ title: task.title, priority: task.priority, due_date: formattedDue, status: 'due_today' });
    } else if (isBefore(dueDate, threeDaysFromNow)) {
      upcoming.push({ title: task.title, priority: task.priority, due_date: formattedDue, status: 'upcoming' });
    }
  });

  const allNotifiable = [...overdue, ...dueToday, ...upcoming];
  if (allNotifiable.length === 0) return;

  const html = EmailTemplates.dueDateReminderEmail({
    userName: user.name,
    tasks: allNotifiable,
    appUrl: APP_URL,
  });

  const count = allNotifiable.length;
  const subject = overdue.length > 0
    ? `⚠️ ${overdue.length} overdue task${overdue.length > 1 ? 's' : ''} + ${dueToday.length + upcoming.length} due soon`
    : `📋 ${count} task${count > 1 ? 's' : ''} due soon — WorkTracker`;

  await sendEmail(user.email, subject, html);
  localStorage.setItem('worktracker_last_due_check', new Date().toISOString());
}

/** Send task completion celebration email */
export async function sendTaskCompletedNotification(
  completedTask: Task,
  allTasks: Task[],
): Promise<void> {
  const user = await getCurrentUserEmail();
  if (!user) return;

  // Only send for every 5th task completed to avoid spam, or for high-priority tasks
  const completedCount = allTasks.filter((t) => t.status === 'completed').length;
  const isHighPriority = completedTask.priority === 'urgent' || completedTask.priority === 'high';
  const isMilestone = completedCount % 5 === 0;

  if (!isHighPriority && !isMilestone) return;

  // Calculate streak (consecutive days with completed tasks)
  const dates = new Set(
    allTasks
      .filter((t) => t.completed_at)
      .map((t) => startOfDay(new Date(t.completed_at!)).toISOString())
  );
  let streak = 0;
  let checkDate = startOfDay(new Date());
  while (dates.has(checkDate.toISOString())) {
    streak++;
    checkDate = addDays(checkDate, -1);
  }

  const html = EmailTemplates.taskCompletedEmail({
    userName: user.name,
    taskTitle: completedTask.title,
    completedCount,
    totalTasks: allTasks.length,
    streak: streak > 1 ? streak : undefined,
    appUrl: APP_URL,
  });

  const subject = isMilestone
    ? `🎉 Milestone! ${completedCount} tasks completed — WorkTracker`
    : `✅ "${completedTask.title}" completed — WorkTracker`;

  await sendEmail(user.email, subject, html);
}

/** Send daily digest email */
export async function sendDailyDigest(
  tasks: Task[],
  productivityScore: number,
  focusMinutes: number,
): Promise<void> {
  const user = await getCurrentUserEmail();
  if (!user) return;

  const lastDigest = localStorage.getItem('worktracker_last_digest');
  const lastDigestDate = lastDigest ? new Date(lastDigest) : null;
  if (lastDigestDate && isToday(lastDigestDate)) return;

  const now = startOfDay(new Date());
  const tomorrow = addDays(now, 1);
  const dayAfter = addDays(now, 2);

  const completedToday = tasks.filter(
    (t) => t.completed_at && isToday(new Date(t.completed_at))
  ).length;

  const overdueCount = tasks.filter(
    (t) => t.due_date && t.status !== 'completed' && isBefore(new Date(t.due_date), now)
  ).length;

  const upcomingTasks = tasks
    .filter((t) => {
      if (!t.due_date || t.status === 'completed') return false;
      const d = new Date(t.due_date);
      return isToday(d) ||
        (isBefore(d, dayAfter) && !isBefore(d, tomorrow));
    })
    .slice(0, 5)
    .map((t) => ({
      title: t.title,
      priority: t.priority,
      due_date: format(new Date(t.due_date!), 'MMM d'),
    }));

  const html = EmailTemplates.dailyDigestEmail({
    userName: user.name,
    date: format(new Date(), 'EEEE, MMMM d, yyyy'),
    completedToday,
    focusMinutes,
    productivityScore,
    overdueCount,
    upcomingTasks,
    appUrl: APP_URL,
  });

  await sendEmail(user.email, `📊 Daily Digest — ${format(new Date(), 'MMM d')}`, html);
  localStorage.setItem('worktracker_last_digest', new Date().toISOString());
}

// Re-export as namespace
export const NotificationService = {
  checkAndSendDueReminders,
  sendTaskCompletedNotification,
  sendDailyDigest,
  getStoredNotifications,
  markNotificationRead,
  clearNotifications,
};
