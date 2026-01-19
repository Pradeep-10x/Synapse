import { useState, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { User, Bell, Lock, Shield, LogOut, ChevronRight, Camera, ArrowLeft } from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/axios';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function SettingsPage() {
    const { user, logout, checkAuth } = useAuthStore();
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        fullName: user?.fullName || '',
        bio: user?.bio || '',
        email: user?.email || '',
    });
    const [passwordData, setPasswordData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [loading, setLoading] = useState(false);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const sections = [
        { id: 'profile', label: 'Edit Profile', icon: User, desc: 'Update your profile information' },
        { id: 'notifications', label: 'Notifications', icon: Bell, desc: 'Manage your notification preferences' },
        { id: 'privacy', label: 'Privacy & Security', icon: Lock, desc: 'Control your privacy settings' },
        { id: 'account', label: 'Account', icon: Shield, desc: 'Account visibility and settings' },
    ];

    const handleUpdateProfile = async () => {
        try {
            setLoading(true);

            // Update avatar if changed
            if (avatarFile) {
                const avatarFormData = new FormData();
                avatarFormData.append('avatar', avatarFile);
                await api.patch('/user/update-avatar', avatarFormData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            }

            // Update user details
            await api.put('/user/update-details', formData);

            await checkAuth(); // Refresh user data
            toast.success('Profile updated successfully');
            setAvatarFile(null);
            setAvatarPreview(null);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async () => {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        if (passwordData.newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        try {
            setLoading(true);
            await api.post('/user/change-password', {
                oldPassword: passwordData.oldPassword,
                newPassword: passwordData.newPassword,
            });
            toast.success('Password changed successfully');
            setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!confirm('Are you absolutely sure? This action cannot be undone!')) return;
        if (!confirm('This will permanently delete your account and all your data. Continue?')) return;
        try {
            setLoading(true);
            await api.post('/user/delete');
            toast.success('Account deleted successfully');
            logout();
            navigate('/login');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete account');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="pb-20 md:pb-0 max-w-4xl mx-auto px-4 md:px-6">
            <AnimatePresence mode="wait">
                {activeSection === null ? (
                    // Settings Menu View
                    <motion.div
                        key="menu"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                    >
                        <h1 className="text-4xl font-bold text-gray-900 mb-6 font-heading">Settings</h1>

                        {/* User Profile Card */}
                        <div className="glass-panel p-6 md:p-8 rounded-2xl md:rounded-3xl">
                            <div className="flex items-center gap-4 md:gap-6">
                                <div className="relative">
                                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-2 md:border-4 border-white shadow-lg">
                                        <img
                                            src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.username || 'User'}`}
                                            alt="Avatar"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl md:text-2xl font-bold text-gray-900">{user?.fullName || user?.username}</h3>
                                    <p className="text-base text-gray-500">@{user?.username}</p>
                                    <p className="text-sm md:text-base text-gray-400 mt-1">{user?.bio || 'No bio yet'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Settings Options */}
                        <div className="space-y-3">
                            {sections.map((section) => {
                                const Icon = section.icon;
                                return (
                                    <button
                                        key={section.id}
                                        onClick={() => setActiveSection(section.id)}
                                        className="w-full glass-panel p-4 md:p-5 rounded-2xl hover:bg-white/80 transition-all group text-left"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2.5 bg-black/5 group-hover:bg-black/10 rounded-xl transition-colors">
                                                    <Icon size={20} className="text-gray-700" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-900 text-base md:text-lg">{section.label}</h4>
                                                    <p className="text-sm md:text-base text-gray-500 mt-0.5">{section.desc}</p>
                                                </div>
                                            </div>
                                            <ChevronRight size={18} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Logout Button */}
                        <button
                            onClick={() => logout()}
                            className="w-full glass-panel p-4 md:p-5 rounded-2xl text-red-500 hover:bg-red-50/50 transition-colors border border-red-100/50"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-red-50 rounded-xl">
                                    <LogOut size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-base md:text-lg">Log Out</h4>
                                    <p className="text-sm md:text-base text-red-400 mt-0.5">Sign out of your account</p>
                                </div>
                            </div>
                        </button>
                    </motion.div>
                ) : (
                    // Settings Detail View
                    <motion.div
                        key={activeSection}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        {/* Back Button */}
                        <button
                            onClick={() => setActiveSection(null)}
                            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-2"
                        >
                            <ArrowLeft size={20} />
                            <span className="font-medium text-sm">Back to Settings</span>
                        </button>

                        <div className="glass-panel p-6 md:p-8 rounded-2xl md:rounded-3xl min-h-[500px]">
                            {activeSection === 'profile' && (
                                <div className="space-y-8">
                                    <div className="flex items-center gap-6 pb-8 border-b border-white/20">
                                        <div className="relative group">
                                            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-xl">
                                                <img
                                                    src={avatarPreview || user?.avatar || `https://ui-avatars.com/api/?name=${user?.username || 'User'}`}
                                                    alt="Avatar"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <button
                                                onClick={() => avatarInputRef.current?.click()}
                                                className="absolute bottom-0 right-0 p-2 bg-black text-white rounded-full shadow-lg transform translate-x-1 translate-y-1 hover:scale-110 transition-transform"
                                            >
                                                <Camera size={16} />
                                            </button>
                                            <input
                                                type="file"
                                                ref={avatarInputRef}
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        setAvatarFile(file);
                                                        setAvatarPreview(URL.createObjectURL(file));
                                                    }
                                                }}
                                                accept="image/*"
                                                className="hidden"
                                            />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900">{user?.fullName || user?.username}</h3>
                                            <p className="text-sm text-gray-500">Update your photo and personal details.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-900 ml-1">Full Name</label>
                                            <input
                                                type="text"
                                                value={formData.fullName}
                                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                                className="w-full bg-white/50 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black/5 transition-all outline-none"
                                                placeholder="Enter your full name"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-900 ml-1">Email</label>
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full bg-white/50 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black/5 transition-all outline-none"
                                                placeholder="Enter your email"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-900 ml-1">Bio</label>
                                            <textarea
                                                value={formData.bio}
                                                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                                className="w-full bg-white/50 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black/5 transition-all outline-none resize-none h-32"
                                                placeholder="Tell us about yourself..."
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4">
                                        <Button
                                            variant="ghost"
                                            onClick={() => {
                                                setFormData({ fullName: user?.fullName || '', bio: user?.bio || '', email: user?.email || '' });
                                                setAvatarFile(null);
                                                setAvatarPreview(null);
                                            }}
                                            className="text-gray-600 hover:bg-gray-100"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handleUpdateProfile}
                                            isLoading={loading}
                                            className="bg-black text-white px-8 rounded-xl shadow-lg shadow-black/20"
                                        >
                                            Save Changes
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {activeSection === 'notifications' && (
                                <div className="space-y-6">
                                    <h3 className="text-xl font-bold text-gray-900 font-heading">Notification Preferences</h3>
                                    <p className="text-sm text-gray-500 mb-8">Choose how you want to be notified about updates.</p>

                                    {[
                                        { title: 'New Messages', desc: 'When someone sends you a message' },
                                        { title: 'New Likes', desc: 'When someone likes your post' },
                                        { title: 'New Followers', desc: 'When someone starts following you' },
                                        { title: 'Comments', desc: 'When someone comments on your post' },
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 bg-white/40 rounded-2xl border border-white/10 hover:border-white/30 transition-all">
                                            <div>
                                                <h4 className="font-bold text-gray-900">{item.title}</h4>
                                                <p className="text-xs text-gray-500">{item.desc}</p>
                                            </div>
                                            <div className="w-12 h-6 bg-green-500 rounded-full relative cursor-pointer shadow-inner shadow-black/10">
                                                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {activeSection === 'privacy' && (
                                <div className="space-y-8">
                                    <div className="p-6 bg-purple-50 rounded-2xl border border-purple-100 flex items-start gap-4">
                                        <Shield className="text-purple-500 mt-1" size={24} />
                                        <div>
                                            <h4 className="font-bold text-gray-900">Your account is Private</h4>
                                            <p className="text-sm text-gray-600 mt-1">Only your followers can see your posts and stories. You can change this anytime.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-lg font-bold text-gray-900">Password</h3>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-gray-900 ml-1">Old Password</label>
                                                <input
                                                    type="password"
                                                    value={passwordData.oldPassword}
                                                    onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                                                    className="w-full bg-white/50 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black/5 transition-all outline-none"
                                                    placeholder="Enter old password"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-gray-900 ml-1">New Password</label>
                                                <input
                                                    type="password"
                                                    value={passwordData.newPassword}
                                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                                    className="w-full bg-white/50 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black/5 transition-all outline-none"
                                                    placeholder="Enter new password"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-bold text-gray-900 ml-1">Confirm Password</label>
                                                <input
                                                    type="password"
                                                    value={passwordData.confirmPassword}
                                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                                    className="w-full bg-white/50 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black/5 transition-all outline-none"
                                                    placeholder="Confirm new password"
                                                />
                                            </div>
                                            <Button
                                                onClick={handleChangePassword}
                                                isLoading={loading}
                                                className="bg-black text-white"
                                            >
                                                Change Password
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4">
                                        <h3 className="text-lg font-bold text-gray-900">Two-Factor Authentication</h3>
                                        <div className="flex items-center justify-between p-4 bg-white/40 rounded-2xl border border-white/10">
                                            <div>
                                                <p className="text-sm text-gray-700">Add an extra layer of security to your account.</p>
                                            </div>
                                            <Button variant="ghost" className="text-purple-600 font-bold">Enable</Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeSection === 'account' && (
                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-bold text-gray-900">Account Visibility</h3>
                                        <div className="flex items-center gap-4">
                                            <Button className="bg-black text-white shrink-0">Public</Button>
                                            <Button variant="ghost" className="text-gray-500">Private</Button>
                                        </div>
                                    </div>

                                    <div className="pt-8 border-t border-white/20">
                                        <h3 className="text-lg font-bold text-red-500 mb-2">Danger Zone</h3>
                                        <p className="text-sm text-gray-500 mb-4">Deleting your account is permanent and cannot be undone.</p>
                                        <Button
                                            onClick={handleDeleteAccount}
                                            isLoading={loading}
                                            className="bg-red-50 text-red-500 border border-red-100 hover:bg-red-500 hover:text-white transition-all"
                                        >
                                            Delete My Account
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

