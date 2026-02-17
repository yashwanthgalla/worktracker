import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  Flag,
  CheckCircle2,
  Circle,
  Plus,
  Edit3,
  Trash2,
  Clock,
  ChevronRight,
  GripVertical,
} from 'lucide-react';
import { useTask, useSubtasks, useCreateTask, useUpdateTask, useDeleteTask } from '../../hooks/useTasks';
import { TaskFormEnhanced } from './TaskFormEnhanced';
import type { Task } from '../../types/database.types';
import { formatDate, getPriorityColor, isOverdue } from '../../utils/helpers';

interface TaskDetailViewProps {
  taskId: string;
  onClose: () => void;
}

export const TaskDetailView = ({ taskId, onClose }: TaskDetailViewProps) => {
  const { data: task } = useTask(taskId);
  const { data: subtasks, isLoading: subtasksLoading } = useSubtasks(taskId);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const [showEditForm, setShowEditForm] = useState(false);
  const [newSubtask, setNewSubtask] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);

  if (!task) return null;

  const completedCount = subtasks?.filter((s) => s.status === 'completed').length || 0;
  const totalCount = subtasks?.length || 0;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Also count checklist items
  const checklistCompleted = task.checklist?.filter((c) => c.completed).length || 0;
  const checklistTotal = task.checklist?.length || 0;
  const checklistProgress = checklistTotal > 0 ? Math.round((checklistCompleted / checklistTotal) * 100) : 0;

  // Combined progress: subtasks + checklist
  const totalItems = totalCount + checklistTotal;
  const totalCompleted = completedCount + checklistCompleted;
  const overallProgress = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0;

  const handleToggleSubtask = (subtask: Task) => {
    const newStatus = subtask.status === 'completed' ? 'pending' : 'completed';
    updateTask.mutate({
      id: subtask.id,
      updates: {
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date() : undefined,
      },
    });
  };

  const handleToggleChecklist = (itemId: string) => {
    if (!task.checklist) return;
    const updatedChecklist = task.checklist.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    updateTask.mutate({
      id: task.id,
      updates: { checklist: updatedChecklist },
    });
  };

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;
    createTask.mutate(
      {
        title: newSubtask.trim(),
        parent_task_id: task.id,
        status: 'pending',
        priority: task.priority,
        is_recurring: false,
        user_id: task.user_id,
        created_at: new Date(),
        updated_at: new Date(),
      } as Parameters<typeof createTask.mutate>[0],
      {
        onSuccess: () => {
          setNewSubtask('');
        },
      }
    );
  };

  const handleDeleteTask = () => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTask.mutate(task.id);
      onClose();
    }
  };

  const handleStatusToggle = () => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    updateTask.mutate({
      id: task.id,
      updates: {
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date() : undefined,
      },
    });
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-start justify-center pt-[5vh] p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 20, opacity: 0 }}
          transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.35 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white/95 backdrop-blur-lg z-10 px-6 py-4 border-b border-gray-100 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleStatusToggle}
                >
                  {task.status === 'completed' ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  ) : (
                    <Circle className="w-6 h-6 text-gray-300 hover:text-emerald-400 transition-colors" />
                  )}
                </motion.button>
                <div>
                  <h2 className={`text-lg font-semibold ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                    {task.title}
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowEditForm(true)}
                  className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                  title="Edit"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDeleteTask}
                  className="p-2 rounded-xl hover:bg-red-50 transition-colors text-gray-400 hover:text-red-500"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-6">
            {/* Description */}
            {task.description && (
              <p className="text-sm text-gray-500 leading-relaxed">{task.description}</p>
            )}

            {/* Metadata row */}
            <div className="flex flex-wrap gap-2">
              {/* Priority */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${getPriorityColor(task.priority)}`}>
                <Flag className="w-3 h-3" />
                <span className="capitalize">{task.priority}</span>
              </div>

              {/* Status */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                task.status === 'completed'
                  ? 'bg-emerald-50 text-emerald-600'
                  : task.status === 'in_progress'
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                <span className="capitalize">{task.status.replace('_', ' ')}</span>
              </div>

              {/* Due date */}
              {task.due_date && (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                  isOverdue(task) ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(task.due_date)}</span>
                </div>
              )}

              {/* Estimated time */}
              {task.estimated_time && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                  <Clock className="w-3 h-3" />
                  <span>{task.estimated_time}m</span>
                </div>
              )}
            </div>

            {/* Overall Progress Bar */}
            {totalItems > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[0.8125rem] font-semibold text-gray-700">Progress</span>
                  <span className={`text-sm font-bold ${
                    overallProgress === 100 ? 'text-emerald-500' : 'text-gray-500'
                  }`}>
                    {overallProgress}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${overallProgress}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className={`h-full rounded-full ${
                      overallProgress === 100
                        ? 'bg-emerald-500'
                        : overallProgress >= 50
                        ? 'bg-emerald-400'
                        : 'bg-amber-400'
                    }`}
                  />
                </div>
                <p className="text-xs text-gray-400">
                  {totalCompleted} of {totalItems} items completed
                </p>
              </div>
            )}

            {/* Checklist Items */}
            {task.checklist && task.checklist.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-[0.8125rem] font-semibold text-gray-700">Checklist</h3>
                  <span className="text-xs text-gray-400">{checklistCompleted}/{checklistTotal}</span>
                </div>

                {/* Checklist progress */}
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${checklistProgress}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="h-full bg-blue-400 rounded-full"
                  />
                </div>

                <div className="space-y-0.5">
                  {task.checklist.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleToggleChecklist(item.id)}
                      className="w-full flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-gray-50 transition-colors text-left group"
                    >
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${
                        item.completed
                          ? 'bg-emerald-500 border-emerald-500'
                          : 'border-gray-300 group-hover:border-emerald-400'
                      }`}>
                        {item.completed && (
                          <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 6l3 3 5-5" />
                          </svg>
                        )}
                      </div>
                      <span className={`text-sm flex-1 ${
                        item.completed ? 'line-through text-gray-400' : 'text-gray-700'
                      }`}>
                        {item.text}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Subtasks */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-[0.8125rem] font-semibold text-gray-700">
                  Subtasks
                  {totalCount > 0 && (
                    <span className="text-xs text-gray-400 font-normal ml-2">{completedCount}/{totalCount}</span>
                  )}
                </h3>
                {!isAddingSubtask && (
                  <button
                    onClick={() => setIsAddingSubtask(true)}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add subtask
                  </button>
                )}
              </div>

              {/* Subtasks progress */}
              {totalCount > 0 && (
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="h-full bg-violet-400 rounded-full"
                  />
                </div>
              )}

              {/* Subtask list */}
              {subtasksLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <AnimatePresence>
                  {subtasks?.map((subtask, index) => (
                    <motion.div
                      key={subtask.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <button
                        onClick={() => handleToggleSubtask(subtask)}
                        className="w-full flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-gray-50 transition-colors text-left group"
                      >
                        <GripVertical className="w-3 h-3 text-gray-200 opacity-0 group-hover:opacity-100 shrink-0" />
                        <div className="shrink-0">
                          {subtask.status === 'completed' ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-300 group-hover:text-emerald-400 transition-colors" />
                          )}
                        </div>
                        <span className={`text-sm flex-1 ${
                          subtask.status === 'completed'
                            ? 'line-through text-gray-400'
                            : 'text-gray-700'
                        }`}>
                          {subtask.title}
                        </span>
                        {subtask.due_date && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                            isOverdue(subtask) ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {formatDate(subtask.due_date)}
                          </span>
                        )}
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 shrink-0" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}

              {/* Add subtask input */}
              <AnimatePresence>
                {isAddingSubtask && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 px-3"
                  >
                    <Circle className="w-5 h-5 text-gray-300 shrink-0" />
                    <input
                      type="text"
                      autoFocus
                      value={newSubtask}
                      onChange={(e) => setNewSubtask(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddSubtask();
                        if (e.key === 'Escape') {
                          setIsAddingSubtask(false);
                          setNewSubtask('');
                        }
                      }}
                      placeholder="What needs to be done?"
                      className="flex-1 text-sm py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 outline-none"
                    />
                    <button
                      onClick={handleAddSubtask}
                      disabled={!newSubtask.trim()}
                      className="p-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { setIsAddingSubtask(false); setNewSubtask(''); }}
                      className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Empty state for subtasks */}
              {!subtasksLoading && totalCount === 0 && !isAddingSubtask && (
                <button
                  onClick={() => setIsAddingSubtask(true)}
                  className="w-full py-4 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-emerald-300 hover:text-emerald-500 transition-colors"
                >
                  + Add subtasks to break this task down
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Edit form modal */}
      <AnimatePresence>
        {showEditForm && (
          <TaskFormEnhanced
            onClose={() => setShowEditForm(false)}
            taskId={taskId}
          />
        )}
      </AnimatePresence>
    </>
  );
};
