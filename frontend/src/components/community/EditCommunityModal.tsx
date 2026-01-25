import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Globe, Lock, Loader2, Camera } from 'lucide-react';
import { communityAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { useCommunityStore } from '@/store/communityStore';

interface EditCommunityModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (updatedData: any) => void;
    community: {
        _id: string;
        name: string;
        description: string;
        isPublic: boolean;
        coverImage?: string;
        avatar?: string;
        rules?: string[];
    };
}

export default function EditCommunityModal({ isOpen, onClose, onSuccess, community }: EditCommunityModalProps) {
    const { triggerRefresh } = useCommunityStore();
    const [updating, setUpdating] = useState(false);
    const [formData, setFormData] = useState({
        name: community.name,
        description: community.description,
        isPublic: community.isPublic,
        rules: community.rules?.join('\n') || '',
    });

    const [coverImage, setCoverImage] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(community.coverImage || null);
    const [avatarImage, setAvatarImage] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(community.avatar || null);

    const coverInputRef = useRef<HTMLInputElement>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setFormData({
            name: community.name,
            description: community.description,
            isPublic: community.isPublic,
            rules: community.rules?.join('\n') || '',
        });
        setCoverPreview(community.coverImage || null);
        setAvatarPreview(community.avatar || null);
    }, [community]);

    const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setCoverImage(file);
            setCoverPreview(URL.createObjectURL(file));
        }
    };

    const handleAvatarImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAvatarImage(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            toast.error('Community name is required');
            return;
        }

        try {
            setUpdating(true);
            const updateData = new FormData();
            updateData.append('name', formData.name);
            updateData.append('description', formData.description);
            updateData.append('isPublic', String(formData.isPublic));
            updateData.append('rules', formData.rules);

            if (coverImage) {
                updateData.append('coverImage', coverImage);
            }
            if (avatarImage) {
                updateData.append('avatar', avatarImage);
            }

            const response = await communityAPI.update(community._id, updateData);
            toast.success('Community updated successfully!');
            triggerRefresh();
            onSuccess(response.data.data);
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update community');
        } finally {
            setUpdating(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-[#0a0a12] border border-[rgba(168,85,247,0.3)] rounded-2xl p-6 w-full max-w-md shadow-xl overflow-y-auto max-h-[90vh] no-scrollbar"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-[#e5e7eb]">Edit Community</h2>
                            <button
                                onClick={onClose}
                                className="text-[#9ca3af] hover:text-[#e5e7eb]"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Images Section */}
                            <div className="space-y-4">
                                <div className="relative">
                                    <label className="block text-sm font-medium text-[#9ca3af] mb-2 font-mono uppercase tracking-wider">Cover Banner</label>
                                    <div
                                        onClick={() => coverInputRef.current?.click()}
                                        className="aspect-[3/1] rounded-xl border-2 border-dashed border-[rgba(168,85,247,0.2)] flex items-center justify-center cursor-pointer hover:border-[rgba(168,85,247,0.4)] transition-all overflow-hidden bg-[rgba(168,85,247,0.02)]"
                                    >
                                        {coverPreview ? (
                                            <div className="relative w-full h-full group">
                                                <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Upload className="w-6 h-6 text-white" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center">
                                                <Upload className="w-6 h-6 text-[#9ca3af] mx-auto mb-1" />
                                                <p className="text-xs text-[#6b7280]">Update Banner</p>
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        ref={coverInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleCoverImageChange}
                                        className="hidden"
                                    />

                                    {/* Avatar Photo Overlay */}
                                    <div className="absolute -bottom-4 left-6">
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                avatarInputRef.current?.click();
                                            }}
                                            className="w-20 h-20 rounded-2xl border-4 border-[#0a0a12] bg-[#1a1a2e] flex items-center justify-center cursor-pointer hover:bg-[#252545] transition-all shadow-xl overflow-hidden group"
                                        >
                                            {avatarPreview ? (
                                                <div className="relative w-full h-full">
                                                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Upload className="w-5 h-5 text-white" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <Camera className="w-8 h-8 text-[#9ca3af] group-hover:text-[#a855f7] transition-colors" />
                                            )}
                                        </div>
                                        <input
                                            ref={avatarInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleAvatarImageChange}
                                            className="hidden"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#9ca3af] mb-2 font-mono uppercase tracking-wider">Community Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Orbit name..."
                                        className="w-full glass-card rounded-xl px-4 py-3 text-[#e5e7eb] placeholder-[#4b5563] focus:outline-none focus:border-[rgba(168,85,247,0.4)] transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#9ca3af] mb-2 font-mono uppercase tracking-wider">Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Mission briefing..."
                                        rows={3}
                                        className="w-full glass-card rounded-xl px-4 py-3 text-[#e5e7eb] placeholder-[#4b5563] focus:outline-none focus:border-[rgba(168,85,247,0.4)] resize-none transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#9ca3af] mb-2 font-mono uppercase tracking-wider">Mission Rules (One per line)</label>
                                    <textarea
                                        value={formData.rules}
                                        onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                                        placeholder="Rules of Engagement..."
                                        rows={3}
                                        className="w-full glass-card rounded-xl px-4 py-3 text-[#e5e7eb] placeholder-[#4b5563] focus:outline-none focus:border-[rgba(168,85,247,0.4)] resize-none transition-all"
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, isPublic: true })}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${formData.isPublic
                                            ? 'bg-[#a855f7] text-white'
                                            : 'glass-card text-[#9ca3af]'
                                            }`}
                                    >
                                        <Globe className="w-4 h-4" />
                                        Public
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, isPublic: false })}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${!formData.isPublic
                                            ? 'bg-[#a855f7] text-white'
                                            : 'glass-card text-[#9ca3af]'
                                            }`}
                                    >
                                        <Lock className="w-4 h-4" />
                                        Private
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={updating || !formData.name.trim()}
                                className="w-full py-4 bg-[#a855f7] hover:bg-[#9333ea] rounded-xl text-white font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {updating ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Re-entering Orbit...
                                    </>
                                ) : (
                                    'Update Community'
                                )}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
