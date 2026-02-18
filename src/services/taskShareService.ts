import { db } from '../lib/firebase';
import { auth } from '../lib/firebase';
import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy,
} from 'firebase/firestore';
import type { UserProfile } from '../types/database.types';
import { FriendService } from './friendService';

// ═══════════════════════════════════════════════════════
// Task Share Service – Firestore
// Collection: task_shares/{id}
//
// Allows users to share tasks with friends/followers.
// ═══════════════════════════════════════════════════════

function uid() {
  const u = auth.currentUser?.uid;
  if (!u) throw new Error('Not authenticated');
  return u;
}

export type SharePermission = 'view' | 'edit' | 'admin';

export interface TaskShare {
  id: string;
  task_id: string;
  owner_id: string;
  shared_with_id: string;
  permission: SharePermission;
  accepted: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  owner?: UserProfile;
  shared_with?: UserProfile;
}

// ─── Share CRUD ───

export async function shareTask(
  taskId: string,
  sharedWithId: string,
  permission: SharePermission = 'view',
): Promise<TaskShare> {
  const ownerId = uid();
  if (ownerId === sharedWithId) throw new Error('Cannot share a task with yourself');

  // Check if already shared
  const existingQ = query(
    collection(db, 'task_shares'),
    where('task_id', '==', taskId),
    where('shared_with_id', '==', sharedWithId),
  );
  const existingSnap = await getDocs(existingQ);
  if (!existingSnap.empty) throw new Error('Task already shared with this user');

  const data = {
    task_id: taskId,
    owner_id: ownerId,
    shared_with_id: sharedWithId,
    permission,
    accepted: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const ref = await addDoc(collection(db, 'task_shares'), data);

  // Send notification
  const myProfile = await FriendService.getProfile(ownerId);
  await addDoc(collection(db, 'users', sharedWithId, 'notifications'), {
    user_id: sharedWithId,
    type: 'task_reminder',
    title: 'Task Shared With You',
    body: `${myProfile?.full_name || 'Someone'} shared a task with you`,
    data: { task_share_id: ref.id, task_id: taskId },
    read: false,
    created_at: new Date().toISOString(),
  });

  return { id: ref.id, ...data };
}

export async function acceptTaskShare(shareId: string): Promise<void> {
  await updateDoc(doc(db, 'task_shares', shareId), {
    accepted: true,
    updated_at: new Date().toISOString(),
  });
}

export async function updateSharePermission(shareId: string, permission: SharePermission): Promise<void> {
  await updateDoc(doc(db, 'task_shares', shareId), {
    permission,
    updated_at: new Date().toISOString(),
  });
}

export async function revokeTaskShare(shareId: string): Promise<void> {
  await deleteDoc(doc(db, 'task_shares', shareId));
}

// ─── Queries ───

/** Tasks I have shared with others */
export async function getMySharedTasks(): Promise<TaskShare[]> {
  const q = query(
    collection(db, 'task_shares'),
    where('owner_id', '==', uid()),
    orderBy('created_at', 'desc'),
  );
  const snap = await getDocs(q);
  const shares = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TaskShare, 'id'>) }));

  // Attach profiles
  const userIds = [...new Set(shares.map((s) => s.shared_with_id))];
  const profiles = await FriendService.getProfiles(userIds);
  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  shares.forEach((s) => { s.shared_with = profileMap.get(s.shared_with_id); });
  return shares;
}

/** Tasks shared with me by others */
export async function getTasksSharedWithMe(): Promise<TaskShare[]> {
  const q = query(
    collection(db, 'task_shares'),
    where('shared_with_id', '==', uid()),
    orderBy('created_at', 'desc'),
  );
  const snap = await getDocs(q);
  const shares = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TaskShare, 'id'>) }));

  // Attach profiles
  const ownerIds = [...new Set(shares.map((s) => s.owner_id))];
  const profiles = await FriendService.getProfiles(ownerIds);
  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  shares.forEach((s) => { s.owner = profileMap.get(s.owner_id); });
  return shares;
}

/** Get all shares for a specific task */
export async function getTaskShares(taskId: string): Promise<TaskShare[]> {
  const q = query(
    collection(db, 'task_shares'),
    where('task_id', '==', taskId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TaskShare, 'id'>) }));
}

/** Check if the current user has access to a task */
export async function getSharePermission(taskId: string): Promise<SharePermission | null> {
  const id = uid();
  // Check if owner
  const taskSnap = await getDoc(doc(db, 'users', id, 'tasks', taskId));
  if (taskSnap.exists()) return 'admin';

  // Check shares
  const q = query(
    collection(db, 'task_shares'),
    where('task_id', '==', taskId),
    where('shared_with_id', '==', id),
    where('accepted', '==', true),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data().permission as SharePermission;
}

export const TaskShareService = {
  shareTask,
  acceptTaskShare,
  updateSharePermission,
  revokeTaskShare,
  getMySharedTasks,
  getTasksSharedWithMe,
  getTaskShares,
  getSharePermission,
};
