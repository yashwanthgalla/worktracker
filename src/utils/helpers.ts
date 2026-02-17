import { format, formatDistance, isToday, isThisWeek, isPast } from 'date-fns';
import type { Task } from '../types/database.types';

export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'MMM dd, yyyy');
};

export const formatDateTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'MMM dd, yyyy hh:mm a');
};

export const formatRelativeTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDistance(d, new Date(), { addSuffix: true });
};

export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

export const isOverdue = (task: Task): boolean => {
  if (!task.due_date) return false;
  return isPast(task.due_date) && task.status !== 'completed';
};

export const isDueToday = (task: Task): boolean => {
  if (!task.due_date) return false;
  return isToday(task.due_date);
};

export const isDueThisWeek = (task: Task): boolean => {
  if (!task.due_date) return false;
  return isThisWeek(task.due_date);
};

export const getPriorityColor = (priority: string): string => {
  const colors = {
    low: 'text-blue-600 bg-blue-50',
    medium: 'text-amber-600 bg-amber-50',
    high: 'text-orange-600 bg-orange-50',
    urgent: 'text-red-600 bg-red-50',
  };
  return colors[priority as keyof typeof colors] || colors.medium;
};

export const getStatusColor = (status: string): string => {
  const colors = {
    pending: 'text-gray-600 bg-gray-100',
    in_progress: 'text-blue-600 bg-blue-50',
    completed: 'text-green-600 bg-green-50',
  };
  return colors[status as keyof typeof colors] || colors.pending;
};

export const groupTasksByDate = (tasks: Task[]) => {
  const today: Task[] = [];
  const thisWeek: Task[] = [];
  const later: Task[] = [];
  const overdue: Task[] = [];

  tasks.forEach((task) => {
    if (isOverdue(task)) {
      overdue.push(task);
    } else if (isDueToday(task)) {
      today.push(task);
    } else if (isDueThisWeek(task)) {
      thisWeek.push(task);
    } else {
      later.push(task);
    }
  });

  return { overdue, today, thisWeek, later };
};

export const calculateProgress = (completed: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// cn is exported from @/lib/utils (clsx + tailwind-merge) – use that instead.
