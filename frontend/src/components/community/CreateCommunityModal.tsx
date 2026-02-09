import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Loader2, Camera } from 'lucide-react';
import { communityAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { useCommunityStore } from '@/store/communityStore';

interface CreateCommunityModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateCommunityModal({ isOpen, onClose, onSuccess }: CreateCommunityModalProps) {
    const { triggerRefresh } = useCommunityStore();
    const [creating, setCreating] = useState(false);
    const [newCommunity, setNewCommunity] = useState({
        name: '',
        description: '',
        isPublic: true,
        rules: '',
    });
    const [coverImage, setCoverImage] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [avatarImage, setAvatarImage] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

    const coverInputRef = useRef<HTMLInputElement>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);

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
        if (!newCommunity.name.trim()) {
            toast.error('Community name is required');
            return;
        }

        try {
            setCreating(true);
            const formData = new FormData();
            formData.append('name', newCommunity.name);
            formData.append('description', newCommunity.description);
            formData.append('isPublic', String(newCommunity.isPublic));
            formData.append('rules', newCommunity.rules);
            if (coverImage) {
                formData.append('coverImage', coverImage);
            }
            if (avatarImage) {
                formData.append('avatar', avatarImage);
            }

            await communityAPI.create(formData);
            toast.success('Community created successfully!');
            triggerRefresh();
            onSuccess();
            onClose();
            // Reset form
            setNewCommunity({ name: '', description: '', isPublic: true, rules: '' });
            setCoverImage(null);
            setCoverPreview(null);
            setAvatarImage(null);
            setAvatarPreview(null);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to create community');
        } finally {
            setCreating(false);
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
                        className="bg-[var(--synapse-surface)] border border-[var(--synapse-border)] rounded-[var(--radius-lg)] p-6 w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-[var(--synapse-text)]">Create Community</h2>
                            <button
                                onClick={onClose}
                                className="text-[var(--synapse-text-muted)] hover:text-[var(--synapse-text)] transition-colors p-1 hover:bg-[var(--synapse-surface-hover)] rounded-full"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Images Section */}
                            <div className="space-y-4">
                                {/* Cover Photo */}
                                <div className="relative">
                                    <label className="block text-xs font-semibold text-[var(--synapse-text-muted)] mb-2 uppercase tracking-wider">Cover Banner</label>
                                    <div
                                        onClick={() => coverInputRef.current?.click()}
                                        className="aspect-[3/1] rounded-[var(--radius-md)] border-2 border-dashed border-[var(--synapse-border)] flex items-center justify-center cursor-pointer hover:border-[var(--synapse-blue)]/50 transition-all overflow-hidden bg-[var(--synapse-bg)] hover:bg-[var(--synapse-surface-hover)] group relative"
                                    >
                                        {coverPreview ? (
                                            <>
                                                <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <Upload className="w-6 h-6 text-white" />
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-center">
                                                <Upload className="w-6 h-6 text-[var(--synapse-text-muted)] mx-auto mb-1 group-hover:text-[var(--synapse-blue)] transition-colors" />
                                                <p className="text-xs text-[var(--synapse-text-muted)]">Upload Banner</p>
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

                                    {/* Avatar/Profile Photo Overlay */}
                                    <div className="absolute -bottom-6 left-6">
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                avatarInputRef.current?.click();
                                            }}
                                            className="w-20 h-20 rounded-[var(--radius-md)] border-4 border-[var(--synapse-surface)] bg-[var(--synapse-bg)] flex items-center justify-center cursor-pointer hover:bg-[var(--synapse-surface-hover)] transition-all shadow-xl overflow-hidden group/avatar relative"
                                        >
                                            {avatarPreview ? (
                                                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <Camera className="w-8 h-8 text-[var(--synapse-text-muted)] group-hover/avatar:text-[var(--synapse-blue)] transition-colors" />
                                            )}
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                                                <Upload className="w-5 h-5 text-white" />
                                            </div>
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

                            <div className="pt-6 space-y-4">
                                {/* Name */}
                                <div>
                                    <label className="block text-xs font-semibold text-[var(--synapse-text-muted)] mb-2 uppercase tracking-wider">Community Name</label>
                                    <input
                                        type="text"
                                        value={newCommunity.name}
                                        onChange={(e) => setNewCommunity({ ...newCommunity, name: e.target.value })}
                                        placeholder="Name your Community.."
                                        className="w-full bg-[var(--synapse-bg)] border border-[var(--synapse-border)] rounded-[var(--radius-md)] px-4 py-3 text-[var(--synapse-text)] placeholder-[var(--synapse-text-muted)] focus:outline-none focus:border-[var(--synapse-focus-ring)] focus:ring-1 focus:ring-[var(--synapse-focus-ring)] transition-all"
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-xs font-semibold text-[var(--synapse-text-muted)] mb-2 uppercase tracking-wider">Objectives/Description</label>
                                    <textarea
                                        value={newCommunity.description}
                                        onChange={(e) => setNewCommunity({ ...newCommunity, description: e.target.value })}
                                        placeholder="Describe the community purpose."
                                        rows={3}
                                        className="w-full bg-[var(--synapse-bg)] border border-[var(--synapse-border)] rounded-[var(--radius-md)] px-4 py-3 text-[var(--synapse-text)] placeholder-[var(--synapse-text-muted)] focus:outline-none focus:border-[var(--synapse-focus-ring)] focus:ring-1 focus:ring-[var(--synapse-focus-ring)] resize-none transition-all"
                                    />
                                </div>

                                {/* Rules */}
                                <div>
                                    <label className="block text-xs font-semibold text-[var(--synapse-text-muted)] mb-2 uppercase tracking-wider">Community Rules (One per line)</label>
                                    <textarea
                                        value={newCommunity.rules}
                                        onChange={(e) => setNewCommunity({ ...newCommunity, rules: e.target.value })}
                                        placeholder="Rules for the community."
                                        rows={3}
                                        className="w-full bg-[var(--synapse-bg)] border border-[var(--synapse-border)] rounded-[var(--radius-md)] px-4 py-3 text-[var(--synapse-text)] placeholder-[var(--synapse-text-muted)] focus:outline-none focus:border-[var(--synapse-focus-ring)] focus:ring-1 focus:ring-[var(--synapse-focus-ring)] resize-none transition-all"
                                    />
                                </div>

                                
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={creating || !newCommunity.name.trim()}
                                className="w-full py-3.5 bg-[var(--synapse-blue)] hover:bg-[var(--synapse-blue)]/90 rounded-[var(--radius-md)] text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20 hover:shadow-purple-900/40"
                            >
                                {creating ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    'Create Community'
                                )}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
