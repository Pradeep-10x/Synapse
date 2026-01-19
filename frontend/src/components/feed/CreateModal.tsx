import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Camera, Film, Image as ImageIcon } from 'lucide-react';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/Button';
import { toast } from 'react-hot-toast';

interface CreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialType?: 'story' | 'post' | 'reel';
}

export default function CreateModal({ isOpen, onClose, initialType }: CreateModalProps) {
    const [step, setStep] = useState<'selection' | 'upload'>(initialType ? 'upload' : 'selection');
    const [type, setType] = useState<'story' | 'post' | 'reel' | null>(initialType || null);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [caption, setCaption] = useState('');
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && initialType) {
            setStep('upload');
            setType(initialType);
        } else if (isOpen) {
            setStep('selection');
            setType(null);
        }
        setFile(null);
        setPreview(null);
        setCaption('');
    }, [isOpen, initialType]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) {
            setFile(selected);
            const url = URL.createObjectURL(selected);
            setPreview(url);
        }
    };

    const handleTypeSelect = (selectedType: 'story' | 'post' | 'reel') => {
        setType(selectedType);
        setStep('upload');
    };

    const handleSubmit = async () => {
        if (!file || !type) return;

        try {
            setLoading(true);
            const formData = new FormData();

            if (type === 'story') {
                formData.append('media', file);
                await api.post('/story/create', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            } else if (type === 'post') {
                formData.append('media', file);
                formData.append('caption', caption);
                formData.append('mediaType', file.type.startsWith('video') ? 'video' : 'image');
                await api.post('/post/create', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            } else if (type === 'reel') {
                formData.append('video', file);
                formData.append('caption', caption);
                await api.post('/reel/create', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            }

            toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} created successfully!`);
            onClose();
            window.location.reload(); // Refresh to show new content
        } catch (error) {
            toast.error(`Failed to create ${type}`);
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-lg glass-panel overflow-hidden rounded-[32px] shadow-2xl bg-white/90"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-100">
                        <h2 className="text-xl font-bold font-heading">
                            {step === 'selection' ? 'Create New' : `Create ${type?.charAt(0).toUpperCase()}${type?.slice(1)}`}
                        </h2>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-8">
                        {step === 'selection' ? (
                            <div className="grid grid-cols-1 gap-4">
                                <button
                                    onClick={() => handleTypeSelect('story')}
                                    className="flex items-center gap-4 p-5 rounded-2xl bg-gray-50 hover:bg-orange-50 group transition-all"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                                        <Camera size={24} />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-gray-900">Story</p>
                                        <p className="text-sm text-gray-500">Share a moment that lasts 24h</p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => handleTypeSelect('post')}
                                    className="flex items-center gap-4 p-5 rounded-2xl bg-gray-50 hover:bg-blue-50 group transition-all"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                                        <ImageIcon size={24} />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-gray-900">Post</p>
                                        <p className="text-sm text-gray-500">Share photos or videos on your feed</p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => handleTypeSelect('reel')}
                                    className="flex items-center gap-4 p-5 rounded-2xl bg-gray-50 hover:bg-purple-50 group transition-all"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                                        <Film size={24} />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-gray-900">Reel</p>
                                        <p className="text-sm text-gray-500">Share short, creative videos</p>
                                    </div>
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`border-2 border-dashed border-gray-200 hover:border-black/10 bg-gray-50/50 transition-all rounded-2xl min-h-[200px] flex flex-col items-center justify-center cursor-pointer relative overflow-hidden group ${!preview ? 'p-8' : ''}`}
                                >
                                    {preview ? (
                                        <>
                                            {file?.type.startsWith('video') ? (
                                                <video src={preview} className="max-h-[300px] w-full object-contain" />
                                            ) : (
                                                <img src={preview} alt="Preview" className="max-h-[300px] w-full object-contain" />
                                            )}
                                        </>
                                    ) : (
                                        <div className="text-center space-y-3">
                                            <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center mx-auto shadow-sm group-hover:scale-110 transition-transform">
                                                <Upload size={24} className="text-gray-400" />
                                            </div>
                                            <p className="font-bold text-gray-900">Upload {type === 'reel' ? 'video' : 'media'}</p>
                                            <p className="text-xs text-gray-400">Click to select file</p>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        className="hidden"
                                        accept={type === 'reel' ? 'video/*' : 'image/*,video/*'}
                                    />
                                </div>

                                {type !== 'story' && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Caption</label>
                                        <textarea
                                            value={caption}
                                            onChange={(e) => setCaption(e.target.value)}
                                            placeholder="What's on your mind?"
                                            className="w-full h-24 bg-gray-50/50 border border-gray-100 rounded-xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                                        />
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setStep('selection')}
                                        className="flex-1 rounded-xl"
                                    >
                                        Back
                                    </Button>
                                    <Button
                                        onClick={handleSubmit}
                                        isLoading={loading}
                                        disabled={!file}
                                        className="flex-1 bg-black text-white hover:bg-gray-800 rounded-xl shadow-lg"
                                    >
                                        Create {type}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
}
