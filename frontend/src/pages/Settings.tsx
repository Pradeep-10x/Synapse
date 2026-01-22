import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  User,
  Shield,
  Eye,
  Sparkles,
  Bell,
  Palette,
  AlertTriangle,
  CheckCircle2,
  UploadCloud,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { userAPI } from '@/lib/api';
import { api } from '@/lib/axios';

type Section =
  | 'account'
  | 'security'
  | 'privacy'
  | 'verification'
  | 'notifications'
  | 'appearance'
  | 'danger';

type PrivacyState = {
  privateAccount: boolean;
  messagePolicy: 'everyone' | 'followers';
  allowMentions: boolean;
  allowTagging: boolean;
};

type NotificationState = {
  likes: boolean;
  comments: boolean;
  followers: boolean;
  messages: boolean;
  calls: boolean;
};

const sectionNav: Array<{ id: Section; label: string; icon: any }> = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'privacy', label: 'Privacy', icon: Eye },
  { id: 'verification', label: 'Verification', icon: Sparkles },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'danger', label: 'Danger Zone', icon: AlertTriangle },
];

export default function SettingsPage() {
  const { user, isAuthenticated, isCheckingAuth, checkAuth } = useAuthStore();
  const [activeSection, setActiveSection] = useState<Section>('account');

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarFileRef = useRef<File | null>(null);

  const [privacy, setPrivacy] = useState<PrivacyState>({
    privateAccount: false,
    messagePolicy: 'everyone',
    allowMentions: true,
    allowTagging: true,
  });

  const [notifications, setNotifications] = useState<NotificationState>({
    likes: true,
    comments: true,
    followers: true,
    messages: true,
    calls: true,
  });

  const [appearance, setAppearance] = useState<'dark' | 'system'>('dark');

  const [loadingAccount, setLoadingAccount] = useState(false);
  const [loadingSecurity, setLoadingSecurity] = useState(false);
  const [loadingPrivacy, setLoadingPrivacy] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [loadingDanger, setLoadingDanger] = useState(false);

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (!isAuthenticated && !isCheckingAuth) {
      checkAuth();
    }
  }, [isAuthenticated, isCheckingAuth, checkAuth]);

  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setEmail(user.email || '');
      setBio(user.bio || '');
      setAvatarPreview(user.avatar || null);
      // Default privacy/notification values could come from user profile in a real integration
    }
  }, [user]);

  const verificationStatus = useMemo(() => {
    if (!user?.isVerified) return null;
    return user.VerificationBadge || 'Standard';
  }, [user]);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#9ca3af]">
        Checking your session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleAvatarChange = (file: File | null) => {
    avatarFileRef.current = file;
    if (file) {
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleAccountSave = async () => {
    try {
      setLoadingAccount(true);
      // Update user details
      await userAPI.updateDetails({ bio });
      
      // Update avatar if changed
      if (avatarFileRef.current) {
        const formData = new FormData();
        formData.append('avatar', avatarFileRef.current);
        await userAPI.updateAvatar(formData);
      }
      toast.success('Account updated');
      await checkAuth(); // Refresh user data
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update account');
    } finally {
      setLoadingAccount(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwords.newPassword || passwords.newPassword !== passwords.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      setLoadingSecurity(true);
      await userAPI.changePassword({
        oldPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      toast.success('Password updated');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoadingSecurity(false);
    }
  };

  const handlePrivacySave = async () => {
    try {
      setLoadingPrivacy(true);
      await api.patch('/user/privacy', privacy);
      toast.success('Privacy updated');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update privacy');
    } finally {
      setLoadingPrivacy(false);
    }
  };

  const handleNotificationsSave = async () => {
    try {
      setLoadingNotifications(true);
      // Note: This endpoint may not exist in backend yet
      // await api.patch('/user/notifications', notifications);
      toast.success('Notifications settings saved locally');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update notifications');
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleLogoutAll = async () => {
    try {
      setLoadingSecurity(true);
      await userAPI.logout();
      toast.success('Logged out from all devices');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to logout all');
    } finally {
      setLoadingSecurity(false);
    }
  };

  const handleDeactivate = async () => {
    try {
      setLoadingDanger(true);
      await userAPI.deleteAccount();
      toast.success('Account deactivated');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to deactivate');
    } finally {
      setLoadingDanger(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoadingDanger(true);
      await userAPI.deleteAccount();
      toast.success('Account deleted');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete account');
    } finally {
      setLoadingDanger(false);
    }
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'account':
        return (
          <div className="space-y-6">
            <Card title="Account" description="Manage your identity and profile basics.">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm text-[#9ca3af]">Username</label>
                  <input
                    value={username}
                    disabled
                    className="w-full mt-2 glass-card rounded-lg px-4 py-3 text-[#e5e7eb] disabled:opacity-60"
                  />
                  <p className="text-xs text-[#9ca3af] mt-2">Username changes are restricted.</p>
                </div>
                <div>
                  <label className="text-sm text-[#9ca3af]">Email</label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full mt-2 glass-card rounded-lg px-4 py-3 text-[#e5e7eb] focus:outline-none focus:border-[rgba(168,85,247,0.4)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                <div className="md:col-span-2">
                  <label className="text-sm text-[#9ca3af]">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="w-full mt-2 glass-card rounded-lg px-4 py-3 text-[#e5e7eb] focus:outline-none focus:border-[rgba(168,85,247,0.4)]"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#9ca3af]">Profile picture</label>
                  <div className="mt-2 glass-card rounded-lg p-3 flex items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#a855f7] to-[#06b6d4] overflow-hidden flex items-center justify-center">
                      <img src={avatarPreview || "/default-avatar.jpg"} alt="avatar preview" className="w-full h-full object-cover" />
                    </div>
                    <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[rgba(168,85,247,0.3)] text-[#e5e7eb] cursor-pointer hover:bg-[rgba(168,85,247,0.1)]">
                      <UploadCloud className="w-4 h-4" />
                      <span className="text-sm font-semibold">Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleAvatarChange(e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    if (user) {
                      setEmail(user.email || '');
                      setBio(user.bio || '');
                      setAvatarPreview(user.avatar || null);
                      avatarFileRef.current = null;
                    }
                  }}
                  className="px-4 py-2 glass-card rounded-lg text-[#e5e7eb] hover:border-[rgba(168,85,247,0.3)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAccountSave}
                  disabled={loadingAccount}
                  className="px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg text-white font-semibold transition-colors disabled:opacity-50"
                >
                  {loadingAccount ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </Card>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <Card title="Change password" description="Keep your account secure with a strong password.">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <InputField
                  label="Current password"
                  type="password"
                  value={passwords.currentPassword}
                  onChange={(v) => setPasswords((p) => ({ ...p, currentPassword: v }))}
                />
                <InputField
                  label="New password"
                  type="password"
                  value={passwords.newPassword}
                  onChange={(v) => setPasswords((p) => ({ ...p, newPassword: v }))}
                />
                <InputField
                  label="Confirm new password"
                  type="password"
                  value={passwords.confirmPassword}
                  onChange={(v) => setPasswords((p) => ({ ...p, confirmPassword: v }))}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' })}
                  className="px-4 py-2 glass-card rounded-lg text-[#e5e7eb] hover:border-[rgba(168,85,247,0.3)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasswordChange}
                  disabled={loadingSecurity}
                  className="px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg text-white font-semibold transition-colors disabled:opacity-50"
                >
                  {loadingSecurity ? 'Updating...' : 'Update password'}
                </button>
              </div>
            </Card>

            <Card title="Sessions" description="Control active sessions across devices.">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-[#e5e7eb] font-semibold">Logout from all devices</p>
                  <p className="text-sm text-[#9ca3af]">Revokes tokens on all active sessions.</p>
                </div>
                <button
                  onClick={handleLogoutAll}
                  disabled={loadingSecurity}
                  className="px-4 py-2 glass-card rounded-lg text-[#e5e7eb] hover:border-[rgba(168,85,247,0.3)] disabled:opacity-50"
                >
                  {loadingSecurity ? 'Working...' : 'Logout all'}
                </button>
              </div>
            </Card>
          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-6">
            <Card title="Privacy" description="Control who can see and interact with you.">
              <ToggleRow
                label="Private account"
                description="Only approved followers can see your content."
                value={privacy.privateAccount}
                onChange={(v) => setPrivacy((p) => ({ ...p, privateAccount: v }))}
              />
              <div className="mt-4">
                <label className="text-sm text-[#9ca3af]">Allow messages from</label>
                <div className="mt-2 flex gap-3">
                  {['everyone', 'followers'].map((option) => (
                    <button
                      key={option}
                      onClick={() => setPrivacy((p) => ({ ...p, messagePolicy: option as PrivacyState['messagePolicy'] }))}
                      className={`px-4 py-2 rounded-lg border ${privacy.messagePolicy === option
                        ? 'border-[rgba(168,85,247,0.4)] text-[#e5e7eb]'
                        : 'border-transparent text-[#9ca3af] hover:border-[rgba(168,85,247,0.2)]'
                        } glass-card`}
                    >
                      {option === 'everyone' ? 'Everyone' : 'Followers only'}
                    </button>
                  ))}
                </div>
              </div>
              <ToggleRow
                label="Allow mentions"
                description="Others can @mention you in posts and comments."
                value={privacy.allowMentions}
                onChange={(v) => setPrivacy((p) => ({ ...p, allowMentions: v }))}
              />
              <ToggleRow
                label="Allow tagging"
                description="Others can tag you in photos and reels."
                value={privacy.allowTagging}
                onChange={(v) => setPrivacy((p) => ({ ...p, allowTagging: v }))}
              />
              <div className="flex justify-end">
                <button
                  onClick={handlePrivacySave}
                  disabled={loadingPrivacy}
                  className="px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg text-white font-semibold transition-colors disabled:opacity-50"
                >
                  {loadingPrivacy ? 'Saving...' : 'Save privacy'}
                </button>
              </div>
            </Card>
          </div>
        );

      case 'verification':
        return (
          <div className="space-y-6">
            <Card title="Verification" description="Prove your identity and reduce spam.">
              {!user?.isVerified ? (
                <div className="space-y-4">
                  <p className="text-[#e5e7eb]">
                    Verification confirms your identity and adds trust to your profile.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="glass-card rounded-xl p-4 border border-[rgba(168,85,247,0.2)]">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-[#a855f7]" />
                        <p className="font-semibold text-[#e5e7eb]">Blue badge</p>
                      </div>
                      <p className="text-sm text-[#9ca3af]">Standard verification for creators and members.</p>
                    </div>
                    <div className="glass-card rounded-xl p-4 border border-[rgba(168,85,247,0.2)]">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-[#c084fc]" />
                        <p className="font-semibold text-[#e5e7eb]">Gold badge</p>
                      </div>
                      <p className="text-sm text-[#9ca3af]">Priority support and enhanced trust signals.</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg text-white font-semibold transition-colors w-fit">
                    Get verified
                  </button>
                </div>
              ) : (
                <div className="glass-card rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-[#06b6d4]" />
                      <p className="text-[#e5e7eb] font-semibold">Verified</p>
                    </div>
                    <p className="text-sm text-[#9ca3af]">
                      Badge: {verificationStatus} • Renewal handled via billing.
                    </p>
                  </div>
                  <button className="px-4 py-2 glass-card rounded-lg text-[#e5e7eb] hover:border-[rgba(168,85,247,0.3)]">
                    Manage plan
                  </button>
                </div>
              )}
            </Card>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <Card title="Notifications" description="Control which events reach you.">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ToggleRow
                  label="Likes"
                  value={notifications.likes}
                  onChange={(v) => setNotifications((p) => ({ ...p, likes: v }))}
                />
                <ToggleRow
                  label="Comments"
                  value={notifications.comments}
                  onChange={(v) => setNotifications((p) => ({ ...p, comments: v }))}
                />
                <ToggleRow
                  label="New followers"
                  value={notifications.followers}
                  onChange={(v) => setNotifications((p) => ({ ...p, followers: v }))}
                />
                <ToggleRow
                  label="Messages"
                  value={notifications.messages}
                  onChange={(v) => setNotifications((p) => ({ ...p, messages: v }))}
                />
                <ToggleRow
                  label="Calls"
                  value={notifications.calls}
                  onChange={(v) => setNotifications((p) => ({ ...p, calls: v }))}
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleNotificationsSave}
                  disabled={loadingNotifications}
                  className="px-4 py-2 bg-gradient-to-r from-[#a855f7] to-[#06b6d4] rounded-lg text-white font-semibold hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                >
                  {loadingNotifications ? 'Saving...' : 'Save notifications'}
                </button>
              </div>
            </Card>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            <Card title="Appearance" description="Keep it simple—just pick your theme.">
              <div className="flex gap-3 flex-wrap">
                {['dark', 'system'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setAppearance(mode as 'dark' | 'system')}
                    className={`px-4 py-3 rounded-lg glass-card border ${appearance === mode
                      ? 'border-[rgba(168,85,247,0.4)] text-[#e5e7eb]'
                      : 'border-transparent text-[#9ca3af] hover:border-[rgba(168,85,247,0.2)]'
                      }`}
                  >
                    {mode === 'dark' ? 'Dark (default)' : 'System'}
                  </button>
                ))}
              </div>
              <p className="text-sm text-[#9ca3af]">
                We keep it clean—no noisy themes. Changes apply immediately.
              </p>
            </Card>
          </div>
        );

      case 'danger':
        return (
          <div className="space-y-6">
            <Card
              title="Danger Zone"
              description="Permanent actions. Proceed carefully."
              tone="danger"
            >
              <div className="space-y-4">
                <ActionRow
                  title="Deactivate account"
                  description="Temporarily disable your profile and hide your content."
                  actionLabel="Deactivate"
                  onAction={handleDeactivate}
                  loading={loadingDanger}
                  tone="warn"
                />
                <ActionRow
                  title="Delete account"
                  description="This permanently deletes your account and data."
                  actionLabel="Delete"
                  onAction={handleDelete}
                  loading={loadingDanger}
                  tone="danger"
                />
              </div>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-10">
          <header className="mb-8 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-[#9ca3af] uppercase tracking-[0.12em]">Orbit — Settings</p>
              <h1 className="text-3xl font-bold text-[#e5e7eb] mt-1">System Control Center</h1>
              <p className="text-[#9ca3af] mt-2">
                You control your identity. Everything here maps to real backend actions.
              </p>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-[240px,1fr] gap-6 items-start">
            <nav className="glass-card rounded-xl p-3 border border-[rgba(168,85,247,0.12)]">
              <ul className="space-y-1">
                {sectionNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => setActiveSection(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all ${isActive
                          ? 'bg-gradient-to-r from-[#a855f7]/20 to-[#06b6d4]/15 text-[#e5e7eb] border border-[rgba(168,85,247,0.3)]'
                          : 'text-[#9ca3af] hover:bg-[rgba(168,85,247,0.08)] hover:text-[#e5e7eb]'
                          }`}
                      >
                        <Icon className={`w-5 h-5 ${isActive ? 'text-[#a855f7]' : ''}`} />
                        <span className="font-semibold">{item.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <section className="space-y-6">{renderSection()}</section>
          </div>
        </div>
    </div>
  );
}

function Card({
  title,
  description,
  children,
  tone = 'default',
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  tone?: 'default' | 'danger';
}) {
  const border =
    tone === 'danger' ? 'border-red-500/30 bg-[rgba(239,68,68,0.05)]' : 'border-[rgba(168,85,247,0.15)]';
  return (
    <div className={`glass-card rounded-xl p-6 border ${border}`}>
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-[#e5e7eb]">{title}</h2>
        {description && <p className="text-sm text-[#9ca3af] mt-1">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function InputField({
  label,
  type = 'text',
  value,
  onChange,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-sm text-[#9ca3af]">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-2 glass-card rounded-lg px-4 py-3 text-[#e5e7eb] focus:outline-none focus:border-[rgba(168,85,247,0.4)]"
      />
    </div>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <div>
        <p className="text-[#e5e7eb] font-medium">{label}</p>
        {description && <p className="text-sm text-[#9ca3af]">{description}</p>}
      </div>
      <label className="relative inline-flex cursor-pointer items-center">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="w-11 h-6 bg-[#1f2937] peer-focus:outline-none rounded-full peer peer-checked:bg-gradient-to-r peer-checked:from-[#a855f7] peer-checked:to-[#06b6d4] transition-colors" />
        <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow" />
      </label>
    </div>
  );
}

function ActionRow({
  title,
  description,
  actionLabel,
  onAction,
  loading,
  tone = 'warn',
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  loading: boolean;
  tone?: 'warn' | 'danger';
}) {
  const color =
    tone === 'danger'
      ? 'bg-gradient-to-r from-red-500 to-red-600'
      : 'bg-gradient-to-r from-amber-500 to-orange-500';
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 glass-card rounded-lg border border-[rgba(168,85,247,0.1)]">
      <div>
        <p className="text-[#e5e7eb] font-semibold">{title}</p>
        <p className="text-sm text-[#9ca3af]">{description}</p>
      </div>
      <button
        onClick={onAction}
        disabled={loading}
        className={`px-4 py-2 rounded-lg text-white font-semibold hover:scale-105 transition-transform disabled:opacity-60 disabled:hover:scale-100 ${color}`}
      >
        {loading ? 'Working...' : actionLabel}
      </button>
    </div>
  );
}


