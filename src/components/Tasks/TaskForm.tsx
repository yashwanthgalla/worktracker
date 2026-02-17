import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, Calendar, Flag, Tag, Clock } from 'lucide-react';
import { useCreateTask, useUpdateTask, useTask } from '../../hooks/useTasks';

interface TaskFormProps {
  onClose: () => void;
  taskId?: string;
}

export const TaskForm = ({ onClose, taskId }: TaskFormProps) => {
  const isEdit = !!taskId;
  const { data: existingTask } = useTask(taskId || '');
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const formDataFromTask = useMemo(() => {
    if (existingTask) {
      return {
        title: existingTask.title,
        description: existingTask.description || '',
        priority: existingTask.priority,
        status: existingTask.status,
        due_date: existingTask.due_date
          ? new Date(existingTask.due_date).toISOString().split('T')[0]
          : '',
        estimated_time: existingTask.estimated_time?.toString() || '',
        category: existingTask.category || '',
        tags: existingTask.tags?.join(', ') || '',
      };
    }
    return null;
  }, [existingTask]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    status: 'pending' as 'pending' | 'in_progress' | 'completed',
    due_date: '',
    estimated_time: '',
    category: '',
    tags: '',
  });

  // Sync form data when task loads - track last synced task ID
  const [syncedTaskId, setSyncedTaskId] = useState<string | undefined>();
  if (existingTask && syncedTaskId !== existingTask.id && formDataFromTask) {
    setSyncedTaskId(existingTask.id);
    setFormData(formDataFromTask);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const taskData = {
      title: formData.title,
      description: formData.description,
      priority: formData.priority,
      status: formData.status,
      due_date: formData.due_date ? new Date(formData.due_date) : undefined,
      estimated_time: formData.estimated_time
        ? parseInt(formData.estimated_time)
        : undefined,
      category: formData.category || undefined,
      tags: formData.tags
        ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : undefined,
      is_recurring: false,
    };

    if (isEdit && taskId) {
      updateTask.mutate({ id: taskId, updates: taskData }, {
        onSuccess: () => onClose(),
      });
    } else {
      createTask.mutate(taskData as Parameters<typeof createTask.mutate>[0], {
        onSuccess: () => onClose(),
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 12 }}
        transition={{ ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="glass-card p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <h2 className="text-xl font-semibold text-text-primary">
            {isEdit ? 'Edit Task' : 'Create New Task'}
          </h2>
          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-black/4 transition-colors"
          >
            <X className="w-5 h-5 text-text-tertiary" />
          </motion.button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-[0.8125rem] font-medium text-text-primary mb-1.5">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="input-field"
              placeholder="Enter task title"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[0.8125rem] font-medium text-text-primary mb-1.5">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              className="input-field resize-none"
              placeholder="Add task description..."
            />
          </div>

          {/* Two columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Priority */}
            <div>
              <label className="text-[0.8125rem] font-medium text-text-primary mb-1.5 flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5 text-text-tertiary" />
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent',
                  })
                }
                className="input-field"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-[0.8125rem] font-medium text-text-primary mb-1.5">Status</label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as 'pending' | 'in_progress' | 'completed',
                  })
                }
                className="input-field"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="text-[0.8125rem] font-medium text-text-primary mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-text-tertiary" />
                Due Date
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) =>
                  setFormData({ ...formData, due_date: e.target.value })
                }
                className="input-field"
              />
            </div>

            {/* Estimated Time */}
            <div>
              <label className="text-[0.8125rem] font-medium text-text-primary mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-text-tertiary" />
                Estimated Time (min)
              </label>
              <input
                type="number"
                value={formData.estimated_time}
                onChange={(e) =>
                  setFormData({ ...formData, estimated_time: e.target.value })
                }
                className="input-field"
                placeholder="60"
                min="1"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-[0.8125rem] font-medium text-text-primary mb-1.5">Category</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="input-field"
                placeholder="Work, Personal, etc."
              />
            </div>

            {/* Tags */}
            <div>
              <label className="text-[0.8125rem] font-medium text-text-primary mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-text-tertiary" />
                Tags
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) =>
                  setFormData({ ...formData, tags: e.target.value })
                }
                className="input-field"
                placeholder="tag1, tag2, tag3"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-3">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={createTask.isPending || updateTask.isPending}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {(createTask.isPending || updateTask.isPending) && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              {isEdit ? 'Update Task' : 'Create Task'}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};
