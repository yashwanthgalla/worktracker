import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Lock,
  MapPin,
  Phone,
  Globe,
  Bell,
  Palette,
  Shield,
  Save,
  Camera,
  Check,
  Loader2,
  ChevronRight,
  Building2,
  CreditCard,
  Clock,
  Languages,
  AtSign,
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { supabase } from '../../lib/supabase';
import { AuthService } from '../../services/authService';
import toast from 'react-hot-toast';

// ─── Types ───
interface UserProfileData {
  full_name: string;
  username: string;
  email: string;
  phone: string;
  bio: string;
  avatar_url: string;
  // Address
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  // Preferences
  timezone: string;
  language: string;
  date_format: string;
  // Notifications
  email_notifications: boolean;
  push_notifications: boolean;
  task_reminders: boolean;
  weekly_summary: boolean;
  friend_requests: boolean;
  message_notifications: boolean;
}

const defaultProfile: UserProfileData = {
  full_name: '',
  username: '',
  email: '',
  phone: '',
  bio: '',
  avatar_url: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  zip_code: '',
  country: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  language: 'en',
  date_format: 'MM/DD/YYYY',
  email_notifications: true,
  push_notifications: true,
  task_reminders: true,
  weekly_summary: true,
  friend_requests: true,
  message_notifications: true,
};

type Section = 'profile' | 'address' | 'preferences' | 'notifications' | 'security';

const sections: { id: Section; label: string; icon: typeof User; description: string }[] = [
  { id: 'profile', label: 'Profile', icon: User, description: 'Name, email, phone, and bio' },
  { id: 'address', label: 'Address', icon: MapPin, description: 'Mailing and billing address' },
  { id: 'preferences', label: 'Preferences', icon: Palette, description: 'Theme, language, and display' },
  { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Email, push, and reminders' },
  { id: 'security', label: 'Security', icon: Shield, description: 'Password and account safety' },
];

export const SettingsPage = () => {
  const user = useAppStore((s) => s.user);
  const { theme, toggleTheme } = useAppStore();
  const [activeSection, setActiveSection] = useState<Section>('profile');
  const [profile, setProfile] = useState<UserProfileData>(defaultProfile);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Password change
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [changingPassword, setChangingPassword] = useState(false);

  // Load profile from Supabase user_profiles + auth metadata
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      // Get profile from user_profiles table
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // Get settings from a separate settings store (or user_metadata)
      const metadata = user.user_metadata || {};

      setProfile({
        full_name: data?.full_name || metadata.full_name || '',
        username: data?.username || metadata.username || '',
        email: user.email || '',
        phone: metadata.phone || '',
        bio: metadata.bio || '',
        avatar_url: data?.avatar_url || metadata.avatar_url || '',
        address_line1: metadata.address_line1 || '',
        address_line2: metadata.address_line2 || '',
        city: metadata.city || '',
        state: metadata.state || '',
        zip_code: metadata.zip_code || '',
        country: metadata.country || '',
        timezone: metadata.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: metadata.language || 'en',
        date_format: metadata.date_format || 'MM/DD/YYYY',
        email_notifications: metadata.email_notifications ?? true,
        push_notifications: metadata.push_notifications ?? true,
        task_reminders: metadata.task_reminders ?? true,
        weekly_summary: metadata.weekly_summary ?? true,
        friend_requests: metadata.friend_requests ?? true,
        message_notifications: metadata.message_notifications ?? true,
      });
    };
    loadProfile();
  }, [user]);

  const updateField = useCallback((field: keyof UserProfileData, value: string | boolean) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }, []);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      // Update auth user metadata (stores address, preferences, etc.)
      await AuthService.updateProfile({
        full_name: profile.full_name,
        username: profile.username,
        avatar_url: profile.avatar_url,
        phone: profile.phone,
        bio: profile.bio,
        address_line1: profile.address_line1,
        address_line2: profile.address_line2,
        city: profile.city,
        state: profile.state,
        zip_code: profile.zip_code,
        country: profile.country,
        timezone: profile.timezone,
        language: profile.language,
        date_format: profile.date_format,
        email_notifications: profile.email_notifications,
        push_notifications: profile.push_notifications,
        task_reminders: profile.task_reminders,
        weekly_summary: profile.weekly_summary,
        friend_requests: profile.friend_requests,
        message_notifications: profile.message_notifications,
      } as Record<string, unknown>);

      // Also update user_profiles table
      await supabase
        .from('user_profiles')
        .update({
          full_name: profile.full_name,
          username: profile.username || null,
          avatar_url: profile.avatar_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      setSaved(true);
      toast.success('Settings saved successfully');
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwords.new !== passwords.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwords.new.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setChangingPassword(true);
    try {
      await AuthService.updatePassword(passwords.new);
      toast.success('Password updated successfully');
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update password';
      toast.error(message);
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[1.75rem] font-semibold tracking-tight text-text-primary mb-1">
          Settings
        </h1>
        <p className="text-[0.9375rem] text-text-tertiary">
          Manage your account, preferences, and privacy
        </p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <div className="w-56 shrink-0">
          <nav className="space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-text-secondary hover:bg-black/3 hover:text-text-primary'
                  }`}
                >
                  <Icon className="w-4.5 h-4.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-[0.8125rem] font-medium ${isActive ? 'text-primary-600' : ''}`}>
                      {section.label}
                    </p>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-primary-400" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {activeSection === 'profile' && (
              <ProfileSection profile={profile} updateField={updateField} />
            )}
            {activeSection === 'address' && (
              <AddressSection profile={profile} updateField={updateField} />
            )}
            {activeSection === 'preferences' && (
              <PreferencesSection
                profile={profile}
                updateField={updateField}
                theme={theme}
                toggleTheme={toggleTheme}
              />
            )}
            {activeSection === 'notifications' && (
              <NotificationsSection profile={profile} updateField={updateField} />
            )}
            {activeSection === 'security' && (
              <SecuritySection
                passwords={passwords}
                setPasswords={setPasswords}
                changingPassword={changingPassword}
                onChangePassword={handlePasswordChange}
                userEmail={user?.email || ''}
              />
            )}

            {/* Save Button (shown for all except security which has its own) */}
            {activeSection !== 'security' && (
              <div className="mt-8 flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary flex items-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : saved ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {saving ? 'Saving...' : saved ? 'Saved' : 'Save Changes'}
                </motion.button>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════
// Section Components
// ═══════════════════════════════════════════

interface SectionProps {
  profile: UserProfileData;
  updateField: (field: keyof UserProfileData, value: string | boolean) => void;
}

function SectionCard({ title, description, children }: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-card p-6 mb-5">
      <h2 className="text-[1.0625rem] font-semibold text-text-primary mb-0.5">{title}</h2>
      {description && (
        <p className="text-[0.8125rem] text-text-tertiary mb-5">{description}</p>
      )}
      {!description && <div className="mb-5" />}
      {children}
    </div>
  );
}

function InputField({ label, icon: Icon, value, onChange, type = 'text', placeholder, disabled = false }: {
  label: string;
  icon: typeof User;
  value: string;
  onChange: (val: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-[0.8125rem] font-medium text-text-primary mb-1.5">
        {label}
      </label>
      <div className="relative">
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="input-field pl-10 disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>
    </div>
  );
}

function ToggleSwitch({ enabled, onChange, label, description }: {
  enabled: boolean;
  onChange: (val: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-[0.875rem] font-medium text-text-primary">{label}</p>
        {description && (
          <p className="text-[0.75rem] text-text-tertiary mt-0.5">{description}</p>
        )}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
          enabled ? 'bg-primary-500' : 'bg-gray-300'
        }`}
      >
        <motion.div
          animate={{ x: enabled ? 20 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
        />
      </button>
    </div>
  );
}

// ─── Profile Section ───
function ProfileSection({ profile, updateField }: SectionProps) {
  return (
    <>
      <SectionCard title="Personal Information" description="Your public profile details visible to others">
        {/* Avatar */}
        <div className="flex items-center gap-5 mb-6">
          <div className="relative group">
            <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-primary-400 via-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-primary-200/40">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full rounded-2xl object-cover" />
              ) : (
                <span className="text-white text-2xl font-bold">
                  {(profile.full_name || profile.email)[0]?.toUpperCase() || 'U'}
                </span>
              )}
            </div>
            <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
              <Camera className="w-5 h-5 text-white" />
            </div>
          </div>
          <div>
            <h3 className="text-[0.9375rem] font-semibold text-text-primary">
              {profile.full_name || 'Your Name'}
            </h3>
            <p className="text-[0.8125rem] text-text-tertiary">{profile.username ? `@${profile.username}` : profile.email}</p>
            <p className="text-[0.75rem] text-text-tertiary mt-1">
              Click avatar to change photo
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="Full Name"
            icon={User}
            value={profile.full_name}
            onChange={(v) => updateField('full_name', v)}
            placeholder="John Doe"
          />
          <InputField
            label="Username"
            icon={AtSign}
            value={profile.username}
            onChange={(v) => updateField('username', v.toLowerCase().replace(/[^a-z0-9._]/g, ''))}
            placeholder="johndoe"
          />
          <InputField
            label="Email"
            icon={Mail}
            value={profile.email}
            onChange={() => {}}
            disabled
            placeholder="you@example.com"
          />
          <InputField
            label="Phone Number"
            icon={Phone}
            value={profile.phone}
            onChange={(v) => updateField('phone', v)}
            placeholder="+1 (555) 123-4567"
          />
          <InputField
            label="Website"
            icon={Globe}
            value={profile.avatar_url}
            onChange={(v) => updateField('avatar_url', v)}
            placeholder="https://yoursite.com"
          />
        </div>

        <div className="mt-4">
          <label className="block text-[0.8125rem] font-medium text-text-primary mb-1.5">
            Bio
          </label>
          <textarea
            value={profile.bio}
            onChange={(e) => updateField('bio', e.target.value)}
            placeholder="Tell us a bit about yourself..."
            rows={3}
            className="input-field resize-none"
          />
        </div>
      </SectionCard>
    </>
  );
}

// ─── Address Section ───
function AddressSection({ profile, updateField }: SectionProps) {
  return (
    <>
      <SectionCard title="Mailing Address" description="Used for billing and physical mail">
        <div className="space-y-4">
          <InputField
            label="Address Line 1"
            icon={MapPin}
            value={profile.address_line1}
            onChange={(v) => updateField('address_line1', v)}
            placeholder="123 Main Street"
          />
          <InputField
            label="Address Line 2"
            icon={Building2}
            value={profile.address_line2}
            onChange={(v) => updateField('address_line2', v)}
            placeholder="Apt 4B, Suite 200, etc."
          />
          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="City"
              icon={MapPin}
              value={profile.city}
              onChange={(v) => updateField('city', v)}
              placeholder="New York"
            />
            <InputField
              label="State / Province"
              icon={MapPin}
              value={profile.state}
              onChange={(v) => updateField('state', v)}
              placeholder="NY"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="ZIP / Postal Code"
              icon={CreditCard}
              value={profile.zip_code}
              onChange={(v) => updateField('zip_code', v)}
              placeholder="10001"
            />
            <InputField
              label="Country"
              icon={Globe}
              value={profile.country}
              onChange={(v) => updateField('country', v)}
              placeholder="United States"
            />
          </div>
        </div>
      </SectionCard>
    </>
  );
}

// ─── Preferences Section ───
function PreferencesSection({ profile, updateField, theme, toggleTheme }: SectionProps & {
  theme: string;
  toggleTheme: () => void;
}) {
  return (
    <>
      <SectionCard title="Appearance" description="Customize the look and feel">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Palette className="w-4.5 h-4.5 text-text-tertiary" />
            <div>
              <p className="text-[0.875rem] font-medium text-text-primary">Theme</p>
              <p className="text-[0.75rem] text-text-tertiary mt-0.5">
                Currently using {theme === 'dark' ? 'dark' : 'light'} mode
              </p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="px-4 py-2 text-[0.8125rem] font-medium rounded-xl bg-black/4 hover:bg-black/6 text-text-primary transition-colors"
          >
            Switch to {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Regional Settings" description="Language, timezone, and date formatting">
        <div className="space-y-4">
          <div>
            <label className="block text-[0.8125rem] font-medium text-text-primary mb-1.5">
              Timezone
            </label>
            <div className="relative">
              <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <select
                value={profile.timezone}
                onChange={(e) => updateField('timezone', e.target.value)}
                className="input-field pl-10 appearance-none cursor-pointer"
              >
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="America/Anchorage">Alaska Time (AKT)</option>
                <option value="Pacific/Honolulu">Hawaii Time (HT)</option>
                <option value="Europe/London">GMT / London</option>
                <option value="Europe/Paris">Central European (CET)</option>
                <option value="Europe/Helsinki">Eastern European (EET)</option>
                <option value="Asia/Dubai">Gulf Standard (GST)</option>
                <option value="Asia/Kolkata">India Standard (IST)</option>
                <option value="Asia/Shanghai">China Standard (CST)</option>
                <option value="Asia/Tokyo">Japan Standard (JST)</option>
                <option value="Australia/Sydney">Australian Eastern (AEST)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[0.8125rem] font-medium text-text-primary mb-1.5">
              Language
            </label>
            <div className="relative">
              <Languages className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <select
                value={profile.language}
                onChange={(e) => updateField('language', e.target.value)}
                className="input-field pl-10 appearance-none cursor-pointer"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="ja">日本語</option>
                <option value="zh">中文</option>
                <option value="ko">한국어</option>
                <option value="pt">Português</option>
                <option value="hi">हिन्दी</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[0.8125rem] font-medium text-text-primary mb-1.5">
              Date Format
            </label>
            <div className="relative">
              <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <select
                value={profile.date_format}
                onChange={(e) => updateField('date_format', e.target.value)}
                className="input-field pl-10 appearance-none cursor-pointer"
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                <option value="DD.MM.YYYY">DD.MM.YYYY</option>
              </select>
            </div>
          </div>
        </div>
      </SectionCard>
    </>
  );
}

// ─── Notifications Section ───
function NotificationsSection({ profile, updateField }: SectionProps) {
  return (
    <>
      <SectionCard title="Email Notifications" description="Control which emails you receive">
        <div className="divide-y divide-black/4">
          <ToggleSwitch
            enabled={profile.email_notifications}
            onChange={(v) => updateField('email_notifications', v)}
            label="Email Notifications"
            description="Receive email updates about your tasks and activity"
          />
          <ToggleSwitch
            enabled={profile.weekly_summary}
            onChange={(v) => updateField('weekly_summary', v)}
            label="Weekly Summary"
            description="Get a weekly recap of your productivity and tasks"
          />
        </div>
      </SectionCard>

      <SectionCard title="Push Notifications" description="Alerts shown in your browser or device">
        <div className="divide-y divide-black/4">
          <ToggleSwitch
            enabled={profile.push_notifications}
            onChange={(v) => updateField('push_notifications', v)}
            label="Push Notifications"
            description="Show desktop or mobile push notifications"
          />
          <ToggleSwitch
            enabled={profile.task_reminders}
            onChange={(v) => updateField('task_reminders', v)}
            label="Task Reminders"
            description="Remind you before tasks are due"
          />
          <ToggleSwitch
            enabled={profile.friend_requests}
            onChange={(v) => updateField('friend_requests', v)}
            label="Friend Requests"
            description="Notify when someone sends you a friend request"
          />
          <ToggleSwitch
            enabled={profile.message_notifications}
            onChange={(v) => updateField('message_notifications', v)}
            label="Messages"
            description="Notify when you receive a new message"
          />
        </div>
      </SectionCard>
    </>
  );
}

// ─── Security Section ───
function SecuritySection({ passwords, setPasswords, changingPassword, onChangePassword, userEmail }: {
  passwords: { current: string; new: string; confirm: string };
  setPasswords: (p: { current: string; new: string; confirm: string }) => void;
  changingPassword: boolean;
  onChangePassword: () => void;
  userEmail: string;
}) {
  return (
    <>
      <SectionCard title="Change Password" description="Update your account password">
        <div className="space-y-4 max-w-md">
          <InputField
            label="Current Password"
            icon={Lock}
            value={passwords.current}
            onChange={(v) => setPasswords({ ...passwords, current: v })}
            type="password"
            placeholder="Enter current password"
          />
          <InputField
            label="New Password"
            icon={Lock}
            value={passwords.new}
            onChange={(v) => setPasswords({ ...passwords, new: v })}
            type="password"
            placeholder="At least 6 characters"
          />
          <InputField
            label="Confirm New Password"
            icon={Lock}
            value={passwords.confirm}
            onChange={(v) => setPasswords({ ...passwords, confirm: v })}
            type="password"
            placeholder="Re-enter new password"
          />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onChangePassword}
            disabled={changingPassword || !passwords.new || !passwords.confirm}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {changingPassword ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
            {changingPassword ? 'Updating...' : 'Update Password'}
          </motion.button>
        </div>
      </SectionCard>

      <SectionCard title="Account" description="Manage your account settings">
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Mail className="w-4.5 h-4.5 text-text-tertiary" />
              <div>
                <p className="text-[0.875rem] font-medium text-text-primary">Email Address</p>
                <p className="text-[0.75rem] text-text-tertiary">{userEmail}</p>
              </div>
            </div>
            <span className="text-[0.75rem] text-primary-600 font-medium bg-primary-50 px-2.5 py-1 rounded-lg">
              Verified
            </span>
          </div>

          <div className="pt-4 border-t border-black/4">
            <h4 className="text-[0.875rem] font-medium text-red-600 mb-1">Danger Zone</h4>
            <p className="text-[0.75rem] text-text-tertiary mb-3">
              Once you delete your account, there is no going back.
            </p>
            <button className="px-4 py-2 text-[0.8125rem] font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors">
              Delete Account
            </button>
          </div>
        </div>
      </SectionCard>
    </>
  );
}
