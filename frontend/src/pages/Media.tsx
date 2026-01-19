import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/axios';
import { Heart, MessageCircle, Send, MoreHorizontal, Music, Volume2, VolumeX, Trash2, X, Eye } from 'lucide-react';
import { cn } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';

interface Reel {
    _id: string;
    videoUrl: string;
    caption: string;
    user: {
        _id: string;
        username: string;
        avatar: string;
    };
    likesCount: number;
    commentsCount: number;
    viewsCount?: number;
}

const ReelCard = ({ reel, isActive, onDelete, onLike }: { reel: Reel; isActive: boolean; onDelete?: () => void; onLike?: () => void }) => {
    const { user: currentUser } = useAuthStore();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isMuted, setIsMuted] = useState(true);
    const [isLiked, setIsLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(reel.likesCount);
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<any[]>([]);
    const [commentText, setCommentText] = useState('');
    const [isCommenting, setIsCommenting] = useState(false);
    const isOwnReel = currentUser?._id === reel.user._id;

    useEffect(() => {
        const checkLikeStatus = async () => {
            try {
                const { data } = await api.get(`/like/reel/${reel._id}`);
                const userLiked = data.data?.likes?.some((like: any) =>
                    like.user?._id === currentUser?._id || like.user === currentUser?._id
                );
                setIsLiked(userLiked || false);
            } catch (error) {
                setIsLiked(false);
            }
        };
        if (currentUser?._id) {
            checkLikeStatus();
        }
    }, [reel._id, currentUser?._id]);

    const handleLike = async () => {
        try {
            const { data } = await api.post(`/like/reel/${reel._id}`);
            setIsLiked(data.data.liked);
            setLikesCount(prev => data.data.liked ? prev + 1 : prev - 1);
            onLike?.();
        } catch (error) {
            toast.error('Failed to like reel');
        }
    };

    const fetchComments = async () => {
        try {
            const { data } = await api.get(`/comment/reel/${reel._id}`);
            setComments(data.data.comments || []);
        } catch (error) {
            console.error('Failed to fetch comments');
        }
    };

    const handleAddComment = async () => {
        if (!commentText.trim() || isCommenting) return;
        try {
            setIsCommenting(true);
            const { data } = await api.post(`/comment/reel/${reel._id}`, { content: commentText });
            setComments(prev => [data.data, ...prev]);
            setCommentText('');
            toast.success('Comment added');
        } catch (error) {
            toast.error('Failed to add comment');
        } finally {
            setIsCommenting(false);
        }
    };

    const handleDeleteReel = async () => {
        if (!confirm('Are you sure you want to delete this reel?')) return;
        try {
            await api.delete(`/reel/delete/${reel._id}`);
            toast.success('Reel deleted');
            onDelete?.();
        } catch (error) {
            toast.error('Failed to delete reel');
        }
    };

    useEffect(() => {
        if (videoRef.current) {
            if (isActive) {
                videoRef.current.play().catch((err) => {
                    console.log("Video play failed:", err);
                });
            } else {
                videoRef.current.pause();
                videoRef.current.currentTime = 0;
            }
        }
    }, [isActive]);

    useEffect(() => {
        // Load video when component mounts
        if (videoRef.current) {
            videoRef.current.load();
        }
    }, [reel.videoUrl]);

    const togglePlay = () => {
        if (videoRef.current) {
            if (videoRef.current.paused) {
                videoRef.current.play();
            } else {
                videoRef.current.pause();
            }
        }
    };

    return (
        <div className="relative h-full w-full bg-black flex items-center justify-center overflow-hidden snap-start">
            <video
                ref={videoRef}
                src={reel.videoUrl}
                className="h-full w-full object-cover"
                loop
                muted={isMuted}
                playsInline
                onClick={togglePlay}
            />

            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />

            {/* Interactions (Right Side) */}
            <div className="absolute right-4 bottom-24 flex flex-col gap-6 items-center z-20">
                <div className="flex flex-col items-center gap-1">
                    <button
                        onClick={handleLike}
                        className={cn(
                            "p-3 rounded-full backdrop-blur-md transition-all active:scale-90",
                            isLiked ? "bg-red-500 text-white" : "bg-white/10 text-white hover:bg-white/20"
                        )}
                    >
                        <Heart size={28} fill={isLiked ? "currentColor" : "none"} />
                    </button>
                    <span className="text-white text-xs font-bold drop-shadow-md">{likesCount}</span>
                </div>

                <div className="flex flex-col items-center gap-1">
                    <button className="p-3 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all cursor-default">
                        <Eye size={28} />
                    </button>
                    <span className="text-white text-xs font-bold drop-shadow-md">{reel.viewsCount || 0}</span>
                </div>

                <div className="flex flex-col items-center gap-1">
                    <button
                        onClick={() => {
                            if (!showComments) fetchComments();
                            setShowComments(!showComments);
                        }}
                        className="p-3 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all active:scale-90"
                    >
                        <MessageCircle size={28} />
                    </button>
                    <span className="text-white text-xs font-bold drop-shadow-md">{reel.commentsCount}</span>
                </div>

                <div className="flex flex-col items-center gap-1">
                    <button className="p-3 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all active:scale-90">
                        <Send size={28} />
                    </button>
                </div>

                <div className="relative">
                    <button className="p-3 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all">
                        <MoreHorizontal size={24} />
                    </button>
                    {isOwnReel && (
                        <button
                            onClick={handleDeleteReel}
                            className="absolute bottom-full right-0 mb-2 p-2 bg-red-500 text-white rounded-lg text-xs hover:bg-red-600 transition-colors"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>

                <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-3 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all mt-4"
                >
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
            </div>

            {/* User Info (Bottom) */}
            <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden shadow-lg">
                        <img src={reel.user.avatar || `https://ui-avatars.com/api/?name=${reel.user.username}`} className="w-full h-full object-cover" alt="avatar" />
                    </div>
                    <span className="text-white font-bold text-base drop-shadow-md">@{reel.user.username}</span>
                    <button className="px-4 py-1 border border-white text-white rounded-full text-xs font-bold hover:bg-white hover:text-black transition-all">
                        Follow
                    </button>
                </div>

                <p className="text-white text-sm mb-4 line-clamp-2 transition-all drop-shadow-sm max-w-[80%]">
                    {reel.caption || "Amazing content! 🚀 #orbit #reels"}
                </p>

                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md py-1.5 px-3 rounded-full w-fit max-w-[60%] overflow-hidden">
                    <Music size={14} className="text-white shrink-0 animate-pulse" />
                    <div className="text-white text-[10px] font-bold tracking-wider animate-marquee whitespace-nowrap">
                        Original Audio - @{reel.user.username}
                    </div>
                </div>
            </div>

            {/* Comments Overlay */}
            <AnimatePresence>
                {showComments && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-md p-4 max-h-[40%] overflow-y-auto"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-white font-bold">Comments</h4>
                            <button onClick={() => setShowComments(false)} className="text-white hover:text-gray-300">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-3 mb-3">
                            {comments.length > 0 ? (
                                comments.map((comment) => (
                                    <div key={comment._id} className="flex gap-2">
                                        <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20 flex-shrink-0">
                                            <img
                                                src={comment.user?.avatar || `https://ui-avatars.com/api/?name=${comment.user?.username}`}
                                                alt={comment.user?.username}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <span className="text-white font-semibold text-sm mr-2">{comment.user?.username}</span>
                                            <span className="text-white/90 text-sm">{comment.content}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-white/70 text-sm">No comments yet</p>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                                placeholder="Add a comment..."
                                className="flex-1 bg-white/20 border border-white/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                            />
                            <button
                                onClick={handleAddComment}
                                disabled={!commentText.trim() || isCommenting}
                                className="p-2 bg-white text-black rounded-lg hover:bg-white/90 disabled:opacity-50"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default function MediaPage() {
    const { user: currentUser } = useAuthStore();
    const [reels, setReels] = useState<Reel[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchReels = async () => {
            try {
                if (!currentUser?._id) {
                    setLoading(false);
                    return;
                }

                // Try to fetch reels from feed/following first, fallback to user's reels
                try {
                    // Fetch from feed if available
                    const { data: feedData } = await api.get('/feed');
                    if (feedData.data?.reels && feedData.data.reels.length > 0) {
                        setReels(feedData.data.reels);
                        setLoading(false);
                        return;
                    }
                } catch (feedError) {
                    console.log("Feed reels not available, trying user reels");
                }

                // Fallback to fetching user's reels
                const { data } = await api.get(`/reel/${currentUser._id}`);
                if (data.data?.reels?.length > 0) {
                    setReels(data.data.reels);
                } else {
                    setReels([]);
                }
            } catch (error) {
                console.error("Failed to fetch reels", error);
                setReels([]);
            } finally {
                setLoading(false);
            }
        };
        fetchReels();
    }, [currentUser?._id]);

    const handleScroll = () => {
        if (containerRef.current) {
            const scrollTop = containerRef.current.scrollTop;
            const containerHeight = containerRef.current.clientHeight;
            const index = Math.round(scrollTop / containerHeight);
            if (index !== activeIndex && index >= 0 && index < reels.length) {
                setActiveIndex(index);
            }
        }
    };

    useEffect(() => {
        const container = containerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, [reels.length]);

    if (loading) {
        return (
            <div className="h-[calc(100vh-80px)] md:h-[calc(100vh-40px)] flex items-center justify-center glass-panel rounded-2xl">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-black/10 border-t-black rounded-full animate-spin" />
                    <p className="text-sm font-bold animate-pulse">Loading Reels...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-120px)] md:h-[calc(100vh-80px)] w-full max-w-lg mx-auto overflow-hidden glass-panel rounded-3xl relative">
            {reels.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <div className="w-20 h-20 rounded-full bg-white/40 flex items-center justify-center mb-6 shadow-inner">
                        <Music size={36} className="opacity-40" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">No Reels Yet</h3>
                    <p className="text-base text-gray-500 mb-6">Start creating reels to see them here!</p>
                </div>
            ) : (
                <div
                    ref={containerRef}
                    onScroll={handleScroll}
                    className="h-full w-full overflow-y-scroll snap-y snap-mandatory custom-scrollbar-hide"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {reels.map((reel, index) => (
                        <ReelCard
                            key={reel._id}
                            reel={reel}
                            isActive={index === activeIndex}
                            onDelete={() => {
                                setReels(prev => prev.filter(r => r._id !== reel._id));
                            }}
                            onLike={() => {
                                // Refresh reels if needed
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Reels Header */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-30 pointer-events-none">
                <h2 className="text-2xl font-black text-white drop-shadow-lg font-heading tracking-tighter pointer-events-auto">Reels</h2>
                <button className="p-2.5 rounded-full bg-white/10 backdrop-blur-md text-white pointer-events-auto hover:bg-white/20 transition-all">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                </button>
            </div>
        </div>
    );
}

