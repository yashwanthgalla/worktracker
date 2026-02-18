import { auth } from '../lib/firebase';
import { db } from '../lib/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile as firebaseUpdateProfile,
  sendPasswordResetEmail,
  updatePassword as firebaseUpdatePassword,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  RecaptchaVerifier,
  PhoneAuthProvider,
  updatePhoneNumber,
  linkWithCredential,
  signInWithCredential,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
} from 'firebase/firestore';

// ═══════════════════════════════════════════════════════
// Auth Service – Firebase Auth
// User profiles stored in Firestore user_profiles/{uid}.
// Canonical user ID = Firebase UID.
// ═══════════════════════════════════════════════════════

export interface AppUser {
  id: string;
  email: string;
  user_metadata: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

// ─── Helpers ───

export function getCurrentUserId(): string | null {
  return auth.currentUser?.uid ?? null;
}

async function buildAppUser(): Promise<AppUser | null> {
  const user = auth.currentUser;
  if (!user) return null;

  const profileSnap = await getDoc(doc(db, 'user_profiles', user.uid));
  const profile = profileSnap.exists() ? profileSnap.data() : null;

  return {
    id: user.uid,
    email: user.email || '',
    user_metadata: {
      full_name: profile?.full_name ?? user.displayName ?? null,
      username: profile?.username ?? null,
      avatar_url: profile?.avatar_url ?? user.photoURL ?? null,
    },
  };
}

// ─── Sign Up ───
export async function signUp(email: string, password: string, fullName?: string, username?: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (fullName) await firebaseUpdateProfile(cred.user, { displayName: fullName });

  await setDoc(doc(db, 'user_profiles', cred.user.uid), {
    id: cred.user.uid,
    email,
    full_name: fullName || email.split('@')[0],
    username: username || null,
    avatar_url: null,
    status: 'online',
    last_seen: new Date().toISOString(),
    is_private: false,
    bio: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  await firebaseSignOut(auth);

  return {
    pendingVerification: true,
    userId: cred.user.uid,
    email,
    fullName: fullName || null,
    username: username || null,
    _creds: { email, password },
  };
}

// ─── Verification helpers ───

export async function sendVerificationEmail(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(cred.user);
  await firebaseSignOut(auth);
}

export async function checkEmailVerified(email: string, password: string): Promise<boolean> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await cred.user.reload();
    const verified = cred.user.emailVerified;
    await firebaseSignOut(auth);
    return verified;
  } catch {
    return false;
  }
}

export async function completeVerification(email: string, password: string) {
  await signInWithEmailAndPassword(auth, email, password);
  const appUser = await buildAppUser();
  if (!appUser) throw new Error('Unable to load user profile');
  await setDoc(doc(db, 'user_profiles', appUser.id), { status: 'online', last_seen: new Date().toISOString(), updated_at: new Date().toISOString() }, { merge: true });
  return { user: appUser };
}

// ─── Sign In ───
export async function signIn(email: string, password: string) {
  await signInWithEmailAndPassword(auth, email, password);
  const appUser = await buildAppUser();
  if (!appUser) throw new Error('Unable to load user profile after sign-in');
  await setDoc(doc(db, 'user_profiles', appUser.id), { status: 'online', last_seen: new Date().toISOString(), updated_at: new Date().toISOString() }, { merge: true });
  return { user: appUser };
}

// ─── Google Sign In ───
const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  const profileSnap = await getDoc(doc(db, 'user_profiles', user.uid));
  if (!profileSnap.exists()) {
    await setDoc(doc(db, 'user_profiles', user.uid), {
      id: user.uid,
      email: user.email || '',
      full_name: user.displayName || user.email?.split('@')[0] || '',
      username: null,
      avatar_url: user.photoURL || null,
      status: 'online',
      last_seen: new Date().toISOString(),
      is_private: false,
      bio: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } else {
    await setDoc(doc(db, 'user_profiles', user.uid), { status: 'online', last_seen: new Date().toISOString(), updated_at: new Date().toISOString() }, { merge: true });
  }
  const appUser = await buildAppUser();
  if (!appUser) throw new Error('Unable to load user profile after Google sign-in');
  return { user: appUser };
}

// ─── Sign Out ───
export async function signOut() {
  const uid = getCurrentUserId();
  if (uid) {
    await setDoc(doc(db, 'user_profiles', uid), { status: 'offline', last_seen: new Date().toISOString(), updated_at: new Date().toISOString() }, { merge: true }).catch(() => {});
  }
  await firebaseSignOut(auth);
}

// ─── Get Current User ───
export async function getCurrentUser(): Promise<AppUser | null> {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      unsub();
      if (!fbUser) { resolve(null); return; }
      const appUser = await buildAppUser();
      resolve(appUser);
    });
  });
}

export async function getSession() {
  const user = await getCurrentUser();
  return user ? { user } : null;
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth, email);
}

export async function updatePassword(newPassword: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('No authenticated user');
  await firebaseUpdatePassword(user, newPassword);
}

export async function updateProfile(updates: Record<string, unknown>) {
  const user = auth.currentUser;
  if (!user) throw new Error('No authenticated user');
  const fbUpdates: { displayName?: string; photoURL?: string } = {};
  if (updates.full_name) fbUpdates.displayName = updates.full_name as string;
  if (updates.avatar_url) fbUpdates.photoURL = updates.avatar_url as string;
  if (Object.keys(fbUpdates).length > 0) await firebaseUpdateProfile(user, fbUpdates);

  const profileUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const allowedFields = ['full_name', 'username', 'avatar_url', 'phone', 'bio',
    'address_line1', 'address_line2', 'city', 'state', 'zip_code', 'country',
    'timezone', 'language', 'date_format',
    'email_notifications', 'push_notifications', 'task_reminders',
    'weekly_summary', 'friend_requests', 'message_notifications'];
  for (const field of allowedFields) {
    if (updates[field] !== undefined) profileUpdates[field] = updates[field];
  }
  await setDoc(doc(db, 'user_profiles', user.uid), profileUpdates, { merge: true });
}

export function onAuthStateChange(callback: (user: AppUser | null) => void) {
  return onAuthStateChanged(auth, async (fbUser) => {
    if (fbUser) {
      const appUser = await buildAppUser();
      callback(appUser);
    } else {
      callback(null);
    }
  });
}

// ─── Phone SMS Verification ───

let recaptchaVerifier: RecaptchaVerifier | null = null;
let phoneVerificationId: string | null = null;

export function initRecaptcha(containerId: string) {
  if (recaptchaVerifier) { try { recaptchaVerifier.clear(); } catch { /* */ } }
  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, { size: 'invisible' });
  return recaptchaVerifier;
}

// Send phone verification code (for phone-based sign in/sign up)
export async function sendPhoneVerificationCode(phoneNumber: string): Promise<string> {
  if (!recaptchaVerifier) throw new Error('reCAPTCHA not initialised');
  const provider = new PhoneAuthProvider(auth);
  const verificationId = await provider.verifyPhoneNumber(phoneNumber, recaptchaVerifier);
  phoneVerificationId = verificationId;
  return verificationId;
}

// Sign in with phone number (creates new user if doesn't exist)
export async function signInWithPhoneNumber(verificationId: string, verificationCode: string) {
  const credential = PhoneAuthProvider.credential(verificationId, verificationCode);
  const result = await signInWithCredential(auth, credential);
  const user = result.user;

  // Check if profile exists, create if not
  const profileSnap = await getDoc(doc(db, 'user_profiles', user.uid));
  if (!profileSnap.exists()) {
    await setDoc(doc(db, 'user_profiles', user.uid), {
      id: user.uid,
      email: user.email || '',
      full_name: user.phoneNumber || 'User',
      username: null,
      avatar_url: null,
      phone: user.phoneNumber,
      status: 'online',
      last_seen: new Date().toISOString(),
      is_private: false,
      bio: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } else {
    await setDoc(doc(db, 'user_profiles', user.uid), { status: 'online', last_seen: new Date().toISOString(), updated_at: new Date().toISOString() }, { merge: true });
  }

  phoneVerificationId = null;
  const appUser = await buildAppUser();
  if (!appUser) throw new Error('Unable to load user profile after phone sign-in');
  return { user: appUser };
}

// Add phone to existing account
export async function sendPhoneSMSOTP(phoneNumber: string): Promise<string> {
  if (!recaptchaVerifier) throw new Error('reCAPTCHA not initialised');
  const provider = new PhoneAuthProvider(auth);
  const verificationId = await provider.verifyPhoneNumber(phoneNumber, recaptchaVerifier);
  phoneVerificationId = verificationId;
  return verificationId;
}

export async function verifyPhoneSMSOTP(code: string): Promise<boolean> {
  if (!phoneVerificationId) throw new Error('No pending phone verification');
  const user = auth.currentUser;
  if (!user) throw new Error('No authenticated user');
  const credential = PhoneAuthProvider.credential(phoneVerificationId, code);
  try { await updatePhoneNumber(user, credential); } catch {
    try { await linkWithCredential(user, credential); } catch { return false; }
  }
  await setDoc(doc(db, 'user_profiles', user.uid), { phone: user.phoneNumber, updated_at: new Date().toISOString() }, { merge: true });
  phoneVerificationId = null;
  return true;
}

export function cleanupRecaptcha() {
  if (recaptchaVerifier) { try { recaptchaVerifier.clear(); } catch { /* */ } recaptchaVerifier = null; }
}

// ─── Namespace ───
export const AuthService = {
  signUp, signIn, signInWithGoogle, signOut, getSession, getCurrentUser, getCurrentUserId,
  resetPassword, updatePassword, updateProfile, onAuthStateChange,
  sendVerificationEmail, checkEmailVerified, completeVerification,
  initRecaptcha, sendPhoneVerificationCode, signInWithPhoneNumber,
  sendPhoneSMSOTP, verifyPhoneSMSOTP, cleanupRecaptcha,
};
