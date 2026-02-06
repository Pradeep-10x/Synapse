import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Camera, Check, X, Loader2, Link as LinkIcon, AlertCircle, ArrowLeft } from 'lucide-react';
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
        <div className="min-h-screen bg-[var(--synapse-bg)] p-6">
            <div className="max-w-4xl mx-auto">
                {/* Main Edit Profile Card */}
                <div className="bg-[var(--synapse-surface)] border border-[var(--synapse-border)] rounded-xl p-8">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-8">
                        <button
                            onClick={() => navigate(-1)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--synapse-surface-hover)] transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-[var(--synapse-text-muted)]" />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-[#6366f1]"></div>
                            <h1 className="text-lg font-semibold text-[var(--synapse-text)]">Edit Profile</h1>
                        </div>
                    </div>

                    {/* Profile Content */}
                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Left Side - Avatar */}
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative group">
                                <div className="w-40 h-40 rounded-full bg-[var(--synapse-surface-hover)] border border-[var(--synapse-border)] overflow-hidden">
                                    <img
                                        src={avatarPreview || "/default-avatar.jpg"}
                                        alt="Profile preview"
                                        className="w-full h-full object-cover object-center min-w-full min-h-full"
                                    />
                                    {/* Overlay */}
                                    <div
                                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full"
                                        onClick={() => avatarInputRef.current?.click()}
                                    >
                                        <Camera className="w-8 h-8 text-white" />
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
                                    className="absolute bottom-2 right-2 w-8 h-8 bg-[var(--synapse-surface)] border border-[var(--synapse-border)] rounded-full flex items-center justify-center hover:bg-[var(--synapse-surface-hover)] hover:border-[#6366f1] transition-colors"
                                    onClick={() => avatarInputRef.current?.click()}
                                >
                                    <Camera className="w-4 h-4 text-[var(--synapse-text-muted)]" />
                                </button>
                            </div>

                            {/* Change Avatar Button */}
                            <button
                                onClick={() => avatarInputRef.current?.click()}
                                className="w-40 h-10 border-2 border-solid border-[var(--synapse-border)] rounded-md text-white  font-medium hover:border-[#6366f1] transition-colors group flex items-center justify-center cursor-pointer transition-colors text-sm text-[var(--synapse-text-muted)] font-medium"
                            >
                                Change Avatar
                            </button>

                            {/* Preview */}
                            <div className="text-center mt-2">
                                <p className="text-sm font-medium text-[var(--synapse-text)]">
                                    {formData.fullName || formData.username || 'User'}
                                    {user?.isVerified && (
                                        <span className="ml-1 text-[#6366f1]">✓</span>
                                    )}
                                </p>
                                <p className="text-xs text-[var(--synapse-text-muted)] max-w-[160px] truncate">
                                    @{formData.username}
                                </p>
                            </div>
                        </div>

                        {/* Right Side - Form */}
                        <div className="flex-1">
                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* Display Name */}
                                <div>
                                    <label className="text-sm font-semibold text-[var(--synapse-text)] mb-2 block">
                                        Display Name
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        className="w-full bg-[var(--synapse-bg)] border border-[var(--synapse-border)] rounded-md px-4 py-2.5 text-sm text-[var(--synapse-text)] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] transition-all placeholder:text-[var(--synapse-text-muted)]"
                                        placeholder="How your name appears"
                                    />
                                </div>

                                {/* Username */}
                                <div>
                                    <label className="text-sm font-semibold text-[var(--synapse-text)] mb-2 block">
                                        Username
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={formData.username}
                                            onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                                            className={`w-full bg-[var(--synapse-bg)] border rounded-lg px-4 py-2.5 text-sm text-[var(--synapse-text)] focus:outline-none focus:ring-1 transition-all placeholder:text-[var(--synapse-text-muted)] ${usernameAvailable === false
                                                ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500'
                                                : 'border-[var(--synapse-border)] focus:border-[#6366f1] focus:ring-[#6366f1]'
                                                }`}
                                            placeholder="username"
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            {checkingUsername ? (
                                                <Loader2 className="w-4 h-4 animate-spin text-[var(--synapse-text-muted)]" />
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
                                    <label className="text-sm font-semibold text-[var(--synapse-text)] mb-2 block">
                                        About 
                                    </label>
                                    <textarea
                                        value={formData.bio}
                                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                        maxLength={150}
                                        rows={3}
                                        className="w-full bg-[var(--synapse-bg)] border border-[var(--synapse-border)] rounded-md px-4 py-2.5 text-sm text-[var(--synapse-text)] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] transition-all resize-none placeholder:text-[var(--synapse-text-muted)]"
                                        placeholder="Tell the world about yourself..."
                                    />
                                    <div className="flex justify-end mt-1">
                                        <span className={`text-xs ${formData.bio.length > 140 ? 'text-red-400' : 'text-[var(--synapse-text-muted)]'}`}>
                                            {formData.bio.length}/150
                                        </span>
                                    </div>
                                </div>

                               

                                {/* Info Box */}
                                <div className="bg-[#6366f1]/5 rounded-md p-4 border border-[#6366f1]/10 flex items-start gap-3">
                                    <AlertCircle className="w-4 h-4 text-[#6366f1] shrink-0 mt-0.5" />
                                    <div className="text-xs">
                                        <p className="text-[var(--synapse-text)] font-medium">Personal Information</p>
                                        <p className="text-[var(--synapse-text-muted)] mt-1">
                                            To update your email or security settings, visit
                                            <button
                                                type="button"
                                                onClick={() => navigate('/settings')}
                                                className="text-[#6366f1] hover:underline ml-1 font-medium"
                                            >
                                                Account Settings
                                            </button>.
                                        </p>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => navigate(-1)}
                                        className="flex-1 px-6 py-2.5 rounded-md font-medium text-sm text-[var(--synapse-text)] border border-[var(--synapse-border)] hover:border-[#6366f1] transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!isFormChanged || loading}
                                        className="flex-1 px-6 py-2.5 rounded-md font-medium text-sm text-white bg-[#6366f1] hover:bg-[#5558e3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            'Save Changes'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
