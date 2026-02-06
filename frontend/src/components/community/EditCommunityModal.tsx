import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Globe, Lock, Loader2, Camera, Trash2, AlertTriangle, Settings, Image as ImageIcon } from 'lucide-react';
import { communityAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { useCommunityStore } from '@/store/communityStore';
import { useNavigate } from 'react-router-dom';

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
    const navigate = useNavigate();
    const [updating, setUpdating] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [activeTab, setActiveTab] = useState<'general' | 'images' | 'danger'>('general');
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

    const handleDeleteCommunity = async () => {
        if (!confirm(`Are you sure you want to delete "${community.name}"? This will permanently delete the community and all its posts. This action cannot be undone.`)) {
            return;
        }

        try {
            setDeleting(true);
            await communityAPI.deleteCommunity(community._id);
            toast.success(`Community "${community.name}" deleted successfully`);
            triggerRefresh();
            onClose();
            navigate('/community');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete community');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.8)' }}
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-lg rounded-md overflow-hidden max-h-[90vh] flex flex-col"
                        style={{ 
                            background: 'var(--synapse-surface)',
                            border: '1px solid var(--synapse-border)'
                        }}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--synapse-border)' }}>
                            <div className="flex items-center gap-3">
                                <Settings className="w-5 h-5" style={{ color: 'var(--synapse-primary)' }} />
                                <h3 className="text-lg font-semibold" style={{ color: 'var(--synapse-text)' }}>
                                    Community Settings
                                </h3>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-md hover:bg-white/10 transition-colors"
                            >
                                <X className="w-5 h-5" style={{ color: 'var(--synapse-text-secondary)' }} />
                            </button>
                        </div>

                        {/* Tab Navigation */}
                        <div className="flex border-b" style={{ borderColor: 'var(--synapse-border)' }}>
                            <button
                                onClick={() => setActiveTab('general')}
                                className="flex-1 py-3 text-sm font-medium transition-colors relative"
                                style={{ 
                                    color: activeTab === 'general' ? 'var(--synapse-primary)' : 'var(--synapse-text-secondary)',
                                    background: activeTab === 'general' ? 'rgba(59, 130, 246, 0.1)' : 'transparent'
                                }}
                            >
                                General
                                {activeTab === 'general' && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: 'var(--synapse-primary)' }} />
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('images')}
                                className="flex-1 py-3 text-sm font-medium transition-colors relative"
                                style={{ 
                                    color: activeTab === 'images' ? 'var(--synapse-primary)' : 'var(--synapse-text-secondary)',
                                    background: activeTab === 'images' ? 'rgba(59, 130, 246, 0.1)' : 'transparent'
                                }}
                            >
                                Images
                                {activeTab === 'images' && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: 'var(--synapse-primary)' }} />
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('danger')}
                                className="flex-1 py-3 text-sm font-medium transition-colors relative"
                                style={{ 
                                    color: activeTab === 'danger' ? '#ef4444' : 'var(--synapse-text-secondary)',
                                    background: activeTab === 'danger' ? 'rgba(239, 68, 68, 0.1)' : 'transparent'
                                }}
                            >
                                Danger Zone
                                {activeTab === 'danger' && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500" />
                                )}
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                            <div className="p-4 space-y-4">
                                {/* General Tab */}
                                {activeTab === 'general' && (
                                    <>
                                        {/* Community Name */}
                                        <div>
                                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--synapse-text-secondary)' }}>
                                                Community Name
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="Enter community name..."
                                                className="w-full px-4 py-3 rounded-md text-sm outline-none transition-all"
                                                style={{ 
                                                    background: 'var(--synapse-bg)',
                                                    border: '1px solid var(--synapse-border)',
                                                    color: 'var(--synapse-text)'
                                                }}
                                            />
                                        </div>

                                        {/* Description */}
                                        <div>
                                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--synapse-text-secondary)' }}>
                                                Description
                                            </label>
                                            <textarea
                                                value={formData.description}
                                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                placeholder="Describe your community..."
                                                rows={3}
                                                className="w-full px-4 py-3 rounded-md text-sm outline-none resize-none transition-all"
                                                style={{ 
                                                    background: 'var(--synapse-bg)',
                                                    border: '1px solid var(--synapse-border)',
                                                    color: 'var(--synapse-text)'
                                                }}
                                            />
                                        </div>

                                        {/* Rules */}
                                        <div>
                                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--synapse-text-secondary)' }}>
                                                Community Rules <span className="text-xs opacity-60">(one per line)</span>
                                            </label>
                                            <textarea
                                                value={formData.rules}
                                                onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                                                placeholder="Enter community rules..."
                                                rows={3}
                                                className="w-full px-4 py-3 rounded-md text-sm outline-none resize-none transition-all"
                                                style={{ 
                                                    background: 'var(--synapse-bg)',
                                                    border: '1px solid var(--synapse-border)',
                                                    color: 'var(--synapse-text)'
                                                }}
                                            />
                                        </div>

                                        {/* Visibility */}
                                        <div>
                                            <label className="block text-sm font-medium mb-3" style={{ color: 'var(--synapse-text-secondary)' }}>
                                                Visibility
                                            </label>
                                            <div className="flex gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, isPublic: true })}
                                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-md text-sm font-medium transition-all"
                                                    style={{ 
                                                        background: formData.isPublic ? 'var(--synapse-primary)' : 'var(--synapse-bg)',
                                                        border: `1px solid ${formData.isPublic ? 'transparent' : 'var(--synapse-border)'}`,
                                                        color: formData.isPublic ? '#000' : 'var(--synapse-text-secondary)'
                                                    }}
                                                >
                                                    <Globe className="w-4 h-4" />
                                                    Public
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, isPublic: false })}
                                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-md text-sm font-medium transition-all"
                                                    style={{ 
                                                        background: !formData.isPublic ? 'var(--synapse-primary)' : 'var(--synapse-bg)',
                                                        border: `1px solid ${!formData.isPublic ? 'transparent' : 'var(--synapse-border)'}`,
                                                        color: !formData.isPublic ? '#000' : 'var(--synapse-text-secondary)'
                                                    }}
                                                >
                                                    <Lock className="w-4 h-4" />
                                                    Private
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Images Tab */}
                                {activeTab === 'images' && (
                                    <>
                                        {/* Cover Banner */}
                                        <div>
                                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--synapse-text-secondary)' }}>
                                                Cover Banner
                                            </label>
                                            <div
                                                onClick={() => coverInputRef.current?.click()}
                                                className="relative aspect-[3/1] rounded-md overflow-hidden cursor-pointer group"
                                                style={{ 
                                                    background: 'var(--synapse-bg)',
                                                    border: '2px dashed var(--synapse-border)'
                                                }}
                                            >
                                                {coverPreview ? (
                                                    <>
                                                        <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <div className="flex flex-col items-center gap-2">
                                                                <Upload className="w-6 h-6 text-white" />
                                                                <span className="text-sm text-white">Change Banner</span>
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                                                        <div 
                                                            className="p-3 rounded-full"
                                                            style={{ background: 'var(--synapse-surface)' }}
                                                        >
                                                            <ImageIcon className="w-6 h-6" style={{ color: 'var(--synapse-primary)' }} />
                                                        </div>
                                                        <p className="text-sm" style={{ color: 'var(--synapse-text-secondary)' }}>
                                                            Click to upload banner
                                                        </p>
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
                                        </div>

                                        {/* Avatar */}
                                        <div>
                                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--synapse-text-secondary)' }}>
                                                Community Avatar
                                            </label>
                                            <div className="flex items-center gap-4">
                                                <div
                                                    onClick={() => avatarInputRef.current?.click()}
                                                    className="relative w-24 h-24 rounded-full overflow-hidden cursor-pointer group"
                                                    style={{ 
                                                        background: 'var(--synapse-bg)',
                                                        border: '2px dashed var(--synapse-border)'
                                                    }}
                                                >
                                                    {avatarPreview ? (
                                                        <>
                                                            <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Camera className="w-6 h-6 text-white" />
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <Camera className="w-8 h-8" style={{ color: 'var(--synapse-primary)' }} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium" style={{ color: 'var(--synapse-text)' }}>
                                                        Upload Avatar
                                                    </p>
                                                    <p className="text-xs mt-1" style={{ color: 'var(--synapse-text-secondary)' }}>
                                                        Recommended: Square image, at least 200x200px
                                                    </p>
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
                                    </>
                                )}

                                {/* Danger Zone Tab */}
                                {activeTab === 'danger' && (
                                    <div 
                                        className="rounded-md p-4 space-y-4"
                                        style={{ 
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            border: '1px solid rgba(239, 68, 68, 0.3)'
                                        }}
                                    >
                                        <div className="flex items-start gap-3">
                                            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                            <div className="flex-1">
                                                <h3 className="text-sm font-semibold text-red-400 mb-1">
                                                    Delete Community
                                                </h3>
                                                <p className="text-xs leading-relaxed" style={{ color: 'var(--synapse-text-secondary)' }}>
                                                    Once you delete a community, there is no going back. This will permanently delete the community, all posts, and remove all members. Please be certain.
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleDeleteCommunity}
                                            disabled={deleting}
                                            className="w-full py-3 rounded-md text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white"
                                        >
                                            {deleting ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Deleting...
                                                </>
                                            ) : (
                                                <>
                                                    <Trash2 className="w-4 h-4" />
                                                    Delete Community
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer - Only show on General and Images tabs */}
                            {activeTab !== 'danger' && (
                                <div className="p-4 border-t" style={{ borderColor: 'var(--synapse-border)' }}>
                                    <button
                                        type="submit"
                                        disabled={updating || !formData.name.trim()}
                                        className="w-full py-3 rounded-md text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                        style={{ 
                                            background: '#3b82f6',
                                            color: '#fff'
                                        }}
                                    >
                                        {updating ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Updating...
                                            </>
                                        ) : (
                                            'Save Changes'
                                        )}
                                    </button>
                                </div>
                            )}
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
