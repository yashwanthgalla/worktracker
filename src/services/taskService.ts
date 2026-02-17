import { supabase } from '../lib/supabase';
import type { Task, Json } from '../types/database.types';

// Helpers
function mapTaskFromDB(dbTask: any): Task {
  return {
    ...dbTask,
    due_date: dbTask.due_date ? new Date(dbTask.due_date) : undefined,
    created_at: new Date(dbTask.created_at),
    updated_at: new Date(dbTask.updated_at),
    completed_at: dbTask.completed_at ? new Date(dbTask.completed_at) : undefined,
  };
}

// Create
export async function createTask(task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      due_date: task.due_date?.toISOString(),
      estimated_time: task.estimated_time,
      actual_time: task.actual_time,
      parent_task_id: task.parent_task_id,
      is_recurring: task.is_recurring,
      recurrence_rule: task.recurrence_rule as unknown as Json | null,
      auto_priority_score: task.auto_priority_score,
      category: task.category,
      tags: task.tags,
      completed_at: task.completed_at?.toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return mapTaskFromDB(data);
}

// Read
export async function getTasks(userId?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  const targetUserId = userId || user?.id;
  if (!targetUserId) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', targetUserId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(mapTaskFromDB);
}

export async function getTaskById(id: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return mapTaskFromDB(data);
}

export async function getSubtasks(parentId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('parent_task_id', parentId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data.map(mapTaskFromDB);
}

// Update
export async function updateTask(id: string, updates: Partial<Task>) {
  const updateData: any = {};

  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.priority !== undefined) updateData.priority = updates.priority;
  if (updates.due_date !== undefined) updateData.due_date = updates.due_date?.toISOString();
  if (updates.estimated_time !== undefined) updateData.estimated_time = updates.estimated_time;
  if (updates.actual_time !== undefined) updateData.actual_time = updates.actual_time;
  if (updates.parent_task_id !== undefined) updateData.parent_task_id = updates.parent_task_id;
  if (updates.category !== undefined) updateData.category = updates.category;
  if (updates.tags !== undefined) updateData.tags = updates.tags;
  if (updates.completed_at !== undefined) updateData.completed_at = updates.completed_at?.toISOString();
  if (updates.is_recurring !== undefined) updateData.is_recurring = updates.is_recurring;
  if (updates.recurrence_rule !== undefined) updateData.recurrence_rule = updates.recurrence_rule;
  if (updates.auto_priority_score !== undefined) updateData.auto_priority_score = updates.auto_priority_score;

  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapTaskFromDB(data);
}

// Delete
export async function deleteTask(id: string) {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Dependencies
export async function addDependency(taskId: string, dependsOnTaskId: string) {
  const { error } = await supabase
    .from('task_dependencies')
    .insert({ task_id: taskId, depends_on_task_id: dependsOnTaskId });

  if (error) throw error;
}

export async function removeDependency(taskId: string, dependsOnTaskId: string) {
  const { error } = await supabase
    .from('task_dependencies')
    .delete()
    .eq('task_id', taskId)
    .eq('depends_on_task_id', dependsOnTaskId);

  if (error) throw error;
}

export async function getTaskDependencies(taskId: string) {
  const { data, error } = await supabase
    .from('task_dependencies')
    .select('*, depends_on_task:depends_on_task_id(*)')
    .eq('task_id', taskId);

  if (error) throw error;
  return data;
}

// Re-export as namespace for backward compat
export const TaskService = {
  createTask,
  getTasks,
  getTaskById,
  getSubtasks,
  updateTask,
  deleteTask,
  addDependency,
  removeDependency,
  getTaskDependencies,
};
