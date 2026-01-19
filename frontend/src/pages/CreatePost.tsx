import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/Button';
import { Upload, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function CreatePostPage() {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [caption, setCaption] = useState('');
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) {
            setFile(selected);
            const url = URL.createObjectURL(selected);
            setPreview(url);
        }
    };

    const handleSubmit = async () => {
        if (!file) return;

        try {
            setLoading(true);
            const formData = new FormData();
            formData.append('media', file);
            formData.append('caption', caption);
            formData.append('mediaType', file.type.startsWith('video') ? 'video' : 'image');

            await api.post('/post/create', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            toast.success('Post created successfully!');
            navigate('/');
        } catch (error) {
            toast.error('Failed to create post');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-6 md:py-8 px-4 md:px-6">
            <h1 className="text-3xl font-bold mb-6 text-gray-900">Create New Post</h1>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-8 rounded-3xl space-y-8"
            >
                {/* Media Upload Area */}
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed border-gray-300/50 hover:border-black/20 bg-white/40 hover:bg-white/60 transition-all duration-300 rounded-2xl min-h-[400px] flex flex-col items-center justify-center cursor-pointer relative overflow-hidden group ${!preview ? 'p-10' : ''}`}
                >
                    {preview ? (
                        <>
                            {file?.type.startsWith('video') ? (
                                <video src={preview} className="w-full h-full object-contain backdrop-blur-none" controls />
                            ) : (
                                <img src={preview} alt="Preview" className="w-full h-full object-contain backdrop-blur-none" />
                            )}
                            <button
                                onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); }}
                                className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 backdrop-blur-md p-2 rounded-full text-white transition-all transform hover:scale-110"
                            >
                                <X size={20} />
                            </button>
                        </>
                    ) : (
                        <div className="text-center space-y-6">
                            <div className="w-20 h-20 rounded-full bg-white/60 flex items-center justify-center mx-auto shadow-sm group-hover:scale-110 transition-transform duration-300">
                                <Upload size={32} className="text-gray-500" />
                            </div>
                            <div>
                                <p className="font-heading font-bold text-2xl text-gray-900">Drag photos or videos here</p>
                                <p className="text-base text-gray-500 mt-2">SVG, PNG, JPG or GIF (max. 800x400px)</p>
                            </div>
                            <Button
                                variant="secondary"
                                onClick={(e) => { e.preventDefault(); fileInputRef.current?.click(); }}
                                className="bg-white text-gray-900 hover:bg-gray-50 border border-gray-200 shadow-sm"
                            >
                                Select from computer
                            </Button>
                        </div>
                    )}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept="image/*,video/*"
                    />
                </div>

                {/* Caption */}
                <div className="space-y-3">
                    <label className="text-base font-bold text-gray-900 font-heading ml-1">Caption</label>
                    <textarea
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="Write a caption..."
                        className="w-full h-32 bg-white/50 border border-white/20 rounded-xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 text-gray-900 placeholder:text-gray-400 transition-all"
                    />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <Button
                        variant="ghost"
                        onClick={() => navigate(-1)}
                        className="text-gray-600 hover:bg-black/5 hover:text-gray-900"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        isLoading={loading}
                        disabled={!file}
                        className="bg-black text-white hover:bg-gray-800 px-8 rounded-xl font-medium shadow-lg shadow-black/20 disabled:shadow-none disabled:opacity-50"
                    >
                        Share Post
                    </Button>
                </div>
            </motion.div>
        </div>
    );
}
