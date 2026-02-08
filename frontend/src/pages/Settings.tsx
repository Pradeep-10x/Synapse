import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  User,
  Shield,
  AlertTriangle,
  UploadCloud,
  LogOut,
  Trash2,
  Lock,
  Settings,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { userAPI } from '@/lib/api';
import { motion } from 'framer-motion';

type Section = 'account' | 'security' | 'danger';

const sectionNav: Array<{ id: Section; label: string; icon: any; description: string }> = [
  { id: 'account', label: 'Account', icon: User, description: 'Manage your profile' },
  { id: 'security', label: 'Security', icon: Shield, description: 'Password & sessions' },
  { id: 'danger', label: 'Danger Zone', icon: AlertTriangle, description: 'Critical actions' },
];

export default function SettingsPage() {
  const { user, isAuthenticated, isCheckingAuth, checkAuth } = useAuthStore();
  const [activeSection, setActiveSection] = useState<Section>('account');

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarFileRef = useRef<File | null>(null);

  const [loadingAccount, setLoadingAccount] = useState(false);
  const [loadingSecurity, setLoadingSecurity] = useState(false);
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
    }
  }, [user]);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--synapse-text-muted)]">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-[var(--synapse-blue)] border-t-transparent rounded-full animate-spin" />
          Checking your session...
        </div>
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
      await userAPI.updateDetails({ bio });

      if (avatarFileRef.current) {
        const formData = new FormData();
        formData.append('avatar', avatarFileRef.current);
        await userAPI.updateAvatar(formData);
      }
      toast.success('Account updated');
      await checkAuth();
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
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Profile Card */}
            <div className="rounded-lg border border-[var(--synapse-border)] bg-[var(--synapse-surface)]/50 overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--synapse-border)] bg-[var(--synapse-surface-hover)]/30">
                <h2 className="text-lg font-semibold text-[var(--synapse-text)]">Profile Information</h2>
                <p className="text-sm text-[var(--synapse-text-muted)]">Update your profile details</p>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <img 
                      src={avatarPreview || "/default-avatar.jpg"} 
                      alt="avatar" 
                      className="w-20 h-20 rounded-full object-cover border-2 border-[var(--synapse-border)]" 
                    />
                    <label className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[var(--synapse-blue)] flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity border-2 border-[var(--synapse-bg)]">
                      <UploadCloud className="w-3.5 h-3.5 text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleAvatarChange(e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                  <div>
                    <p className="font-medium text-[var(--synapse-text)]">{username}</p>
                    <p className="text-sm text-[var(--synapse-text-muted)]">Click the icon to update avatar</p>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-[var(--synapse-text-muted)] mb-2">Username</label>
                    <input
                      value={username}
                      disabled
                      className="w-full px-4 py-3 rounded-lg bg-[var(--synapse-surface-hover)]/50 border border-[var(--synapse-border)] text-[var(--synapse-text)] opacity-60 cursor-not-allowed"
                    />
                    <p className="text-xs text-[var(--synapse-text-muted)] mt-1.5">Username cannot be changed</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--synapse-text-muted)] mb-2">Email</label>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-[var(--synapse-surface-hover)]/50 border border-[var(--synapse-border)] text-[var(--synapse-text)] focus:outline-none focus:border-[var(--synapse-blue)] transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--synapse-text-muted)] mb-2">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    placeholder="Write a short bio about yourself..."
                    className="w-full px-4 py-3 rounded-lg bg-[var(--synapse-surface-hover)]/50 border border-[var(--synapse-border)] text-[var(--synapse-text)] placeholder:text-[var(--synapse-text-muted)] focus:outline-none focus:border-[var(--synapse-blue)] transition-colors resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => {
                      if (user) {
                        setEmail(user.email || '');
                        setBio(user.bio || '');
                        setAvatarPreview(user.avatar || null);
                        avatarFileRef.current = null;
                      }
                    }}
                    className="px-5 py-2.5 rounded-lg border border-[var(--synapse-border)] text-[var(--synapse-text)] hover:bg-[var(--synapse-surface-hover)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAccountSave}
                    disabled={loadingAccount}
                    className="px-5 py-2.5 rounded-lg bg-[var(--synapse-blue)] text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {loadingAccount ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 'security':
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Password Card */}
            <div className="rounded-lg border border-[var(--synapse-border)] bg-[var(--synapse-surface)]/50 overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--synapse-border)] bg-[var(--synapse-surface-hover)]/30 flex items-center gap-3">
                <Lock className="w-5 h-5 text-[var(--synapse-blue)]" />
                <div>
                  <h2 className="text-lg font-semibold text-[var(--synapse-text)]">Change Password</h2>
                  <p className="text-sm text-[var(--synapse-text-muted)]">Keep your account secure</p>
                </div>
              </div>
              
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--synapse-text-muted)] mb-2">Current Password</label>
                    <input
                      type="password"
                      value={passwords.currentPassword}
                      onChange={(e) => setPasswords(p => ({ ...p, currentPassword: e.target.value }))}
                      className="w-full px-4 py-3 rounded-lg bg-[var(--synapse-surface-hover)]/50 border border-[var(--synapse-border)] text-[var(--synapse-text)] focus:outline-none focus:border-[var(--synapse-blue)] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--synapse-text-muted)] mb-2">New Password</label>
                    <input
                      type="password"
                      value={passwords.newPassword}
                      onChange={(e) => setPasswords(p => ({ ...p, newPassword: e.target.value }))}
                      className="w-full px-4 py-3 rounded-lg bg-[var(--synapse-surface-hover)]/50 border border-[var(--synapse-border)] text-[var(--synapse-text)] focus:outline-none focus:border-[var(--synapse-blue)] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--synapse-text-muted)] mb-2">Confirm Password</label>
                    <input
                      type="password"
                      value={passwords.confirmPassword}
                      onChange={(e) => setPasswords(p => ({ ...p, confirmPassword: e.target.value }))}
                      className="w-full px-4 py-3 rounded-lg bg-[var(--synapse-surface-hover)]/50 border border-[var(--synapse-border)] text-[var(--synapse-text)] focus:outline-none focus:border-[var(--synapse-blue)] transition-colors"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' })}
                    className="px-5 py-2.5 rounded-lg border border-[var(--synapse-border)] text-[var(--synapse-text)] hover:bg-[var(--synapse-surface-hover)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePasswordChange}
                    disabled={loadingSecurity}
                    className="px-5 py-2.5 rounded-lg bg-[var(--synapse-blue)] text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {loadingSecurity ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </div>
            </div>

            {/* Sessions Card */}
            <div className="rounded-lg border border-[var(--synapse-border)] bg-[var(--synapse-surface)]/50 overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--synapse-border)] bg-[var(--synapse-surface-hover)]/30 flex items-center gap-3">
                <LogOut className="w-5 h-5 text-[var(--synapse-blue)]" />
                <div>
                  <h2 className="text-lg font-semibold text-[var(--synapse-text)]">Active Sessions</h2>
                  <p className="text-sm text-[var(--synapse-text-muted)]">Manage your logged-in devices</p>
                </div>
              </div>
              
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-[var(--synapse-text)]">Logout from all devices</p>
                    <p className="text-sm text-[var(--synapse-text-muted)]">This will sign you out from all active sessions</p>
                  </div>
                  <button
                    onClick={handleLogoutAll}
                    disabled={loadingSecurity}
                    className="px-5 py-2.5 rounded-lg border border-[var(--synapse-border)] text-[var(--synapse-text)] hover:bg-[var(--synapse-surface-hover)] transition-colors disabled:opacity-50"
                  >
                    {loadingSecurity ? 'Working...' : 'Logout All'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 'danger':
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 overflow-hidden">
              <div className="px-6 py-4 border-b border-red-500/30 bg-red-500/10 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <div>
                  <h2 className="text-lg font-semibold text-[var(--synapse-text)]">Danger Zone</h2>
                  <p className="text-sm text-[var(--synapse-text-muted)]">Irreversible actions</p>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                {/* Deactivate */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg border border-[var(--synapse-border)] bg-[var(--synapse-surface)]/30">
                  <div>
                    <p className="font-medium text-[var(--synapse-text)]">Deactivate Account</p>
                    <p className="text-sm text-[var(--synapse-text-muted)]">Temporarily disable your profile and hide content</p>
                  </div>
                  <button
                    onClick={handleDeactivate}
                    disabled={loadingDanger}
                    className="px-5 py-2.5 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 transition-colors disabled:opacity-50"
                  >
                    {loadingDanger ? 'Working...' : 'Deactivate'}
                  </button>
                </div>

                {/* Delete */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg border border-red-500/30 bg-red-500/5">
                  <div>
                    <p className="font-medium text-[var(--synapse-text)]">Delete Account</p>
                    <p className="text-sm text-[var(--synapse-text-muted)]">Permanently delete your account and all data</p>
                  </div>
                  <button
                    onClick={handleDelete}
                    disabled={loadingDanger}
                    className="px-5 py-2.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    {loadingDanger ? 'Working...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--synapse-bg)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-7 h-7 text-[var(--synapse-blue)]" />
            <h1 className="text-2xl font-bold text-[var(--synapse-text)]">Settings</h1>
          </div>
          <p className="text-[var(--synapse-text-muted)]">
            Manage your account settings and preferences
          </p>
        </header>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[220px,1fr] gap-6">
          {/* Navigation Sidebar */}
          <nav className="rounded-lg border border-[var(--synapse-border)] bg-[var(--synapse-surface)]/50 p-3 h-fit">
            <ul className="space-y-1">
              {sectionNav.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                const isDanger = item.id === 'danger';
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => setActiveSection(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                        isActive
                          ? isDanger
                            ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                            : 'bg-[var(--synapse-surface-hover)] text-[var(--synapse-text)] border border-[var(--synapse-border)]'
                          : 'text-[var(--synapse-text-muted)] hover:bg-[var(--synapse-surface-hover)] border border-transparent'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? (isDanger ? 'text-red-400' : 'text-[var(--synapse-blue)]') : ''}`} />
                      <div>
                        <span className="font-medium block">{item.label}</span>
                        <span className="text-xs opacity-70">{item.description}</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Content Area */}
          <section>{renderSection()}</section>
        </div>
      </div>
    </div>
  );
}
