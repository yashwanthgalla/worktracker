import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, CheckCircle2, Circle, GripVertical } from 'lucide-react';
import { useCreateTask, useUpdateTask, useSubtasks } from '../../hooks/useTasks';
import type { Task } from '../../types/database.types';

interface SubtaskListProps {
  parentTask: Task;
}

export const SubtaskList = ({ parentTask }: SubtaskListProps) => {
  const { data: subtasks, isLoading } = useSubtasks(parentTask.id);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const [newSubtask, setNewSubtask] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;
    createTask.mutate(
      {
        title: newSubtask.trim(),
        parent_task_id: parentTask.id,
        status: 'pending',
        priority: parentTask.priority,
        is_recurring: false,
        user_id: parentTask.user_id,
        created_at: new Date(),
        updated_at: new Date(),
      } as any,
      {
        onSuccess: () => {
          setNewSubtask('');
        },
      }
    );
  };

  const handleToggle = (subtask: Task) => {
    const newStatus = subtask.status === 'completed' ? 'pending' : 'completed';
    updateTask.mutate({
      id: subtask.id,
      updates: {
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date() : undefined,
      },
    });
  };

  const completedCount = subtasks?.filter((s) => s.status === 'completed').length || 0;
  const totalCount = subtasks?.length || 0;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[0.8125rem] font-semibold text-gray-700 flex items-center gap-2">
          Subtasks
          {totalCount > 0 && (
            <span className="text-[0.6875rem] text-gray-400 font-normal">
              {completedCount}/{totalCount}
            </span>
          )}
        </h4>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        )}
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full bg-emerald-500 rounded-full"
          />
        </div>
      )}

      {/* Subtask list */}
      <AnimatePresence>
        {subtasks?.map((subtask, index) => (
          <motion.div
            key={subtask.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ delay: index * 0.03 }}
            className="flex items-center gap-2.5 py-1.5 group"
          >
            <GripVertical className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 cursor-grab" />
            <button onClick={() => handleToggle(subtask)} className="shrink-0">
              {subtask.status === 'completed' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <Circle className="w-4 h-4 text-gray-300 hover:text-emerald-400 transition-colors" />
              )}
            </button>
            <span
              className={`text-[0.8125rem] flex-1 ${
                subtask.status === 'completed'
                  ? 'line-through text-gray-400'
                  : 'text-gray-700'
              }`}
            >
              {subtask.title}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Add subtask input */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2"
          >
            <Circle className="w-4 h-4 text-gray-300 shrink-0" />
            <input
              type="text"
              autoFocus
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddSubtask();
                if (e.key === 'Escape') {
                  setIsAdding(false);
                  setNewSubtask('');
                }
              }}
              placeholder="Add a subtask..."
              className="flex-1 text-[0.8125rem] py-1.5 px-2 bg-gray-50 border border-gray-200 rounded-lg focus:border-emerald-300 focus:ring-1 focus:ring-emerald-100 outline-none"
            />
            <button
              onClick={handleAddSubtask}
              disabled={!newSubtask.trim()}
              className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewSubtask('');
              }}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!isLoading && totalCount === 0 && !isAdding && (
        <p className="text-xs text-gray-400 pl-1">
          Break this task into smaller steps
        </p>
      )}
    </div>
  );
};
