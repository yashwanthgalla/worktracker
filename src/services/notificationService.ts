import { auth } from '../lib/firebase';
import { db } from '../lib/firebase';
import {
  collection, doc, addDoc, getDocs, updateDoc, getDoc, setDoc, query, orderBy, limit, where,
  deleteDoc,
} from 'firebase/firestore';
import type { Task } from '../types/database.types';
import { dueDateReminderEmail, taskCompletedEmail, dailyDigestEmail } from './emailTemplates';

// ═══════════════════════════════════════════════════════
// Notification Service – Firebase Firestore
// Collections:
//   users/{uid}/notification_log/{id}
//   users/{uid}/notification_preferences  (single doc)
//   users/{uid}/notifications/{id}  (realtime_notifications)
// ═══════════════════════════════════════════════════════

function uid() {
  const u = auth.currentUser?.uid;
  if (!u) throw new Error('Not authenticated');
  return u;
}

function notifLogCol() { return collection(db, 'users', uid(), 'notification_log'); }
function notifPrefsDoc() { return doc(db, 'users', uid(), 'notification_preferences', 'prefs'); }
function realtimeNotifCol() { return collection(db, 'users', uid(), 'notifications'); }

const APP_URL = window.location.origin;

// ─── Notification Preferences ───

export interface NotificationPreferences {
  email_due_reminders: boolean;
  email_task_completed: boolean;
  email_daily_digest: boolean;
  email_friend_requests: boolean;
  email_messages: boolean;
  push_enabled: boolean;
  quiet_hours_start: string | null; // HH:mm
  quiet_hours_end: string | null;
  updated_at: string;
}

const DEFAULT_PREFS: NotificationPreferences = {
  email_due_reminders: true,
  email_task_completed: true,
  email_daily_digest: true,
  email_friend_requests: true,
  email_messages: true,
  push_enabled: false,
  quiet_hours_start: null,
  quiet_hours_end: null,
  updated_at: new Date().toISOString(),
};

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const snap = await getDoc(notifPrefsDoc());
    if (snap.exists()) return snap.data() as NotificationPreferences;
    // Create default prefs
    await setDoc(notifPrefsDoc(), DEFAULT_PREFS);
    return { ...DEFAULT_PREFS };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export async function updateNotificationPreferences(updates: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
  const current = await getNotificationPreferences();
  const merged = { ...current, ...updates, updated_at: new Date().toISOString() };
  await setDoc(notifPrefsDoc(), merged);
  return merged;
}

// ─── Notification Log (Firestore) ───

export interface NotificationLogEntry {
  id: string;
  type: string;
  subject: string;
  to: string;
  channel: 'email' | 'push' | 'in_app';
  status: 'sent' | 'failed' | 'pending';
  read: boolean;
  created_at: string;
}

async function logNotification(type: string, subject: string, to: string, channel: 'email' | 'push' | 'in_app' = 'email') {
  try {
    await addDoc(notifLogCol(), {
      type,
      subject,
      to,
      channel,
      status: 'sent',
      read: false,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('[NotificationService] Failed to log notification:', e);
  }
}

export async function getNotificationLog(maxItems = 50): Promise<NotificationLogEntry[]> {
  try {
    const q = query(notifLogCol(), orderBy('created_at', 'desc'), limit(maxItems));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<NotificationLogEntry, 'id'>) }));
  } catch {
    return [];
  }
}

export async function markNotificationLogRead(id: string) {
  try {
    await updateDoc(doc(db, 'users', uid(), 'notification_log', id), { read: true });
  } catch { /* */ }
}

export async function clearNotificationLog() {
  try {
    const snap = await getDocs(notifLogCol());
    for (const d of snap.docs) {
      await deleteDoc(d.ref);
    }
  } catch { /* */ }
}

// ─── Realtime Notifications (Firestore) ───

export async function getRealtimeNotifications(maxItems = 50): Promise<import('../types/database.types').RealtimeNotification[]> {
  try {
    const q = query(realtimeNotifCol(), orderBy('created_at', 'desc'), limit(maxItems));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<import('../types/database.types').RealtimeNotification, 'id'>) }));
  } catch {
    return [];
  }
}

export async function markRealtimeNotificationRead(id: string) {
  await updateDoc(doc(db, 'users', uid(), 'notifications', id), { read: true });
}

export async function markAllRealtimeNotificationsRead() {
  const q = query(realtimeNotifCol(), where('read', '==', false));
  const snap = await getDocs(q);
  for (const d of snap.docs) {
    await updateDoc(d.ref, { read: true });
  }
}

export async function deleteRealtimeNotification(id: string) {
  await deleteDoc(doc(db, 'users', uid(), 'notifications', id));
}

// ─── Email sending (simulated – logs to Firestore) ───

function getCurrentUserEmail(): string | null {
  return auth.currentUser?.email ?? null;
}

function getUserName(): string {
  return auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'there';
}

async function sendEmail(to: string, subject: string, _html: string) {
  // In production this would call a cloud function. Log to Firestore.
  console.log(`[NotificationService] Email to=${to} subject="${subject}"`);
  await logNotification('email', subject, to, 'email');
}

// ─── Due Reminders ───

export async function checkAndSendDueReminders(tasks: Task[]) {
  const email = getCurrentUserEmail();
  if (!email) return;
  const lastKey = `worktracker_last_reminder_${email}`;
  const last = localStorage.getItem(lastKey);
  const today = new Date().toDateString();
  if (last === today) return;

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(23, 59, 59, 999);

  const dueSoon = tasks.filter((t) => {
    if (t.status === 'completed' || !t.due_date) return false;
    const d = t.due_date instanceof Date ? t.due_date : new Date(t.due_date);
    return d <= tomorrow;
  });

  if (dueSoon.length === 0) return;
  const html = dueDateReminderEmail({
    userName: getUserName(),
    tasks: dueSoon.map((t) => {
      const due = t.due_date instanceof Date ? t.due_date : new Date(t.due_date as unknown as string);
      const isOverdue = due < now;
      const isToday = due.toDateString() === now.toDateString();
      return {
        title: t.title,
        priority: t.priority,
        due_date: due.toLocaleDateString(),
        status: isOverdue ? 'overdue' as const : isToday ? 'due_today' as const : 'upcoming' as const,
      };
    }),
    appUrl: APP_URL,
  });
  await sendEmail(email, `⏰ ${dueSoon.length} task(s) due soon`, html);
  localStorage.setItem(lastKey, today);
}

// ─── Task Completed ───

export async function sendTaskCompletedNotification(task: Task, allTasks: Task[]) {
  const email = getCurrentUserEmail();
  if (!email) return;
  const totalDone = allTasks.filter((t) => t.status === 'completed').length;
  const html = taskCompletedEmail({
    userName: getUserName(),
    taskTitle: task.title,
    completedCount: totalDone,
    totalTasks: allTasks.length,
    appUrl: APP_URL,
  });
  await sendEmail(email, `✅ Task completed: ${task.title}`, html);
}

// ─── Daily Digest ───

export async function sendDailyDigest(tasks: Task[], score: number, focusMinutes: number) {
  const email = getCurrentUserEmail();
  if (!email) return;
  const now = new Date();
  const completedToday = tasks.filter((t) => {
    if (t.status !== 'completed' || !t.completed_at) return false;
    const d = t.completed_at instanceof Date ? t.completed_at : new Date(t.completed_at as unknown as string);
    return d.toDateString() === now.toDateString();
  }).length;
  const overdueCount = tasks.filter((t) => {
    if (t.status === 'completed' || !t.due_date) return false;
    const d = t.due_date instanceof Date ? t.due_date : new Date(t.due_date as unknown as string);
    return d < now;
  }).length;
  const upcoming = tasks
    .filter((t) => t.status !== 'completed' && t.due_date)
    .slice(0, 5)
    .map((t) => ({
      title: t.title,
      priority: t.priority,
      due_date: (t.due_date instanceof Date ? t.due_date : new Date(t.due_date as unknown as string)).toLocaleDateString(),
    }));
  const html = dailyDigestEmail({
    userName: getUserName(),
    date: now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    completedToday,
    focusMinutes,
    productivityScore: score,
    overdueCount,
    upcomingTasks: upcoming,
    appUrl: APP_URL,
  });
  await sendEmail(email, '📊 Your daily productivity digest', html);
}

// ─── Stored notification helpers (legacy compat – now backed by Firestore) ───

export function getStoredNotifications(): NotificationLogEntry[] {
  // Synchronous fallback – real data comes from getNotificationLog()
  return [];
}

export function markNotificationRead(id: string) {
  markNotificationLogRead(id);
}

export function clearNotifications() {
  clearNotificationLog();
}

export const NotificationService = {
  // Preferences
  getNotificationPreferences,
  updateNotificationPreferences,
  // Notification log
  getNotificationLog,
  markNotificationLogRead,
  clearNotificationLog,
  // Realtime notifications
  getRealtimeNotifications,
  markRealtimeNotificationRead,
  markAllRealtimeNotificationsRead,
  deleteRealtimeNotification,
  // Email triggers
  checkAndSendDueReminders,
  sendTaskCompletedNotification,
  sendDailyDigest,
  // Legacy compat
  getStoredNotifications,
  markNotificationRead,
  clearNotifications,
};
