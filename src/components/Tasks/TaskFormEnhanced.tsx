import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Loader2, Calendar, Flag, Plus, Trash2,
  Repeat, Link2, CheckSquare, ListChecks, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useCreateTask, useUpdateTask, useTask, useTasks } from '../../hooks/useTasks';
import type { ChecklistItem, RecurrenceRule, Task } from '../../types/database.types';

interface TaskFormProps {
  onClose: () => void;
  taskId?: string;
  parentTaskId?: string;
}

export const TaskFormEnhanced = ({ onClose, taskId, parentTaskId }: TaskFormProps) => {
  const isEdit = !!taskId;
  const { data: existingTask } = useTask(taskId || '');
  const { data: allTasks } = useTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const formDataFromTask = useMemo(() => {
    if (existingTask) {
      return {
        formData: {
          title: existingTask.title,
          description: existingTask.description || '',
          priority: existingTask.priority,
          due_date: existingTask.due_date
            ? new Date(existingTask.due_date).toISOString().split('T')[0]
            : '',
          is_recurring: existingTask.is_recurring,
          parent_task_id: existingTask.parent_task_id || '',
        },
        recurrence: existingTask.recurrence_rule || null,
        checklist: existingTask.checklist || null,
      };
    }
    return null;
  }, [existingTask]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    due_date: '',
    is_recurring: false,
    parent_task_id: parentTaskId || '',
  });

  const [recurrence, setRecurrence] = useState<RecurrenceRule>({
    frequency: 'daily',
    interval: 1,
    days_of_week: [],
  });

  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newCheckItem, setNewCheckItem] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedDependencies, setSelectedDependencies] = useState<string[]>([]);

  // Sync form data when task loads - track last synced task ID
  const [syncedTaskId, setSyncedTaskId] = useState<string | undefined>();
  if (existingTask && syncedTaskId !== existingTask.id && formDataFromTask) {
    setSyncedTaskId(existingTask.id);
    setFormData(formDataFromTask.formData);
    if (formDataFromTask.recurrence) {
      setRecurrence(formDataFromTask.recurrence);
    }
    if (formDataFromTask.checklist) {
      setChecklist(formDataFromTask.checklist);
    }
  }

  const handleAddCheckItem = useCallback(() => {
    if (!newCheckItem.trim()) return;
    setChecklist((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        text: newCheckItem.trim(),
        completed: false,
        order: prev.length,
      },
    ]);
    setNewCheckItem('');
  }, [newCheckItem]);

  const toggleCheckItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const removeCheckItem = (id: string) => {
    setChecklist((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const taskData: Partial<Task> & { is_recurring: boolean; recurrence_rule?: RecurrenceRule; checklist?: ChecklistItem[] } = {
      title: formData.title,
      description: formData.description || undefined,
      priority: formData.priority,
      status: 'pending',
      due_date: formData.due_date ? new Date(formData.due_date) : undefined,
      is_recurring: formData.is_recurring,
      recurrence_rule: formData.is_recurring ? recurrence : undefined,
      parent_task_id: formData.parent_task_id || undefined,
      checklist: checklist.length > 0 ? checklist : undefined,
    };

    if (isEdit && taskId) {
      updateTask.mutate({ id: taskId, updates: taskData }, { onSuccess: onClose });
    } else {
      createTask.mutate(taskData as Parameters<typeof createTask.mutate>[0], { onSuccess: onClose });
    }
  };

  const availableTasks = Array.isArray(allTasks)
    ? allTasks.filter((t) => t.id !== taskId && t.status !== 'completed')
    : [];

  const checklistProgress =
    checklist.length > 0
      ? Math.round((checklist.filter((c) => c.completed).length / checklist.length) * 100)
      : 0;

  const priorityOptions = [
    { value: 'low', label: 'Low', color: 'text-blue-500 bg-blue-50 border-blue-200' },
    { value: 'medium', label: 'Medium', color: 'text-amber-500 bg-amber-50 border-amber-200' },
    { value: 'high', label: 'High', color: 'text-orange-500 bg-orange-50 border-orange-200' },
    { value: 'urgent', label: 'Urgent', color: 'text-red-500 bg-red-50 border-red-200' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.35 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-lg z-10 px-7 py-5 border-b border-gray-100 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isEdit ? 'Edit Task' : 'Create Task'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {isEdit ? 'Update task details' : 'Add a new task to your workspace'}
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </motion.button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-7 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-[0.8125rem] font-medium text-gray-700 mb-1.5">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="input-field text-base"
              placeholder="What needs to be done?"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[0.8125rem] font-medium text-gray-700 mb-1.5">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="input-field resize-none"
              placeholder="Add more details..."
            />
          </div>

          {/* Priority pills */}
          <div>
            <label className="text-[0.8125rem] font-medium text-gray-700 mb-2 flex items-center gap-1.5">
              <Flag className="w-3.5 h-3.5 text-gray-400" />
              Priority
            </label>
            <div className="flex gap-2">
              {priorityOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, priority: opt.value as 'low' | 'medium' | 'high' | 'urgent' })}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    formData.priority === opt.value
                      ? `${opt.color} ring-2 ring-offset-1 ring-current/20 scale-105`
                      : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="text-[0.8125rem] font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              Due Date
            </label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="input-field"
            />
          </div>

          {/* Checklist */}
          <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
            <div className="flex items-center justify-between mb-3">
              <label className="text-[0.8125rem] font-semibold text-gray-700 flex items-center gap-1.5">
                <ListChecks className="w-4 h-4 text-emerald-500" />
                Checklist
                {checklist.length > 0 && (
                  <span className="text-xs text-gray-400 font-normal ml-1">
                    {checklistProgress}%
                  </span>
                )}
              </label>
            </div>

            {/* Progress bar */}
            {checklist.length > 0 && (
              <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${checklistProgress}%` }}
                />
              </div>
            )}

            {/* Items */}
            <AnimatePresence>
              {checklist.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  className="flex items-center gap-2 py-1.5"
                >
                  <button
                    type="button"
                    onClick={() => toggleCheckItem(item.id)}
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                      item.completed
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-gray-300 hover:border-emerald-400'
                    }`}
                  >
                    {item.completed && (
                      <CheckSquare className="w-3 h-3 text-white" />
                    )}
                  </button>
                  <span
                    className={`text-[0.8125rem] flex-1 ${
                      item.completed ? 'line-through text-gray-400' : 'text-gray-700'
                    }`}
                  >
                    {item.text}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeCheckItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-500 text-gray-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Add item */}
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={newCheckItem}
                onChange={(e) => setNewCheckItem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCheckItem())}
                placeholder="Add checklist item..."
                className="flex-1 text-[0.8125rem] py-1.5 px-2 bg-white border border-gray-200 rounded-lg focus:border-emerald-300 focus:ring-1 focus:ring-emerald-100 outline-none"
              />
              <button
                type="button"
                onClick={handleAddCheckItem}
                disabled={!newCheckItem.trim()}
                className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40 transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Advanced options toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors w-full"
          >
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <span className="font-medium">Advanced Options</span>
            <div className="flex-1 h-px bg-gray-200" />
          </button>

          {/* Advanced options */}
          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 overflow-hidden"
              >
                {/* Recurring */}
                <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                  <label className="flex items-center gap-2 cursor-pointer mb-3">
                    <input
                      type="checkbox"
                      checked={formData.is_recurring}
                      onChange={(e) =>
                        setFormData({ ...formData, is_recurring: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-200"
                    />
                    <Repeat className="w-4 h-4 text-violet-500" />
                    <span className="text-[0.8125rem] font-semibold text-gray-700">Recurring Task</span>
                  </label>

                  <AnimatePresence>
                    {formData.is_recurring && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 ml-6"
                      >
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Frequency</label>
                            <select
                              value={recurrence.frequency}
                              onChange={(e) =>
                                setRecurrence({ ...recurrence, frequency: e.target.value as RecurrenceRule['frequency'] })
                              }
                              className="input-field text-sm"
                            >
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                              <option value="monthly">Monthly</option>
                              <option value="yearly">Yearly</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">
                              Every X {recurrence.frequency === 'daily' ? 'days' : recurrence.frequency === 'weekly' ? 'weeks' : recurrence.frequency === 'monthly' ? 'months' : 'years'}
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={recurrence.interval}
                              onChange={(e) =>
                                setRecurrence({ ...recurrence, interval: parseInt(e.target.value) || 1 })
                              }
                              className="input-field text-sm"
                            />
                          </div>
                        </div>

                        {/* Days of week for weekly */}
                        {recurrence.frequency === 'weekly' && (
                          <div>
                            <label className="block text-xs text-gray-500 mb-2">Days</label>
                            <div className="flex gap-1.5">
                              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => {
                                    const days = recurrence.days_of_week || [];
                                    setRecurrence({
                                      ...recurrence,
                                      days_of_week: days.includes(i)
                                        ? days.filter((d) => d !== i)
                                        : [...days, i],
                                    });
                                  }}
                                  className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                                    recurrence.days_of_week?.includes(i)
                                      ? 'bg-emerald-500 text-white'
                                      : 'bg-white border border-gray-200 text-gray-600 hover:border-emerald-300'
                                  }`}
                                >
                                  {day}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Dependencies */}
                <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                  <label className="text-[0.8125rem] font-semibold text-gray-700 flex items-center gap-1.5 mb-3">
                    <Link2 className="w-4 h-4 text-blue-500" />
                    Dependencies
                  </label>
                  <p className="text-xs text-gray-400 mb-2">
                    Select tasks that must be completed before this one
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-1.5">
                    {availableTasks.slice(0, 10).map((t) => (
                      <label
                        key={t.id}
                        className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-white cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selectedDependencies.includes(t.id)}
                          onChange={() => {
                            setSelectedDependencies((prev) =>
                              prev.includes(t.id)
                                ? prev.filter((id) => id !== t.id)
                                : [...prev, t.id]
                            );
                          }}
                          className="w-3.5 h-3.5 rounded border-gray-300 text-blue-500 focus:ring-blue-200"
                        />
                        <span className="text-gray-700 truncate">{t.title}</span>
                      </label>
                    ))}
                    {availableTasks.length === 0 && (
                      <p className="text-xs text-gray-400">No available tasks to depend on</p>
                    )}
                  </div>
                </div>

                {/* Parent task */}
                <div>
                  <label className="text-[0.8125rem] font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                    Parent Task (Subtask of)
                  </label>
                  <select
                    value={formData.parent_task_id}
                    onChange={(e) => setFormData({ ...formData, parent_task_id: e.target.value })}
                    className="input-field"
                  >
                    <option value="">None (top-level task)</option>
                    {availableTasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={createTask.isPending || updateTask.isPending}
              className="btn-primary flex-1 flex items-center justify-center gap-2 py-3"
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
              className="btn-secondary py-3"
            >
              Cancel
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};
