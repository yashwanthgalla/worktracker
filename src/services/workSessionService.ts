import { db } from '../lib/firebase';
import { auth } from '../lib/firebase';
import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc, query, where, orderBy,
} from 'firebase/firestore';
import type { WorkSession } from '../types/database.types';

// ═══════════════════════════════════════════════════════
// Work Session Service – Firestore only
// Collection: users/{uid}/work_sessions/{sessionId}
// ═══════════════════════════════════════════════════════

function uid() {
  const u = auth.currentUser?.uid;
  if (!u) throw new Error('Not authenticated');
  return u;
}

function sessionsCol() { return collection(db, 'users', uid(), 'work_sessions'); }

function docToSession(id: string, d: Record<string, unknown>): WorkSession {
  return {
    id,
    user_id: d.user_id as string ?? uid(),
    task_id: d.task_id as string | undefined,
    session_type: (d.session_type as WorkSession['session_type']) ?? 'pomodoro',
    duration: d.duration as number ?? 0,
    started_at: d.started_at ? new Date(d.started_at as string) : new Date(),
    ended_at: d.ended_at ? new Date(d.ended_at as string) : undefined,
    completed: d.completed as boolean ?? false,
    created_at: d.created_at ? new Date(d.created_at as string) : new Date(),
    notes: d.notes as string | undefined,
    mood: d.mood as WorkSession['mood'],
    distractions: d.distractions as number | undefined,
  };
}

export async function getSessions(): Promise<WorkSession[]> {
  const q = query(sessionsCol(), orderBy('started_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((s) => docToSession(s.id, s.data() as Record<string, unknown>));
}

export async function getTodaySessions(): Promise<WorkSession[]> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const q = query(sessionsCol(), where('started_at', '>=', start.toISOString()), orderBy('started_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((s) => docToSession(s.id, s.data() as Record<string, unknown>));
}

export async function startSession(
  taskId: string | null,
  duration: number,
  sessionType: 'pomodoro' | 'custom' | 'break' = 'pomodoro',
): Promise<WorkSession> {
  const data = {
    user_id: uid(),
    task_id: taskId || null,
    session_type: sessionType,
    duration,
    started_at: new Date().toISOString(),
    ended_at: null,
    completed: false,
    created_at: new Date().toISOString(),
  };
  const ref = await addDoc(sessionsCol(), data);
  return docToSession(ref.id, data as Record<string, unknown>);
}

export async function endSession(sessionId: string, completed = true): Promise<WorkSession> {
  const now = new Date().toISOString();
  await updateDoc(doc(db, 'users', uid(), 'work_sessions', sessionId), { ended_at: now, completed });
  const snap = await getDoc(doc(db, 'users', uid(), 'work_sessions', sessionId));
  if (!snap.exists()) throw new Error('Session not found');
  return docToSession(snap.id, snap.data() as Record<string, unknown>);
}

export async function getSessionsByDateRange(startDate: Date, endDate: Date): Promise<WorkSession[]> {
  const q = query(
    sessionsCol(),
    where('started_at', '>=', startDate.toISOString()),
    where('started_at', '<=', endDate.toISOString()),
    orderBy('started_at', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((s) => docToSession(s.id, s.data() as Record<string, unknown>));
}

export const WorkSessionService = {
  getSessions, getTodaySessions, startSession, endSession, getSessionsByDateRange,
};
