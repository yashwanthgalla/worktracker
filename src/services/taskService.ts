import { db } from '../lib/firebase';
import { auth } from '../lib/firebase';
import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc, query, where, orderBy, writeBatch,
  Timestamp,
} from 'firebase/firestore';
import type { Task, TaskDependency } from '../types/database.types';

// ═══════════════════════════════════════════════════════
// Task Service – Firestore only
// Collection: users/{uid}/tasks/{taskId}
// Dependencies: users/{uid}/task_dependencies/{depId}
// ═══════════════════════════════════════════════════════

function uid() {
  const u = auth.currentUser?.uid;
  if (!u) throw new Error('Not authenticated');
  return u;
}

function tasksCol() { return collection(db, 'users', uid(), 'tasks'); }
function depsCol() { return collection(db, 'users', uid(), 'task_dependencies'); }

function toDate(v: unknown): Date {
  if (!v) return new Date();
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  return new Date(v as string);
}

function docToTask(id: string, d: Record<string, unknown>): Task {
  return {
    id,
    user_id: d.user_id as string ?? uid(),
    title: d.title as string ?? '',
    description: d.description as string | undefined,
    status: (d.status as Task['status']) ?? 'pending',
    priority: (d.priority as Task['priority']) ?? 'medium',
    due_date: d.due_date ? toDate(d.due_date) : undefined,
    estimated_time: d.estimated_time as number | undefined,
    actual_time: d.actual_time as number | undefined,
    parent_task_id: d.parent_task_id as string | undefined,
    is_recurring: d.is_recurring as boolean ?? false,
    recurrence_rule: d.recurrence_rule as Task['recurrence_rule'],
    auto_priority_score: d.auto_priority_score as number | undefined,
    category: d.category as string | undefined,
    tags: d.tags as string[] | undefined,
    created_at: toDate(d.created_at),
    updated_at: toDate(d.updated_at),
    completed_at: d.completed_at ? toDate(d.completed_at) : undefined,
    checklist: d.checklist as Task['checklist'],
    attachments: d.attachments as Task['attachments'],
    time_blocks: d.time_blocks as Task['time_blocks'],
  };
}

/** Remove keys whose value is `undefined` – Firestore rejects them. */
function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

function taskToDoc(task: Partial<Task> & { title: string }) {
  const d: Record<string, unknown> = { ...task, user_id: uid(), updated_at: new Date().toISOString() };
  if (task.due_date) d.due_date = (task.due_date instanceof Date ? task.due_date : new Date(task.due_date)).toISOString();
  if (task.created_at) d.created_at = (task.created_at instanceof Date ? task.created_at : new Date(task.created_at)).toISOString();
  if (task.completed_at) d.completed_at = (task.completed_at instanceof Date ? task.completed_at : new Date(task.completed_at)).toISOString();
  if (!d.created_at) d.created_at = new Date().toISOString();
  delete d.id;
  delete d.subtasks;
  delete d.dependencies;
  return stripUndefined(d);
}

// ─── CRUD ───

export async function getTasks(): Promise<Task[]> {
  const q = query(tasksCol(), orderBy('created_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((s) => docToTask(s.id, s.data() as Record<string, unknown>));
}

export async function getTaskById(id: string): Promise<Task> {
  const snap = await getDoc(doc(db, 'users', uid(), 'tasks', id));
  if (!snap.exists()) throw new Error('Task not found');
  const task = docToTask(snap.id, snap.data() as Record<string, unknown>);

  // Load dependencies
  const depQ = query(depsCol(), where('task_id', '==', id));
  const depSnap = await getDocs(depQ);
  const deps: TaskDependency[] = depSnap.docs.map((d) => {
    const dd = d.data();
    return { id: d.id, task_id: dd.task_id, depends_on_task_id: dd.depends_on_task_id, created_at: toDate(dd.created_at) };
  });
  task.dependencies = deps;
  return task;
}

export async function createTask(taskData: Partial<Task> & { title: string }): Promise<Task> {
  const docData = taskToDoc(taskData);
  const ref = await addDoc(tasksCol(), docData);

  // Dependencies
  if (taskData.dependencies && taskData.dependencies.length > 0) {
    const batch = writeBatch(db);
    for (const dep of taskData.dependencies) {
      const depRef = doc(depsCol());
      batch.set(depRef, { task_id: ref.id, depends_on_task_id: dep.depends_on_task_id, created_at: new Date().toISOString() });
    }
    await batch.commit();
  }

  return getTaskById(ref.id);
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task> {
  const d: Record<string, unknown> = { ...updates, updated_at: new Date().toISOString() };
  if (updates.due_date) d.due_date = (updates.due_date instanceof Date ? updates.due_date : new Date(updates.due_date)).toISOString();
  if (updates.completed_at) d.completed_at = (updates.completed_at instanceof Date ? updates.completed_at : new Date(updates.completed_at)).toISOString();
  if (updates.status === 'completed' && !updates.completed_at) d.completed_at = new Date().toISOString();
  delete d.id; delete d.subtasks; delete d.dependencies;
  await updateDoc(doc(db, 'users', uid(), 'tasks', id), stripUndefined(d));

  // Update dependencies if provided
  if (updates.dependencies) {
    const existingQ = query(depsCol(), where('task_id', '==', id));
    const existingSnap = await getDocs(existingQ);
    const batch = writeBatch(db);
    existingSnap.docs.forEach((d) => batch.delete(d.ref));
    for (const dep of updates.dependencies) {
      const depRef = doc(depsCol());
      batch.set(depRef, { task_id: id, depends_on_task_id: dep.depends_on_task_id, created_at: new Date().toISOString() });
    }
    await batch.commit();
  }

  return getTaskById(id);
}

export async function deleteTask(id: string): Promise<string> {
  // Delete dependencies
  const depQ = query(depsCol(), where('task_id', '==', id));
  const depSnap = await getDocs(depQ);
  const batch = writeBatch(db);
  depSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, 'users', uid(), 'tasks', id));
  await batch.commit();

  // Delete subtasks
  const subQ = query(tasksCol(), where('parent_task_id', '==', id));
  const subSnap = await getDocs(subQ);
  if (!subSnap.empty) {
    const subBatch = writeBatch(db);
    subSnap.docs.forEach((d) => subBatch.delete(d.ref));
    await subBatch.commit();
  }

  return id;
}

export async function getSubtasks(parentId: string): Promise<Task[]> {
  const q = query(tasksCol(), where('parent_task_id', '==', parentId), orderBy('created_at', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((s) => docToTask(s.id, s.data() as Record<string, unknown>));
}

export async function getDependencies(taskId: string): Promise<TaskDependency[]> {
  const q = query(depsCol(), where('task_id', '==', taskId));
  const snap = await getDocs(q);
  const deps: TaskDependency[] = [];
  for (const d of snap.docs) {
    const dd = d.data();
    const dep: TaskDependency = { id: d.id, task_id: dd.task_id, depends_on_task_id: dd.depends_on_task_id, created_at: toDate(dd.created_at) };
    try {
      const taskSnap = await getDoc(doc(db, 'users', uid(), 'tasks', dd.depends_on_task_id));
      if (taskSnap.exists()) dep.depends_on_task = docToTask(taskSnap.id, taskSnap.data() as Record<string, unknown>);
    } catch { /* ok */ }
    deps.push(dep);
  }
  return deps;
}

export const TaskService = {
  getTasks, getTaskById, createTask, updateTask, deleteTask, getSubtasks, getDependencies,
};
