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
  signInWithRedirect,
  getRedirectResult,
  RecaptchaVerifier,
  PhoneAuthProvider,
  updatePhoneNumber,
  linkWithCredential,
  signInWithCredential,
  signInAnonymously,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  query,
  collection,
  where,
  getDocs,
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

// Suppresses onAuthStateChange callbacks during signup/verification flows
// to prevent dashboard flash from temporary Firebase auth state changes.
let _suppressAuthCallback = false;

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
  _suppressAuthCallback = true;
  try {
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
  } finally {
    _suppressAuthCallback = false;
  }
}

// ─── Verification helpers ───

export async function sendVerificationEmail(email: string, password: string) {
  _suppressAuthCallback = true;
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(cred.user);
    await firebaseSignOut(auth);
  } finally {
    _suppressAuthCallback = false;
  }
}

export async function checkEmailVerified(email: string, password: string): Promise<boolean> {
  _suppressAuthCallback = true;
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await cred.user.reload();
    const verified = cred.user.emailVerified;
    await firebaseSignOut(auth);
    return verified;
  } catch {
    return false;
  } finally {
    _suppressAuthCallback = false;
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
googleProvider.addScope('email');
googleProvider.addScope('profile');

async function ensureGoogleProfile(user: import('firebase/auth').User) {
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
}

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await ensureGoogleProfile(result.user);
    const appUser = await buildAppUser();
    if (!appUser) throw new Error('Unable to load user profile after Google sign-in');
    return { user: appUser };
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    // Fallback to redirect if popup is blocked
    if (code === 'auth/popup-blocked' || code === 'auth/cancelled-popup-request') {
      await signInWithRedirect(auth, googleProvider);
      throw new Error('Redirecting to Google sign-in…');
    }
    if (code === 'auth/account-exists-with-different-credential') {
      throw new Error('An account already exists with this email using a different sign-in method.');
    }
    if (code === 'auth/unauthorized-domain') {
      throw new Error('This domain is not authorized for Google sign-in. Check Firebase Console → Authentication → Settings → Authorized domains.');
    }
    throw error;
  }
}

// Handle redirect result after Google redirect flow
export async function checkRedirectResult(): Promise<AppUser | null> {
  try {
    const result = await getRedirectResult(auth);
    if (!result) return null;
    await ensureGoogleProfile(result.user);
    const appUser = await buildAppUser();
    return appUser;
  } catch {
    return null;
  }
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
      // Skip unverified email users (signup in progress)
      if (fbUser.email && !fbUser.emailVerified) { resolve(null); return; }
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
    // Skip events while signup/verification helpers are running
    if (_suppressAuthCallback) return;
    if (fbUser) {
      // Skip unverified email users – prevents dashboard flash during signup & verification polling
      // Use fbUser.email check (not providerData) because providerData can be empty right after creation
      if (fbUser.email && !fbUser.emailVerified) {
        callback(null);
        return;
      }
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

// ─── Phone OTP Sign-In (after MSG91 verification) ───
// MSG91 handles OTP verification. This creates/retrieves the Firebase user profile.
export async function signInWithPhoneOTP(phoneNumber: string): Promise<{ user: AppUser }> {
  // Check if a user profile already exists with this phone number
  const q = query(collection(db, 'user_profiles'), where('phone', '==', phoneNumber));
  const snap = await getDocs(q);

  if (snap.size > 0 && auth.currentUser) {
    // User already exists — update status
    const existingProfile = snap.docs[0];
    await setDoc(doc(db, 'user_profiles', existingProfile.id), {
      status: 'online',
      last_seen: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { merge: true });

    const appUser = await buildAppUser();
    if (appUser) return { user: appUser };
  }

  // Sign in anonymously to get a Firebase UID, then attach phone info
  let user = auth.currentUser;
  if (!user) {
    const anonResult = await signInAnonymously(auth);
    user = anonResult.user;
  }

  // Check if this specific user already has a profile
  const profileSnap = await getDoc(doc(db, 'user_profiles', user.uid));
  if (!profileSnap.exists()) {
    // Create a new profile
    await setDoc(doc(db, 'user_profiles', user.uid), {
      id: user.uid,
      email: user.email || '',
      full_name: phoneNumber,
      username: null,
      avatar_url: null,
      phone: phoneNumber,
      status: 'online',
      last_seen: new Date().toISOString(),
      is_private: false,
      bio: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } else {
    // Update existing profile with phone
    await setDoc(doc(db, 'user_profiles', user.uid), {
      phone: phoneNumber,
      status: 'online',
      last_seen: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { merge: true });
  }

  const appUser = await buildAppUser();
  if (!appUser) throw new Error('Unable to load user profile after phone sign-in');
  return { user: appUser };
}

// ─── Namespace ───
export const AuthService = {
  signUp, signIn, signInWithGoogle, signOut, getSession, getCurrentUser, getCurrentUserId,
  resetPassword, updatePassword, updateProfile, onAuthStateChange,
  sendVerificationEmail, checkEmailVerified, completeVerification,
  checkRedirectResult,
  initRecaptcha, sendPhoneVerificationCode, signInWithPhoneNumber,
  sendPhoneSMSOTP, verifyPhoneSMSOTP, cleanupRecaptcha,
  signInWithPhoneOTP,
};
