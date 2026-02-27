import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Mail, Lock, MapPin, Phone, Globe, Bell, Palette, Shield,
  Save, Loader2, ChevronRight, Building2,
  AtSign, Smartphone, ArrowRight, Check, CheckCircle2,
  Trash2, Download, LogOut, Search, X, ChevronDown, RefreshCw,
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { AuthService } from '../../services/authService';
import { OTPService } from '../../services/otpService';
import { TaskService } from '../../services/taskService';
import { db, auth as firebaseAuth } from '../../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { countryCodes, getDefaultCountry, type CountryCode } from '../../data/countryCodes';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '../ui/input-otp';

// ═══════════════════════════════════════════════════════
// Settings Page – Firestore profile, Firebase Auth
// ═══════════════════════════════════════════════════════

interface ProfileData {
  full_name: string;
  username: string;
  email: string;
  phone: string;
  bio: string;
  avatar_url: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  timezone: string;
  language: string;
  date_format: string;
  email_notifications: boolean;
  push_notifications: boolean;
  task_reminders: boolean;
  weekly_summary: boolean;
  friend_requests: boolean;
  message_notifications: boolean;
}

const defaultProfile: ProfileData = {
  full_name: '', username: '', email: '', phone: '', bio: '', avatar_url: '',
  address_line1: '', address_line2: '', city: '', state: '', zip_code: '', country: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  language: 'en', date_format: 'MM/DD/YYYY',
  email_notifications: true, push_notifications: true, task_reminders: true,
  weekly_summary: true, friend_requests: true, message_notifications: true,
};

type Section = 'profile' | 'security' | 'notifications' | 'appearance' | 'address' | 'account';

const sections: { id: Section; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'address', label: 'Address', icon: MapPin },
  { id: 'account', label: 'Account', icon: Shield },
];

export const SettingsPage = () => {
  const { user, setUser, theme, toggleTheme } = useAppStore();
  const [profile, setProfile] = useState<ProfileData>(defaultProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>('profile');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Load profile from Firestore
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'user_profiles', user.id));
        if (snap.exists()) {
          const d = snap.data();
          setProfile({
            ...defaultProfile,
            full_name: d.full_name || '',
            username: d.username || '',
            email: d.email || user.email || '',
            phone: d.phone || '',
            bio: d.bio || '',
            avatar_url: d.avatar_url || '',
            address_line1: d.address_line1 || '',
            address_line2: d.address_line2 || '',
            city: d.city || '',
            state: d.state || '',
            zip_code: d.zip_code || '',
            country: d.country || '',
            timezone: d.timezone || defaultProfile.timezone,
            language: d.language || 'en',
            date_format: d.date_format || 'MM/DD/YYYY',
            email_notifications: d.email_notifications ?? true,
            push_notifications: d.push_notifications ?? true,
            task_reminders: d.task_reminders ?? true,
            weekly_summary: d.weekly_summary ?? true,
            friend_requests: d.friend_requests ?? true,
            message_notifications: d.message_notifications ?? true,
          });
        }
      } catch (e) { console.error('Failed to load profile:', e); }
      setLoading(false);
    })();
  }, [user?.id, user?.email]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await AuthService.updateProfile(profile as unknown as Record<string, unknown>);
      const updated = await AuthService.getCurrentUser();
      if (updated) setUser(updated);
      toast.success('Settings saved!');
    } catch (e) {
      toast.error('Failed to save settings');
    }
    setSaving(false);
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    try {
      await AuthService.updatePassword(newPassword);
      toast.success('Password updated!');
      setNewPassword(''); setConfirmPassword('');
    } catch (e) { toast.error('Failed to update password. You may need to re-authenticate.'); }
  };

  const update = (key: keyof ProfileData, value: string | boolean): void => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your account preferences</p>
      </div>

      <div className="flex gap-8">
        {/* Sidebar */}
        <div className="w-56 shrink-0">
          <nav className="space-y-1">
            {sections.map((s) => {
              const Icon = s.icon;
              const active = activeSection === s.id;
              return (
                <button key={s.id} onClick={() => setActiveSection(s.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    active ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                  }`}>
                  <Icon className="w-4.5 h-4.5" />
                  {s.label}
                  {active && <ChevronRight className="w-4 h-4 ml-auto" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
          {activeSection === 'profile' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>

              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                  {profile.avatar_url ? <img src={profile.avatar_url} className="w-full h-full rounded-2xl object-cover" /> : (profile.full_name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{profile.full_name || 'Your Name'}</p>
                  <p className="text-sm text-gray-500">{profile.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <InputField icon={User} label="Full Name" value={profile.full_name} onChange={(v) => update('full_name', v)} />
                <InputField icon={AtSign} label="Username" value={profile.username} onChange={(v) => update('username', v)} />
                <InputField icon={Mail} label="Email" value={profile.email} onChange={(v) => update('email', v)} disabled />
                <InputField icon={Phone} label="Phone" value={profile.phone} onChange={(v) => update('phone', v)} disabled={!!profile.phone} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Bio</label>
                <textarea value={profile.bio} onChange={(e) => update('bio', e.target.value)} rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm transition-all resize-none" />
              </div>

              {!profile.phone ? (
                <PhoneVerificationCard onPhoneVerified={(verifiedPhone) => {
                  update('phone', verifiedPhone);
                }} />
              ) : (
                <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-100 bg-emerald-50/50">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-emerald-700">Phone Verified</p>
                    <p className="text-xs text-emerald-600/70">{profile.phone}</p>
                  </div>
                  <button
                    onClick={() => update('phone', '')}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded-md hover:bg-red-50"
                  >
                    Change
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {activeSection === 'security' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Security</h2>
              <div className="space-y-4">
                <InputField icon={Lock} label="New Password" value={newPassword} onChange={setNewPassword} type="password" />
                <InputField icon={Lock} label="Confirm Password" value={confirmPassword} onChange={setConfirmPassword} type="password" />
                <button onClick={handlePasswordChange}
                  className="px-6 py-2.5 rounded-xl bg-linear-to-r from-emerald-500 to-teal-500 text-white text-sm font-medium hover:from-emerald-600 hover:to-teal-600 transition-all">
                  Update Password
                </button>
              </div>
            </motion.div>
          )}

          {activeSection === 'notifications' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
              <div className="space-y-4">
                <ToggleRow label="Email Notifications" description="Receive email updates" checked={profile.email_notifications} onChange={(v) => update('email_notifications', v)} />
                <ToggleRow label="Push Notifications" description="Browser push notifications" checked={profile.push_notifications} onChange={(v) => update('push_notifications', v)} />
                <ToggleRow label="Task Reminders" description="Get reminded about due tasks" checked={profile.task_reminders} onChange={(v) => update('task_reminders', v)} />
                <ToggleRow label="Weekly Summary" description="Receive weekly productivity digest" checked={profile.weekly_summary} onChange={(v) => update('weekly_summary', v)} />
                <ToggleRow label="Friend Requests" description="Notify on friend / follow requests" checked={profile.friend_requests} onChange={(v) => update('friend_requests', v)} />
                <ToggleRow label="Message Notifications" description="Notify on new messages" checked={profile.message_notifications} onChange={(v) => update('message_notifications', v)} />
              </div>
            </motion.div>
          )}

          {activeSection === 'appearance' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Appearance</h2>
              <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100">
                <div>
                  <p className="font-medium text-gray-900">Dark Mode</p>
                  <p className="text-sm text-gray-500">Switch between light and dark themes</p>
                </div>
                <button onClick={toggleTheme}
                  className={`w-12 h-7 rounded-full transition-colors ${theme === 'dark' ? 'bg-emerald-500' : 'bg-gray-300'} relative`}>
                  <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Language</label>
                  <select value={profile.language} onChange={(e) => update('language', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-400 outline-none text-sm">
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Date Format</label>
                  <select value={profile.date_format} onChange={(e) => update('date_format', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-400 outline-none text-sm">
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'address' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Address</h2>
              <div className="space-y-4">
                <InputField icon={MapPin} label="Address Line 1" value={profile.address_line1} onChange={(v) => update('address_line1', v)} />
                <InputField icon={MapPin} label="Address Line 2" value={profile.address_line2} onChange={(v) => update('address_line2', v)} />
                <div className="grid grid-cols-2 gap-4">
                  <InputField icon={Building2} label="City" value={profile.city} onChange={(v) => update('city', v)} />
                  <InputField icon={MapPin} label="State" value={profile.state} onChange={(v) => update('state', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <InputField icon={MapPin} label="ZIP Code" value={profile.zip_code} onChange={(v) => update('zip_code', v)} />
                  <InputField icon={Globe} label="Country" value={profile.country} onChange={(v) => update('country', v)} />
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'account' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Account</h2>

              {/* Account Info */}
              <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Email</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                  <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg font-medium">Verified</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Account ID</p>
                    <p className="text-xs text-gray-400 font-mono">{user?.id?.slice(0, 20)}...</p>
                  </div>
                </div>
              </div>

              {/* Export Data */}
              <div className="p-4 rounded-xl border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Export Your Data</p>
                    <p className="text-xs text-gray-500">Download all your tasks, sessions, and settings as JSON</p>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        const tasks = await TaskService.getTasks();
                        const data = { profile, tasks, exportedAt: new Date().toISOString() };
                        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url; a.download = `worktracker-export-${new Date().toISOString().split('T')[0]}.json`;
                        a.click(); URL.revokeObjectURL(url);
                        toast.success('Data exported!');
                      } catch { toast.error('Failed to export data'); }
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                </div>
              </div>

              {/* Sign Out */}
              <div className="p-4 rounded-xl border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Sign Out</p>
                    <p className="text-xs text-gray-500">Sign out from this device</p>
                  </div>
                  <button
                    onClick={async () => {
                      try { await AuthService.signOut(); toast.success('Signed out'); } catch { toast.error('Failed to sign out'); }
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="p-4 rounded-xl border border-red-100 bg-red-50/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-red-700 text-sm">Delete Account</p>
                    <p className="text-xs text-red-500">Permanently delete your account and all data. This cannot be undone.</p>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete your account? This action is permanent and cannot be undone.')) {
                        toast.error('Account deletion requires re-authentication. Please contact support.');
                      }
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-100 text-red-700 text-sm font-medium hover:bg-red-200 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Save Button */}
          <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-linear-to-r from-emerald-500 to-teal-500 text-white text-sm font-medium hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Sub-components ───

function InputField({ icon: Icon, label, value, onChange, type = 'text', disabled = false }: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; label: string; value: string; onChange: (v: string) => void; type?: string; disabled?: boolean;
}): React.ReactElement {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm transition-all disabled:bg-gray-50 disabled:text-gray-400" />
      </div>
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100">
      <div>
        <p className="font-medium text-gray-900 text-sm">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <button onClick={() => onChange(!checked)}
        className={`w-12 h-7 rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-gray-300'} relative`}>
        <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

function PhoneVerificationCard({ onPhoneVerified }: { onPhoneVerified?: (phone: string) => void }) {
  const [phone, setPhone] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [step, setStep] = useState<'idle' | 'sending' | 'verify' | 'done'>('idle');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(getDefaultCountry());
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  // Auto‑focus search when picker opens
  useEffect(() => {
    if (showCountryPicker) setTimeout(() => searchRef.current?.focus(), 100);
  }, [showCountryPicker]);

  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return countryCodes;
    const q = searchQuery.toLowerCase();
    return countryCodes.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.dialCode.includes(q)
    );
  }, [searchQuery]);

  // Build E.164 phone number
  const getE164Phone = () => {
    const digits = phone.replace(/\D/g, '');
    return `${selectedCountry.dialCode}${digits}`;
  };

  const sendOTP = async () => {
    const digits = phone.replace(/\D/g, '');
    if (!digits || digits.length < 4) {
      toast.error('Enter a valid phone number');
      return;
    }
    setLoading(true);
    try {
      const e164 = getE164Phone();
      console.log('[PhoneVerification] Sending OTP to:', e164);
      await OTPService.send(e164);
      setStep('verify');
      setResendTimer(60);
      toast.success('OTP sent successfully!');
    } catch (e: any) {
      console.error('[PhoneVerification] Send OTP error:', e);
      toast.error(`Failed to send OTP: ${e?.message || 'Unknown error'}`);
    }
    setLoading(false);
  };

  const handleOtpChange = async (value: string) => {
    setOtpValue(value);
    if (value.length === 6) {
      setLoading(true);
      try {
        const e164 = getE164Phone();
        const ok = await OTPService.verify(e164, value);
        if (ok) {
          // Update phone in Firebase profile
          try {
            const user = firebaseAuth.currentUser;
            if (user) {
              await setDoc(doc(db, 'user_profiles', user.uid), {
                phone: e164,
                updated_at: new Date().toISOString(),
              }, { merge: true });
            }
          } catch { /* best-effort profile update */ }
          // Update the parent profile phone field
          onPhoneVerified?.(e164);
          setStep('done');
          toast.success('Phone verified successfully!');
        } else {
          toast.error('Invalid code. Please try again.');
          setOtpValue('');
        }
      } catch (e: any) {
        console.error('[PhoneVerification] Verify error:', e);
        toast.error('Verification failed');
        setOtpValue('');
      }
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setOtpValue('');
    try {
      const e164 = getE164Phone();
      await OTPService.retry(e164);
      setResendTimer(60);
      toast.success('Code resent!');
    } catch (e: any) {
      toast.error(`Failed to resend: ${e?.message || 'Unknown error'}`);
    }
  };

  // Init MSG91 on mount
  useEffect(() => {
    OTPService.init().catch(console.error);
  }, []);

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 p-5 pb-3">
        <Smartphone className="w-5 h-5 text-emerald-500" />
        <h3 className="font-medium text-gray-900 text-sm">Phone Verification</h3>
        {step === 'done' && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Verified
          </span>
        )}
      </div>

      <div className="px-5 pb-5 space-y-4">
        {/* Phone Input Step */}
        {step === 'idle' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              {/* Country Selector Button */}
              <button
                type="button"
                onClick={() => setShowCountryPicker(true)}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm shrink-0"
              >
                <span className="text-lg leading-none">{selectedCountry.flag}</span>
                <span className="font-medium text-gray-700">{selectedCountry.dialCode}</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>

              {/* Phone Input */}
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  placeholder="Enter phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d\s\-()]/g, ''))}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm transition-all"
                />
              </div>
            </div>

            {/* Preview */}
            {phone.trim() && (
              <p className="text-xs text-gray-400 px-1">
                Will send to: <span className="font-mono text-gray-600">{getE164Phone()}</span>
              </p>
            )}

            <button
              onClick={sendOTP}
              disabled={loading || !phone.trim()}
              className="w-full px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Send OTP
            </button>
          </div>
        )}

        {/* OTP Verification Step */}
        {step === 'verify' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Enter the 6-digit code sent to{' '}
              <span className="font-medium text-gray-800">
                {selectedCountry.flag} {getE164Phone()}
              </span>
            </p>

            {/* OTP Input */}
            <div className="flex justify-center py-2">
              <InputOTP maxLength={6} value={otpValue} onChange={handleOtpChange} disabled={loading}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                </InputOTPGroup>
                <InputOTPSeparator className="mx-2 text-gray-300" />
                <InputOTPGroup>
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <p className="text-xs text-gray-400 text-center">
              {loading ? 'Verifying...' : 'Code auto-submits when all digits are entered'}
            </p>

            {/* Resend / Back */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => { setStep('idle'); setOtpValue(''); }}
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                ← Change number
              </button>
              {resendTimer > 0 ? (
                <span className="text-xs text-gray-400">
                  Resend in <span className="font-medium text-gray-600">{resendTimer}s</span>
                </span>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={loading}
                  className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors disabled:opacity-50"
                >
                  <RefreshCw className="w-3 h-3" />
                  Resend Code
                </button>
              )}
            </div>
          </div>
        )}

        {/* Done */}
        {step === 'done' && (
          <p className="text-sm text-emerald-600 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Phone number verified and linked to your account!
          </p>
        )}
      </div>

      {/* reCAPTCHA container - no longer needed with MSG91 */}

      {/* Country Picker Modal */}
      <AnimatePresence>
        {showCountryPicker && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowCountryPicker(false); setSearchQuery(''); }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 flex flex-col max-h-[80vh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Select Country</h3>
                <button
                  onClick={() => { setShowCountryPicker(false); setSearchQuery(''); }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Search */}
              <div className="p-4 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search country or dial code..."
                    className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none text-sm transition-all"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-2 px-1">
                  {filteredCountries.length} {filteredCountries.length === 1 ? 'country' : 'countries'} found
                </p>
              </div>

              {/* Country List */}
              <div className="flex-1 overflow-y-auto p-2">
                {filteredCountries.length === 0 ? (
                  <div className="text-center py-8 space-y-2">
                    <Globe className="w-8 h-8 text-gray-300 mx-auto" />
                    <p className="text-gray-500 text-sm">No countries found</p>
                    <p className="text-gray-400 text-xs">Try a different search term</p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {filteredCountries.map((country) => {
                      const isSelected = country.code === selectedCountry.code;
                      return (
                        <button
                          key={country.code}
                          onClick={() => {
                            setSelectedCountry(country);
                            setShowCountryPicker(false);
                            setSearchQuery('');
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                            isSelected
                              ? 'bg-emerald-50 border border-emerald-200'
                              : 'hover:bg-gray-50 border border-transparent'
                          }`}
                        >
                          <span className="text-2xl leading-none">{country.flag}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${isSelected ? 'text-emerald-700' : 'text-gray-900'}`}>
                              {country.name}
                            </p>
                            <p className="text-xs text-gray-400">{country.code}</p>
                          </div>
                          <span className={`text-sm font-mono font-medium ${isSelected ? 'text-emerald-600' : 'text-gray-400'}`}>
                            {country.dialCode}
                          </span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
