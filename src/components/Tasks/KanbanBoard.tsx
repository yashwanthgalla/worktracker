import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  useSensor,
  useSensors,
  PointerSensor,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task, KanbanColumn } from '../../types/database.types';
import { useUpdateTask } from '../../hooks/useTasks';
import { Flag, Clock, Calendar, GripVertical, MoreHorizontal } from 'lucide-react';
import { formatDate, getPriorityColor } from '../../utils/helpers';

interface KanbanBoardProps {
  tasks: Task[];
}

const COLUMNS: Omit<KanbanColumn, 'tasks'>[] = [
  { id: 'pending', title: 'To Do', status: 'pending', color: 'amber' },
  { id: 'in_progress', title: 'In Progress', status: 'in_progress', color: 'blue' },
  { id: 'completed', title: 'Done', status: 'completed', color: 'green' },
];

const COLUMN_COLORS: Record<string, { bg: string; border: string; dot: string; headerBg: string }> = {
  amber: { bg: 'bg-amber-50/60', border: 'border-amber-200/50', dot: 'bg-amber-400', headerBg: 'bg-amber-100/60' },
  blue: { bg: 'bg-blue-50/60', border: 'border-blue-200/50', dot: 'bg-blue-400', headerBg: 'bg-blue-100/60' },
  green: { bg: 'bg-green-50/60', border: 'border-green-200/50', dot: 'bg-green-400', headerBg: 'bg-green-100/60' },
};

export const KanbanBoard = ({ tasks }: KanbanBoardProps) => {
  const updateTask = useUpdateTask();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const columns = useMemo(() => {
    return COLUMNS.map((col) => ({
      ...col,
      tasks: tasks.filter((t) => t.status === col.status),
    }));
  }, [tasks]);

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Determine target column
    let targetStatus: Task['status'] | null = null;

    // Check if dropped on a column
    const targetColumn = COLUMNS.find((col) => col.id === over.id);
    if (targetColumn) {
      targetStatus = targetColumn.status;
    } else {
      // Dropped on another task - find which column that task is in
      const targetTask = tasks.find((t) => t.id === over.id);
      if (targetTask) {
        targetStatus = targetTask.status;
      }
    }

    if (targetStatus && targetStatus !== task.status) {
      updateTask.mutate({
        id: taskId,
        updates: {
          status: targetStatus,
          completed_at: targetStatus === 'completed' ? new Date() : undefined,
        },
      });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 min-h-[60vh]">
        {columns.map((column) => {
          const colors = COLUMN_COLORS[column.color];
          return (
            <div key={column.id} className="flex flex-col">
              {/* Column header */}
              <div className={`flex items-center gap-2.5 px-4 py-3 rounded-t-2xl ${colors.headerBg}`}>
                <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                <h3 className="text-sm font-semibold text-gray-800">{column.title}</h3>
                <span className="text-xs font-medium text-gray-400 bg-white/60 px-2 py-0.5 rounded-full">
                  {column.tasks.length}
                </span>
              </div>

              {/* Column body */}
              <div
                className={`flex-1 ${colors.bg} border ${colors.border} rounded-b-2xl p-3 space-y-2.5 min-h-[200px]`}
              >
                <SortableContext
                  items={column.tasks.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                  id={column.id}
                >
                  <AnimatePresence>
                    {column.tasks.map((task) => (
                      <KanbanCard key={task.id} task={task} />
                    ))}
                  </AnimatePresence>
                </SortableContext>

                {column.tasks.length === 0 && (
                  <div className="flex items-center justify-center h-24 text-xs text-gray-400 border-2 border-dashed border-gray-200/60 rounded-xl">
                    Drop tasks here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <DragOverlay>
        {activeTask && <KanbanCardOverlay task={activeTask} />}
      </DragOverlay>
    </DndContext>
  );
};

/* ─── Sortable Card ─── */
function KanbanCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: isDragging ? 0.4 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-sm hover:shadow-md transition-shadow group cursor-default"
    >
      <div className="flex items-start gap-2">
        <div
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="w-3.5 h-3.5 text-gray-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={`text-[0.8125rem] font-medium leading-snug mb-1.5 ${
              task.status === 'completed'
                ? 'line-through text-gray-400'
                : 'text-gray-800'
            }`}
          >
            {task.title}
          </p>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* Priority */}
            <span
              className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-md ${getPriorityColor(task.priority)}`}
            >
              <Flag className="w-2.5 h-2.5" />
              {task.priority}
            </span>

            {/* Due date */}
            {task.due_date && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded-md">
                <Calendar className="w-2.5 h-2.5" />
                {formatDate(task.due_date)}
              </span>
            )}

            {/* Estimated time */}
            {task.estimated_time && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded-md">
                <Clock className="w-2.5 h-2.5" />
                {task.estimated_time}m
              </span>
            )}
          </div>

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {task.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <button className="p-1 rounded-md hover:bg-gray-50 opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreHorizontal className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>
    </motion.div>
  );
}

/* ─── Drag overlay card ─── */
function KanbanCardOverlay({ task }: { task: Task }) {
  return (
    <div className="bg-white rounded-xl border border-emerald-200 p-3.5 shadow-xl rotate-2 scale-105">
      <p className="text-[0.8125rem] font-medium text-gray-800">{task.title}</p>
      <div className="flex items-center gap-1.5 mt-1.5">
        <span
          className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-md ${getPriorityColor(task.priority)}`}
        >
          <Flag className="w-2.5 h-2.5" />
          {task.priority}
        </span>
      </div>
    </div>
  );
}
