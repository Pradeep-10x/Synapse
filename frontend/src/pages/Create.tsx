import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { postAPI, reelAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { X, Upload, Loader2, Image as ImageIcon, Video } from 'lucide-react';

type ContentType = 'post' | 'reel';

export default function CreatePage() {
  const [contentType, setContentType] = useState<ContentType>('post');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (contentType === 'post') {
      if (!selectedFile.type.startsWith('image/') && !selectedFile.type.startsWith('video/')) {
        setError('Please select an image or video file');
        return;
      }
    } else {
      if (!selectedFile.type.startsWith('video/')) {
        setError('Please select a video file');
        return;
      }
    }

    // Validate file size (max 100MB for videos, 10MB for images)
    const maxSize = selectedFile.type.startsWith('video/') ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setError(`File size must be less than ${maxSize / (1024 * 1024)}MB`);
      return;
    }

    setFile(selectedFile);
    setError('');

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      const formData = new FormData();
      formData.append(contentType === 'post' ? 'media' : 'video', file);
      formData.append('caption', caption);

      // Simulate progress (since axios doesn't support upload progress easily)
      const progressInterval: NodeJS.Timeout = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            if (progressInterval) clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      try {
        if (contentType === 'post') {
          await postAPI.create(formData);
        } else {
          await reelAPI.create(formData);
        }

        if (progressInterval) clearInterval(progressInterval);
        setUploadProgress(100);
      } catch (err) {
        if (progressInterval) clearInterval(progressInterval);
        throw err;
      }

      toast.success(`${contentType === 'post' ? 'Post' : 'Reel'} created successfully!`);

      // Reset form
      setFile(null);
      setPreview(null);
      setCaption('');
      setUploadProgress(0);

      // Redirect to feed
      setTimeout(() => {
        navigate('/feed');
      }, 500);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Upload failed. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
      <div className="w-full max-w-2xl">
          <div className="glass-panel rounded-2xl p-6 sm:p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#e5e7eb]">Create</h1>
              <button
                onClick={() => navigate('/feed')}
                className="text-[#9ca3af] hover:text-[#e5e7eb] transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content Type Toggle */}
            <div className="flex gap-2 mb-6 p-1 glass-card rounded-lg">
              <button
                onClick={() => {
                  setContentType('post');
                  handleRemoveFile();
                }}
                className={`flex-1 py-2.5 px-4 rounded-md text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${contentType === 'post'
                    ? 'bg-[#7c3aed] text-white'
                    : 'text-[#9ca3af] hover:text-[#e5e7eb]'
                  }`}
                disabled={isUploading}
              >
                <ImageIcon className="w-4 h-4" />
                Post
              </button>
              <button
                onClick={() => {
                  setContentType('reel');
                  handleRemoveFile();
                }}
                className={`flex-1 py-2.5 px-4 rounded-md text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${contentType === 'reel'
                    ? 'bg-[#7c3aed] text-white'
                    : 'text-[#9ca3af] hover:text-[#e5e7eb]'
                  }`}
                disabled={isUploading}
              >
                <Video className="w-4 h-4" />
                Reel
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Media Preview / Upload Area */}
              <div className="relative">
                {preview ? (
                  <div className="relative rounded-xl overflow-hidden bg-[#0a0a12] aspect-square flex items-center justify-center">
                    {file?.type.startsWith('image/') ? (
                      <img src={preview} alt="Preview" className="w-full h-full object-contain" />
                    ) : (
                      <video src={preview} controls className="w-full h-full object-contain" />
                    )}
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="absolute top-4 right-4 p-2 glass-card rounded-full hover:bg-red-500/20 transition-colors"
                      disabled={isUploading}
                    >
                      <X className="w-5 h-5 text-[#e5e7eb]" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => !isUploading && fileInputRef.current?.click()}
                    className="relative border-2 border-dashed border-[rgba(168,85,247,0.3)] rounded-xl p-12 text-center cursor-pointer hover:border-[rgba(168,85,247,0.5)] transition-colors aspect-square flex flex-col items-center justify-center"
                  >
                    <Upload className="w-12 h-12 text-[#9ca3af] mb-4" />
                    <p className="text-[#e5e7eb] font-medium mb-2">
                      {contentType === 'post' ? 'Select image or video' : 'Select video'}
                    </p>
                    <p className="text-sm text-[#9ca3af]">
                      {contentType === 'post' ? 'JPG, PNG, MP4 up to 10MB' : 'MP4, MOV up to 100MB'}
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={contentType === 'post' ? 'image/*,video/*' : 'video/*'}
                      onChange={handleFileSelect}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </div>
                )}
              </div>

              {/* Upload Progress */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#9ca3af]">Uploading...</span>
                    <span className="text-[#e5e7eb] font-medium">{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 glass-card rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#7c3aed] transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Caption Input */}
              <div>
                <label htmlFor="caption" className="block text-sm font-medium text-[#e5e7eb] mb-2">
                  Caption
                </label>
                <textarea
                  id="caption"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write a caption..."
                  rows={4}
                  maxLength={2200}
                  className="w-full px-4 py-3 glass-card rounded-lg text-[#e5e7eb] placeholder-[#9ca3af] focus:outline-none focus:border-[rgba(168,85,247,0.5)] focus:ring-2 focus:ring-[rgba(168,85,247,0.2)] transition-all duration-200 resize-none"
                  disabled={isUploading}
                />
                <p className="text-xs text-[#9ca3af] mt-1 text-right">
                  {caption.length}/2200
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              {/* Publish Button */}
              <button
                type="submit"
                disabled={!file || isUploading}
                className="w-full px-6 py-3 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg font-semibold text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  `Publish ${contentType === 'post' ? 'Post' : 'Reel'}`
                )}
              </button>
            </form>
          </div>
        </div>
    </div>
  );
}

