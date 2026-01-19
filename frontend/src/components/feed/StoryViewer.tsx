import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Story {
    _id: string;
    mediaUrl: string;
    mediaType: 'image' | 'video';
    createdAt: string;
    user: {
        username: string;
        avatar: string;
    };
}

interface StoryViewerProps {
    stories: Story[];
    initialStoryIndex?: number;
    onClose: () => void;
    onStorySeen?: (storyId: string) => void;
}

export default function StoryViewer({ stories, initialStoryIndex = 0, onClose, onStorySeen }: StoryViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(initialStoryIndex);
    const [progress, setProgress] = useState(0);
    const story = stories[currentIndex];

    const seenStoriesRef = useState<Set<string>>(new Set())[0];

    // Reset progress when index changes
    useEffect(() => {
        setProgress(0);
        if (onStorySeen && story && !seenStoriesRef.has(story._id)) {
            seenStoriesRef.add(story._id);
            onStorySeen(story._id);
        }
    }, [currentIndex, story, onStorySeen]);

    // Timer for image stories (video stories handle their own progress)
    useEffect(() => {
        if (!story || story.mediaType === 'video') return;

        const duration = 5000; // 5 seconds for images
        const interval = 50; // Update every 50ms
        const step = 100 * interval / duration;

        const timer = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(timer);
                    handleNext();
                    return 0;
                }
                return prev + step;
            });
        }, interval);

        return () => clearInterval(timer);
    }, [currentIndex, story]);

    const handleNext = () => {
        if (currentIndex < stories.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            onClose();
        }
    };

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    if (!story) return null;

    return createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] bg-black flex items-center justify-center touch-none overscroll-none"
            >
                {/* Close Button */}
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white z-[110] hover:bg-white/20 transition-all rounded-full p-2 backdrop-blur-sm"
                >
                    <X size={28} />
                </button>

                {/* Navigation Areas */}
                <div className="absolute inset-y-0 left-0 w-1/3 z-10" onClick={handlePrevious} />
                <div className="absolute inset-y-0 right-0 w-1/3 z-10" onClick={handleNext} />

                {/* Progress Bar */}
                <div className="absolute top-4 left-4 right-16 flex gap-1 z-20">
                    {stories.map((s, i) => (
                        <div key={s._id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-white"
                                initial={{ width: i < currentIndex ? '100%' : '0%' }}
                                animate={{ width: i === currentIndex ? `${progress}%` : i < currentIndex ? '100%' : '0%' }}
                                transition={{ ease: "linear", duration: i === currentIndex ? 0.05 : 0 }} // Smooth update for current
                            />
                        </div>
                    ))}
                </div>

                {/* User Info */}
                <div className="absolute top-8 left-4 z-20 flex items-center gap-3">
                    <img
                        src={story.user.avatar || `https://ui-avatars.com/api/?name=${story.user.username}`}
                        alt={story.user.username}
                        className="w-10 h-10 rounded-full border-2 border-white"
                    />
                    <span className="text-white font-bold drop-shadow-md">{story.user.username}</span>
                </div>

                {/* Content */}
                <div className="w-full h-full flex items-center justify-center">
                    {story.mediaType === 'video' ? (
                        <video
                            src={story.mediaUrl}
                            autoPlay
                            className="max-h-full max-w-full object-contain"
                            onEnded={handleNext}
                            onTimeUpdate={(e) => {
                                const video = e.currentTarget;
                                setProgress((video.currentTime / video.duration) * 100);
                            }}
                        />
                    ) : (
                        <img
                            src={story.mediaUrl}
                            alt="Story"
                            className="max-h-full max-w-full object-contain"
                        />
                    )}
                </div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
}
