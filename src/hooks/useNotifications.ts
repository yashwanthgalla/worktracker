import { useEffect, useRef, useCallback } from 'react';
import { useTasks } from './useTasks';
import { useAppStore } from '../store/appStore';
import { NotificationService } from '../services/notificationService';
import type { Task } from '../types/database.types';

/**
 * Hook that manages email notifications:
 * - Checks for due-soon tasks on load (once per day)
 * - Exposes a function to trigger task-completed emails
 * - Exposes a function to trigger daily digest
 */
export const useNotifications = () => {
  const { data: tasks } = useTasks();
  const productivityMetrics = useAppStore((s) => s.productivityMetrics);
  const checkedRef = useRef(false);

  // Check due reminders once per session/day
  useEffect(() => {
    if (!tasks || tasks.length === 0 || checkedRef.current) return;
    checkedRef.current = true;

    // Slight delay so it doesn't block initial render
    const timer = setTimeout(() => {
      NotificationService.checkAndSendDueReminders(tasks).catch(console.warn);
    }, 3000);

    return () => clearTimeout(timer);
  }, [tasks]);

  /** Call this when a task is marked completed */
  const notifyTaskCompleted = useCallback(
    (completedTask: Task) => {
      if (!tasks) return;
      NotificationService.sendTaskCompletedNotification(completedTask, tasks).catch(console.warn);
    },
    [tasks],
  );

  /** Call this to send daily digest (e.g., from a settings page button) */
  const sendDigest = useCallback(() => {
    if (!tasks) return;
    const score = productivityMetrics?.daily_score ?? 0;
    const focusMin = productivityMetrics?.total_focus_time
      ? Math.round(productivityMetrics.total_focus_time / 60)
      : 0;
    NotificationService.sendDailyDigest(tasks, score, focusMin).catch(console.warn);
  }, [tasks, productivityMetrics]);

  return {
    notifyTaskCompleted,
    sendDigest,
    notifications: NotificationService.getStoredNotifications(),
    markRead: NotificationService.markNotificationRead,
    clearAll: NotificationService.clearNotifications,
  };
};
