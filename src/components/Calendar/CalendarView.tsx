import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar } from '@/components/ui/calendar';
import { useTasks } from '../../hooks/useTasks';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  AlertCircle,
  Flag,
  ChevronRight,
} from 'lucide-react';
import { format, isSameDay, isAfter, isBefore, startOfDay } from 'date-fns';
import type { Task } from '../../types/database.types';

const priorityConfig: Record<string, { color: string; bg: string; border: string }> = {
  urgent: { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
  high: { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
  medium: { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
  low: { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
};

const statusConfig: Record<string, { color: string; bg: string; icon: typeof CheckCircle2 }> = {
  completed: { color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle2 },
  in_progress: { color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock },
  pending: { color: 'text-blue-600', bg: 'bg-blue-50', icon: AlertCircle },
};

export const CalendarView = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const { data: tasks } = useTasks();

  const allTasks = useMemo(() => (Array.isArray(tasks) ? tasks : []), [tasks]);

  // Tasks for the selected date
  const selectedDateTasks = useMemo(() => {
    if (!selectedDate) return [];
    return allTasks.filter((task) => {
      if (task.due_date) {
        return isSameDay(new Date(task.due_date), selectedDate);
      }
      return false;
    });
  }, [allTasks, selectedDate]);

  // Tasks without a due date
  const undatedTasks = useMemo(
    () => allTasks.filter((t) => !t.due_date && t.status !== 'completed'),
    [allTasks]
  );

  // Summary stats
  const stats = useMemo(() => {
    const today = startOfDay(new Date());
    const overdue = allTasks.filter(
      (t) => t.due_date && t.status !== 'completed' && isBefore(new Date(t.due_date), today)
    ).length;
    const dueToday = allTasks.filter(
      (t) => t.due_date && isSameDay(new Date(t.due_date), today)
    ).length;
    const upcoming = allTasks.filter(
      (t) => t.due_date && t.status !== 'completed' && isAfter(new Date(t.due_date), today)
    ).length;
    return { overdue, dueToday, upcoming };
  }, [allTasks]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-2">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[1.75rem] font-semibold tracking-tight text-text-primary mb-1 flex items-center gap-3"
        >
          <div className="p-2.5 rounded-2xl bg-primary-50 border border-primary-100">
            <CalendarIcon className="w-6 h-6 text-primary-500" />
          </div>
          Calendar
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="text-[0.9375rem] text-text-tertiary ml-14"
        >
          View and manage your tasks by date
        </motion.p>
      </div>

      {/* Summary Pills */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="flex flex-wrap gap-3"
      >
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 border border-red-100">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-[0.8125rem] font-medium text-red-600">
            {stats.overdue} overdue
          </span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-100">
          <Clock className="w-4 h-4 text-amber-500" />
          <span className="text-[0.8125rem] font-medium text-amber-600">
            {stats.dueToday} due today
          </span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100">
          <CalendarIcon className="w-4 h-4 text-blue-500" />
          <span className="text-[0.8125rem] font-medium text-blue-600">
            {stats.upcoming} upcoming
          </span>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Task List for Selected Date */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-5"
        >
          {/* Selected Date Header */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-1">
              {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'Select a date'}
            </h2>
            <p className="text-[0.8125rem] text-text-tertiary">
              {selectedDateTasks.length === 0
                ? 'No tasks scheduled for this date'
                : `${selectedDateTasks.length} task${selectedDateTasks.length !== 1 ? 's' : ''} scheduled`}
            </p>
          </div>

          {/* Task Cards */}
          <AnimatePresence mode="popLayout">
            {selectedDateTasks.length > 0 ? (
              <div className="space-y-3">
                {selectedDateTasks.map((task, index) => (
                  <TaskRow key={task.id} task={task} index={index} />
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card p-10 text-center"
              >
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary-50 flex items-center justify-center">
                  <CalendarIcon className="w-7 h-7 text-primary-400" />
                </div>
                <h3 className="text-[0.9375rem] font-semibold text-text-primary mb-1">
                  No tasks on this date
                </h3>
                <p className="text-[0.8125rem] text-text-tertiary">
                  Select a different date or create a new task
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Undated Tasks */}
          {undatedTasks.length > 0 && (
            <div>
              <h3 className="text-[0.875rem] font-semibold text-text-tertiary uppercase tracking-wider mb-3">
                Unscheduled Tasks
              </h3>
              <div className="space-y-2">
                {undatedTasks.slice(0, 5).map((task, index) => (
                  <TaskRow key={task.id} task={task} index={index} compact />
                ))}
                {undatedTasks.length > 5 && (
                  <p className="text-[0.8125rem] text-text-tertiary pl-4">
                    +{undatedTasks.length - 5} more unscheduled tasks
                  </p>
                )}
              </div>
            </div>
          )}
        </motion.div>

        {/* Calendar Sidebar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-5"
        >
          <div className="glass-card p-5">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-2xl w-full"
              modifiers={{
                hasTasks: allTasks
                  .filter((t) => t.due_date)
                  .map((t) => new Date(t.due_date!)),
              }}
              modifiersClassNames={{
                hasTasks: 'calendar-has-tasks',
              }}
            />
          </div>

          {/* Legend */}
          <div className="glass-card p-5 space-y-3">
            <h4 className="text-[0.8125rem] font-semibold text-text-primary mb-2">Legend</h4>
            <div className="space-y-2.5">
              {[
                { label: 'Urgent', ...priorityConfig.urgent },
                { label: 'High', ...priorityConfig.high },
                { label: 'Medium', ...priorityConfig.medium },
                { label: 'Low', ...priorityConfig.low },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${item.bg} border ${item.border}`} />
                  <span className="text-[0.8125rem] text-text-secondary">{item.label} Priority</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

/* -------------------------------- Task Row -------------------------------- */

function TaskRow({
  task,
  index,
  compact = false,
}: {
  task: Task;
  index: number;
  compact?: boolean;
}) {
  const priority = priorityConfig[task.priority] || priorityConfig.low;
  const status = statusConfig[task.status] || statusConfig.pending;
  const StatusIcon = status.icon;
  const isOverdue =
    task.due_date &&
    task.status !== 'completed' &&
    isBefore(new Date(task.due_date), startOfDay(new Date()));

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      transition={{ delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      className={`glass-card ${compact ? 'p-4' : 'p-5'} flex items-center gap-4 group hover:shadow-md transition-shadow`}
    >
      {/* Status Icon */}
      <div className={`p-2 rounded-xl ${status.bg} shrink-0`}>
        <StatusIcon className={`w-4 h-4 ${status.color}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4
          className={`font-medium text-text-primary truncate ${
            compact ? 'text-[0.875rem]' : 'text-[0.9375rem]'
          } ${task.status === 'completed' ? 'line-through opacity-60' : ''}`}
        >
          {task.title}
        </h4>
        {!compact && task.description && (
          <p className="text-[0.8125rem] text-text-tertiary truncate mt-0.5">
            {task.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6875rem] font-medium ${priority.bg} ${priority.color} border ${priority.border}`}
          >
            <Flag className="w-2.5 h-2.5" />
            {task.priority}
          </span>
          {isOverdue && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6875rem] font-medium bg-red-50 text-red-600 border border-red-100">
              Overdue
            </span>
          )}
          {task.estimated_time && (
            <span className="inline-flex items-center gap-1 text-[0.75rem] text-text-tertiary">
              <Clock className="w-3 h-3" />
              {task.estimated_time}m
            </span>
          )}
          {task.category && (
            <span className="text-[0.75rem] text-text-tertiary">
              {task.category}
            </span>
          )}
        </div>
      </div>

      {/* Arrow */}
      <ChevronRight className="w-4 h-4 text-[#c7c7cc] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </motion.div>
  );
}
