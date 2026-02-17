import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTasks } from '../../hooks/useTasks';
import { TaskCard } from './TaskCard';
import { TaskFormEnhanced } from './TaskFormEnhanced';
import { TaskDetailView } from './TaskDetailView';
import { useAppStore } from '../../store/appStore';
import { Plus, Loader2, Grid, List } from 'lucide-react';
import { groupTasksByDate } from '../../utils/helpers';

export const TaskList = () => {
  const { data: tasks, isLoading } = useTasks();
  const [showForm, setShowForm] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [searchQuery] = useState('');
  const { taskStatusFilter, viewMode, setViewMode } = useAppStore();

  // Filter tasks
  const filteredTasks = Array.isArray(tasks)
    ? tasks.filter((task) => {
        if (taskStatusFilter !== 'all' && task.status !== taskStatusFilter) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchTitle = task.title.toLowerCase().includes(q);
          const matchDesc = task.description?.toLowerCase().includes(q);
          const matchTags = task.tags?.some((t) => t.toLowerCase().includes(q));
          const matchCategory = task.category?.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchTags && !matchCategory) return false;
        }
        // Only show top-level tasks (no subtasks)
        if (task.parent_task_id) return false;
        return true;
      })
    : [];

  // Group tasks by date
  const groupedTasks = filteredTasks ? groupTasksByDate(filteredTasks) : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-7 h-7 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-text-primary mb-1">Tasks</h2>
          <p className="text-text-tertiary text-[0.9375rem]">
            {filteredTasks?.length || 0} task
            {filteredTasks?.length !== 1 ? 's' : ''} total
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View mode selector */}
          <div className="flex items-center bg-white/60 backdrop-blur-md rounded-xl border border-black/6 p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'list'
                  ? 'bg-black/6 text-text-primary'
                  : 'text-text-tertiary hover:text-text-primary'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'kanban'
                  ? 'bg-black/6 text-text-primary'
                  : 'text-text-tertiary hover:text-text-primary'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>

          {/* Add task button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowForm(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </motion.button>
        </div>
      </div>

      {/* Task groups */}
      <div className="space-y-8">
        {/* Overdue */}
        {groupedTasks?.overdue && groupedTasks.overdue.length > 0 && (
          <div>
            <h3 className="text-[0.9375rem] font-semibold mb-3 text-red-500 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Overdue ({groupedTasks.overdue.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {groupedTasks.overdue.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => setDetailTaskId(task.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Today */}
        {groupedTasks?.today && groupedTasks.today.length > 0 && (
          <div>
            <h3 className="text-[0.9375rem] font-semibold mb-3 text-primary-500 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary-400" />
              Today ({groupedTasks.today.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {groupedTasks.today.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => setDetailTaskId(task.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* This Week */}
        {groupedTasks?.thisWeek && groupedTasks.thisWeek.length > 0 && (
          <div>
            <h3 className="text-[0.9375rem] font-semibold mb-3 text-amber-600 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              This Week ({groupedTasks.thisWeek.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {groupedTasks.thisWeek.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => setDetailTaskId(task.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Later */}
        {groupedTasks?.later && groupedTasks.later.length > 0 && (
          <div>
            <h3 className="text-[0.9375rem] font-semibold mb-3 text-text-tertiary flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-text-tertiary" />
              Later ({groupedTasks.later.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {groupedTasks.later.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => setDetailTaskId(task.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Empty state */}
        {(!filteredTasks || filteredTasks.length === 0) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-50 flex items-center justify-center">
              <List className="w-8 h-8 text-primary-400" />
            </div>
            <h3 className="text-xl font-semibold text-text-primary mb-1">No tasks yet</h3>
            <p className="text-text-tertiary mb-6">
              Create your first task to get started!
            </p>
            <button onClick={() => setShowForm(true)} className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Task
            </button>
          </motion.div>
        )}
      </div>

      {/* Task detail view */}
      <AnimatePresence>
        {detailTaskId && (
          <TaskDetailView
            taskId={detailTaskId}
            onClose={() => setDetailTaskId(null)}
          />
        )}
      </AnimatePresence>

      {/* Task form modal */}
      <AnimatePresence>
        {showForm && (
          <TaskFormEnhanced
            onClose={() => {
              setShowForm(false);
              setSelectedTaskId(null);
            }}
            taskId={selectedTaskId || undefined}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
