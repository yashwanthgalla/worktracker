import { motion } from 'framer-motion';
import type { Task } from '../../types/database.types';
import { formatDate, getPriorityColor, getStatusColor, isOverdue } from '../../utils/helpers';
import {
  Calendar,
  Clock,
  Flag,
  MoreVertical,
  CheckCircle2,
  Circle,
  AlertCircle,
} from 'lucide-react';
import { useState } from 'react';
import { useUpdateTask, useDeleteTask } from '../../hooks/useTasks';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
}

export const TaskCard = ({ task, onClick }: TaskCardProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const handleStatusToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    updateTask.mutate({
      id: task.id,
      updates: {
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date() : undefined,
      },
    });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTask.mutate(task.id);
    }
    setShowMenu(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      onClick={onClick}
      className="glass-card p-5 cursor-pointer group relative overflow-hidden"
    >
      <div className="relative z-10">
        <div className="flex items-start gap-3">
          {/* Status checkbox */}
          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleStatusToggle}
            className="mt-0.5"
          >
            {task.status === 'completed' ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <Circle className="w-5 h-5 text-[#c7c7cc] hover:text-primary-400 transition-colors" />
            )}
          </motion.button>

          {/* Task content */}
          <div className="flex-1 min-w-0">
            <h3
              className={`font-medium text-[0.9375rem] mb-1.5 ${
                task.status === 'completed'
                  ? 'line-through text-[#86868b]'
                  : 'text-[#1d1d1f]'
              }`}
            >
              {task.title}
            </h3>

            {task.description && (
              <p className="text-[0.8125rem] text-[#86868b] line-clamp-2 mb-3">
                {task.description}
              </p>
            )}

            {/* Task metadata */}
            <div className="flex flex-wrap items-center gap-2 text-[0.75rem]">
              {/* Priority */}
              <div
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${getPriorityColor(
                  task.priority
                )}`}
              >
                <Flag className="w-3 h-3" />
                <span className="capitalize">{task.priority}</span>
              </div>

              {/* Status */}
              <div
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${getStatusColor(
                  task.status
                )}`}
              >
                <span className="capitalize">{task.status.replace('_', ' ')}</span>
              </div>

              {/* Due date */}
              {task.due_date && (
                <div
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${
                    isOverdue(task)
                      ? 'text-red-600 bg-red-50'
                      : 'text-[#6e6e73] bg-black/[0.04]'
                  }`}
                >
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(task.due_date)}</span>
                  {isOverdue(task) && <AlertCircle className="w-3 h-3 ml-0.5" />}
                </div>
              )}

              {/* Estimated time */}
              {task.estimated_time && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[#6e6e73] bg-black/[0.04] font-medium">
                  <Clock className="w-3 h-3" />
                  <span>{task.estimated_time}m</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {task.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[0.6875rem] px-2 py-0.5 rounded-full bg-primary-50 text-primary-600 font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Menu */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1.5 rounded-lg hover:bg-black/[0.04] transition-colors opacity-0 group-hover:opacity-100"
            >
              <MoreVertical className="w-4 h-4 text-[#86868b]" />
            </motion.button>

            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="absolute right-0 top-full mt-1 bg-white rounded-xl overflow-hidden shadow-xl border border-black/[0.06] z-20 min-w-[140px]"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClick?.();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-[0.875rem] text-[#1d1d1f] hover:bg-black/[0.03] transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full px-4 py-2.5 text-left text-[0.875rem] text-red-500 hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
