import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  User,
  Shield,
  AlertTriangle,
  Upload,
  Settings,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { userAPI } from '@/lib/api';

type Tab = 'profile' | 'security' | 'danger';

export default function SettingsPage() {
  const { user, isAuthenticated, isCheckingAuth, checkAuth } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  const [bio, setBio] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarRef = useRef<File | null>(null);

  const [passwords, setPasswords] = useState({
    current: '',
    next: '',
    confirm: '',
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated && !isCheckingAuth) checkAuth();
  }, [isAuthenticated, isCheckingAuth]);

  useEffect(() => {
    if (user) {
      setBio(user.bio || '');
      setAvatarPreview(user.avatar || null);
    }
  }, [user]);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen grid place-items-center text-zinc-400">
        Checking session…
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  /* -------------------------------- handlers -------------------------------- */

  const saveProfile = async () => {
    try {
      setLoading(true);
      await userAPI.updateDetails({ bio });

      if (avatarRef.current) {
        const fd = new FormData();
        fd.append('avatar', avatarRef.current);
        await userAPI.updateAvatar(fd);
      }

      toast.success('Profile updated');
      await checkAuth();
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async () => {
    if (passwords.next !== passwords.confirm) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      await userAPI.changePassword({
        oldPassword: passwords.current,
        newPassword: passwords.next,
      });
      toast.success('Password updated');
      setPasswords({ current: '', next: '', confirm: '' });
    } catch {
      toast.error('Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------------- UI ---------------------------------- */

  return (
    <div className="min-h-screen bg-gray text-zinc-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Header */}
        <header className="flex items-center gap-3 mb-5">
          <Settings className="w-6 h-6 text-white-500" />
          <h1 className="text-3xl font-semibold">Account Settings</h1>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-[240px,1fr] gap-6 sm:gap-10">
          {/* Sidebar — horizontal scroll on mobile */}
          <aside className="bg-[#17171A] rounded-md p-2 h-fit border border-zinc-800 flex sm:flex-col gap-1 overflow-x-auto scrollbar-hide">
            {[
              { id: 'profile', label: 'My Profile', icon: User },
              { id: 'security', label: 'Security', icon: Shield },
              { id: 'danger', label: 'Danger', icon: AlertTriangle },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as Tab)}
                className={`flex items-center gap-3 px-4 py-3 rounded-md text-md font-medium transition whitespace-nowrap
                  ${
                    activeTab === id
                      ? 'bg-gray-700/50 text-white'
                      : 'text-zinc-400 hover:bg-gray-700/10'
                  }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </aside>

          {/* Content */}
          <motion.main
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {/* --------------------------- PROFILE --------------------------- */}
            {activeTab === 'profile' && (
              <>
                {/* Profile header */}
                <div className="flex items-center gap-4 sm:gap-5 mb-6 sm:mb-8">
                  <div className="relative">
                    <img
                      src={avatarPreview || '/default-avatar.jpg'}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <label className="absolute -bottom-1 -right-1 bg-black p-1.5 rounded-full cursor-pointer">
                      <Upload className="w-3 h-3" />
                      <input
                        type="file"
                        hidden
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            avatarRef.current = f;
                            setAvatarPreview(URL.createObjectURL(f));
                          }
                        }}
                      />
                    </label>
                  </div>

                  <div>
                    <h2 className="font-semibold">{user?.fullName}</h2>
                    <p className="text-sm text-zinc-400">{user?.username}</p>
                  </div>
                </div>

                {/* Personal Info */}
                <section className="bg-[#17171A]/50 rounded-md p-4 sm:p-6 mb-6">
                  <h3 className="font-medium mb-4">Personal Information</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <Field label="Full Name" value={user?.fullName}  />
                    <Field label="Username" value={user?.username}  />
                  </div>

                  <div className="mt-6">
                    <label className="text-sm text-zinc-400">About</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                      className="mt-2 w-full rounded-lg border border-zinc-800 bg-[#17171A] p-3 outline-none"
                    />
                  </div>

                  <div className="flex justify-end mt-6">
                    <button
                      onClick={saveProfile}
                      disabled={loading}
                      className="px-5 py-2 bg-blue-800 rounded-md text-sm hover:bg-blue-700"
                    >
                      Save Changes
                    </button>
                  </div>
                </section>
              </>
            )}

            {/* --------------------------- SECURITY --------------------------- */}
            {activeTab === 'security' && (
              <section className="bg-[#17171A]/50 rounded-md p-4 sm:p-6">
                <h3 className="font-semibold mb-6">Change Password</h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
                  <PasswordField
                    label="Current"
                    value={passwords.current}
                    onChange={(v) => setPasswords(p => ({ ...p, current: v }))}
                  />
                  <PasswordField
                    label="New"
                    value={passwords.next}
                    onChange={(v) => setPasswords(p => ({ ...p, next: v }))}
                  />
                  <PasswordField
                    label="Confirm"
                    value={passwords.confirm}
                    onChange={(v) => setPasswords(p => ({ ...p, confirm: v }))}
                  />
                </div>

                <div className="flex justify-end mt-6">
                  <button
                    onClick={changePassword}
                    className="px-5 py-2 bg-blue-800 rounded-md text-sm hover:bg-blue-700"
                  >
                    Update Password
                  </button>
                </div>
              </section>
            )}

            {/* --------------------------- DANGER --------------------------- */}
            {activeTab === 'danger' && (
              <section className="bg-red-500/5 border border-red-500/20 rounded-md p-6">
                <h3 className="font-semibold text-red-400 mb-2">
                  Delete Account
                </h3>
                <p className="text-sm text-zinc-400 mb-6">
                  This action is irreversible.
                </p>
                <button className="px-5 py-2 bg-red-600 rounded-md text-sm">
                  Delete Account
                </button>
              </section>
            )}
          </motion.main>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- helpers ------------------------------- */

function Field({
  label,
  value,
  disabled,
}: {
  label: string;
  value?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="text-sm text-zinc-400">{label}</label>
      <input
        disabled={disabled}
        value={value || ''}
        className="mt-2 w-full rounded-md bg-[#17171A] border border-zinc-800 p-3 opacity-70"
      />
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-sm text-zinc-400">{label}</label>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-md bg-[#17171A] border border-zinc-800 p-3"
      />
    </div>
  );
}
