import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Camera, Check, X, Loader2, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { userAPI } from '@/lib/api';

export default function EditProfile() {
    const navigate = useNavigate();
    const { user, checkAuth } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [checkingUsername, setCheckingUsername] = useState(false);
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

    const [formData, setFormData] = useState({
        username: '',
        fullName: '',
        bio: '',
        website: '', // Assuming added to schema, or will be ignored if not
    });

    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);

    useEffect(() => {
        if (user) {
            setFormData({
                username: user.username || '',
                fullName: user.fullName || '',
                bio: user.bio || '',
                website: '', // Map this if available in user object later
            });
            setAvatarPreview(user.avatar || null);
        }
    }, [user]);

    // Debounced username check
    useEffect(() => {
        const checkUsername = async () => {
            if (!formData.username || formData.username === user?.username) {
                setUsernameAvailable(null);
                return;
            }

            setCheckingUsername(true);
            try {
                // Validate username format
                if (formData.username.length < 3) {
                    setUsernameAvailable(false);
                    return;
                }

                // Check if username is available by trying to fetch the profile
                // If it returns a user, the username is taken
                try {
                    await userAPI.getUserProfile(formData.username);
                    setUsernameAvailable(false); // Username exists
                } catch {
                    setUsernameAvailable(true); // Username is available (404)
                }
            } catch (error) {
                setUsernameAvailable(false);
            } finally {
                setCheckingUsername(false);
            }
        };

        const timeoutId = setTimeout(checkUsername, 500);
        return () => clearTimeout(timeoutId);
    }, [formData.username, user?.username]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Image must be less than 5MB');
                return;
            }
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Update user details
            await userAPI.updateDetails({
                username: formData.username,
                fullName: formData.fullName,
                bio: formData.bio,
            });

            // Update avatar if changed
            if (avatarFile) {
                const avatarFormData = new FormData();
                avatarFormData.append('avatar', avatarFile);
                await userAPI.updateAvatar(avatarFormData);
            }

            toast.success('Profile updated successfully');
            await checkAuth(); // Refresh user state
            navigate(`/profile/${formData.username}`);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const isFormChanged =
        formData.username !== user?.username ||
        formData.fullName !== user?.fullName ||
        formData.bio !== (user?.bio || '') ||
        avatarFile !== null;

    return (
        <div className="min-h-screen bg-[#0a0a12] flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-xl space-y-8">

                {/* Profile Preview Section */}
                <div className="flex flex-col items-center space-y-4">
                    <div className="relative group">
                        <div className="w-32 h-32 rounded-full overflow-hidden bg-[#a855f7] p-[2px]">
                            <div className="w-full h-full rounded-full overflow-hidden bg-[#0a0a12] relative">
                                <img
                                    src={avatarPreview || "/default-avatar.jpg"}
                                    alt="Profile preview"
                                    className="w-full h-full object-cover"
                                />

                                {/* Overlay */}
                                <div
                                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
                                    onClick={() => avatarInputRef.current?.click()}
                                >
                                    <Camera className="w-8 h-8" />
                                </div>
                            </div>
                        </div>

                        {/* Hidden Input */}
                        <input
                            ref={avatarInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileChange}
                        />

                        {/* Edit Badge */}
                        <button
                            className="absolute bottom-0 right-0 bg-[#0a0a12] border border-[rgba(168,85,247,0.3)] rounded-full p-2 text-[#a855f7] hover:text-[#e5e7eb] hover:border-[#a855f7] transition-all"
                            onClick={() => avatarInputRef.current?.click()}
                        >
                            <Camera className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-[#e5e7eb] flex items-center gap-2 justify-center">
                            {formData.fullName || formData.username || 'User'}
                            {user?.isVerified && (
                                <span className="text-[#06b6d4]" title="Verified">✓</span>
                            )}
                        </h2>
                        <p className="text-[#9ca3af] max-w-sm line-clamp-2">
                            {formData.bio || 'Your bio will appear here'}
                        </p>
                    </div>
                </div>

                {/* Edit Form */}
                <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-8 space-y-6 border border-[rgba(168,85,247,0.1)]">

                    {/* Display Name */}
                    <div>
                        <label className="block text-sm font-medium text-[#9ca3af] mb-2">
                            Display Name
                        </label>
                        <input
                            type="text"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            className="w-full bg-[#0a0a12]/50 border border-[rgba(168,85,247,0.2)] rounded-lg px-4 py-3 text-[#e5e7eb] focus:outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7] transition-all"
                            placeholder="How your name appears"
                        />
                    </div>

                    {/* Username */}
                    <div>
                        <label className="block text-sm font-medium text-[#9ca3af] mb-2">
                            Username
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                                className={`w-full bg-[#0a0a12]/50 border rounded-lg px-4 py-3 text-[#e5e7eb] focus:outline-none focus:ring-1 transition-all ${usernameAvailable === false
                                    ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500'
                                    : 'border-[rgba(168,85,247,0.2)] focus:border-[#a855f7] focus:ring-[#a855f7]'
                                    }`}
                                placeholder="username"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                {checkingUsername ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-[#9ca3af]" />
                                ) : usernameAvailable === true ? (
                                    <Check className="w-4 h-4 text-green-500" />
                                ) : usernameAvailable === false ? (
                                    <X className="w-4 h-4 text-red-500" />
                                ) : null}
                            </div>
                        </div>
                        {usernameAvailable === false && (
                            <p className="text-red-400 text-xs mt-1">Username is not available</p>
                        )}
                    </div>

                    {/* Bio */}
                    <div>
                        <label className="block text-sm font-medium text-[#9ca3af] mb-2">
                            Bio
                        </label>
                        <textarea
                            value={formData.bio}
                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            maxLength={150}
                            rows={4}
                            className="w-full bg-[#0a0a12]/50 border border-[rgba(168,85,247,0.2)] rounded-lg px-4 py-3 text-[#e5e7eb] focus:outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7] transition-all resize-none"
                            placeholder="Tell the world about yourself..."
                        />
                        <div className="flex justify-end mt-1">
                            <span className={`text-xs ${formData.bio.length > 140 ? 'text-red-400' : 'text-[#9ca3af]'}`}>
                                {formData.bio.length}/150
                            </span>
                        </div>
                    </div>

                    {/* Website (Currently visual only) */}
                    <div>
                        <label className="block text-sm font-medium text-[#9ca3af] mb-2 flex items-center gap-2">
                            <LinkIcon className="w-3 h-3" /> Website
                        </label>
                        <input
                            type="url"
                            value={formData.website}
                            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                            className="w-full bg-[#0a0a12]/50 border border-[rgba(168,85,247,0.2)] rounded-lg px-4 py-3 text-[#e5e7eb] focus:outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7] transition-all"
                            placeholder="https://your-site.com"
                        />
                    </div>

                    {/* Non-editable Info */}
                    <div className="bg-[#7c3aed]/5 rounded-lg p-4 border border-[rgba(168,85,247,0.1)] flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-[#a855f7] shrink-0 mt-0.5" />
                        <div className="text-sm">
                            <p className="text-[#e5e7eb] font-medium">Personal Information</p>
                            <p className="text-[#9ca3af] mt-1">
                                To update your email or handle security settings, please visit
                                <button
                                    type="button"
                                    onClick={() => navigate('/settings')}
                                    className="text-[#06b6d4] hover:underline ml-1 font-medium"
                                >
                                    Account Settings
                                </button>.
                            </p>
                        </div>
                    </div>

                </form>

                {/* Action Bar (Sticky Bottom style but relative for this page flow, 
            or fixed if content is long. Prompt says "Sticky Bottom". 
            Let's make it fixed bottom or sticky at bottom of container. 
            Fixed is safer for mobile feel.) */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0a0a12]/80 backdrop-blur-lg border-t border-[rgba(168,85,247,0.1)] flex justify-center z-50">
                    <div className="w-full max-w-xl flex gap-4">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="flex-1 px-6 py-3 rounded-xl font-medium text-[#e5e7eb] bg-[#1f2937] hover:bg-[#374151] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!isFormChanged || loading}
                            className="flex-1 px-6 py-3 rounded-xl font-medium text-white bg-[#7c3aed] hover:bg-[#6d28d9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save Changes'
                            )}
                        </button>
                    </div>
                </div>

                {/* Spacer for sticky footer */}
                <div className="h-20" />
            </div>
        </div>
    );
}
