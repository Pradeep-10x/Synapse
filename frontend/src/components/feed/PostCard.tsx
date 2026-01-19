import { useState, useEffect } from 'react';
import { Heart, MessageCircle, Eye, MoreHorizontal, X, Zap, Trash2, Send, Share2, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/components/ui/Button';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'react-hot-toast';

interface PostProps {
    post: {
        _id: string;
        user: {
            _id: string;
            username: string;
            fullName?: string;
            avatar: string;
        };
        mediaUrl: string | string[];
        mediaType: 'image' | 'video' | 'text';
        caption: string;
        likesCount: number;
        commentsCount: number;
        viewsCount?: number;
        createdAt: string;
    };
    onDelete?: () => void;
}

export default function PostCard({ post, onDelete }: PostProps) {
    const { user: currentUser } = useAuthStore();
    const [isLiked, setIsLiked] = useState(false);
    const [likes, setLikes] = useState(post.likesCount);
    const [comments, setComments] = useState<any[]>([]);
    const [commentsCount, setCommentsCount] = useState(post.commentsCount);
    const [showReactions, setShowReactions] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [isCommenting, setIsCommenting] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showShareMenu, setShowShareMenu] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isLiking, setIsLiking] = useState(false);
    const [isFetchingComments, setIsFetchingComments] = useState(false);
    const isOwnPost = currentUser?._id === post.user._id;

    // Check if post is already liked
    useEffect(() => {
        const checkLikeStatus = async () => {
            try {
                const { data } = await api.get(`/like/post/${post._id}`);
                const userLiked = data.data?.likes?.some((like: any) =>
                    like.user?._id === currentUser?._id || like.user === currentUser?._id
                );
                setIsLiked(userLiked || false);
            } catch (error) {
                // If check fails, assume not liked
                setIsLiked(false);
            }
        };
        if (currentUser?._id) {
            checkLikeStatus();
        }
    }, [post._id, currentUser?._id]);

    const toggleLike = async () => {
        if (isLiking) return;
        setIsLiking(true);
        try {
            const { data } = await api.post(`/like/post/${post._id}`);
            setIsLiked(data.data.liked);
            setLikes(prev => data.data.liked ? prev + 1 : prev - 1);
        } catch (error) {
            toast.error('Failed to like post');
        } finally {
            setIsLiking(false);
        }
    };

    const fetchComments = async () => {
        setIsFetchingComments(true);
        try {
            const { data } = await api.get(`/comment/post/${post._id}`);
            setComments(data.data.comments || []);
        } catch (error) {
            console.error('Failed to fetch comments');
        } finally {
            setIsFetchingComments(false);
        }
    };

    const handleAddComment = async () => {
        if (!commentText.trim() || isCommenting) return;
        try {
            setIsCommenting(true);
            const { data } = await api.post(`/comment/post/${post._id}`, { content: commentText });
            setComments(prev => [data.data, ...prev]);
            setCommentsCount(prev => prev + 1);
            setCommentText('');
            toast.success('Comment added');
        } catch (error) {
            toast.error('Failed to add comment');
        } finally {
            setIsCommenting(false);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        try {
            await api.delete(`/comment/${commentId}`);
            setComments(prev => prev.filter(c => c._id !== commentId));
            setCommentsCount(prev => prev - 1);
            toast.success('Comment deleted');
        } catch (error) {
            toast.error('Failed to delete comment');
        }
    };

    const handleDeletePost = async () => {
        if (!confirm('Are you sure you want to delete this post?')) return;
        setIsDeleting(true);
        try {
            await api.delete(`/post/${post._id}`);
            toast.success('Post deleted');
            onDelete?.();
        } catch (error) {
            toast.error('Failed to delete post');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleToggleComments = () => {
        if (!showComments) {
            fetchComments();
        }
        setShowComments(!showComments);
    };

    const getPostUrl = () => {
        const baseUrl = window.location.origin;
        return `${baseUrl}/post/${post._id}`;
    };

    const handleCopyLink = async () => {
        try {
            const postUrl = getPostUrl();
            await navigator.clipboard.writeText(postUrl);
            setLinkCopied(true);
            toast.success('Link copied to clipboard!');
            setShowShareMenu(false);
            setTimeout(() => setLinkCopied(false), 2000);
        } catch (error) {
            toast.error('Failed to copy link');
        }
    };

    const handleShare = async () => {
        const postUrl = getPostUrl();
        const shareData = {
            title: `Post by ${post.user.fullName || post.user.username}`,
            text: post.caption || 'Check out this post!',
            url: postUrl,
        };

        // Check if native share API is available (mobile devices)
        if (navigator.share && navigator.canShare(shareData)) {
            try {
                await navigator.share(shareData);
                toast.success('Post shared!');
            } catch (error: any) {
                // User cancelled or error occurred
                if (error.name !== 'AbortError') {
                    toast.error('Failed to share post');
                }
            }
        } else {
            // Fallback to copy link
            handleCopyLink();
        }
        setShowShareMenu(false);
    };

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

        if (diffInHours < 1) return 'Just now';
        if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    };

    const mediaUrls = Array.isArray(post.mediaUrl) ? post.mediaUrl : [post.mediaUrl];
    const hasMedia = mediaUrls.length > 0 && mediaUrls[0];

    // Extract mentions from caption
    const renderCaption = (text: string) => {
        const parts = text.split(/(@\w+)/g);
        return parts.map((part, i) => {
            if (part.startsWith('@')) {
                return (
                    <span key={i} className="text-purple-600 font-semibold cursor-pointer hover:underline">
                        {part}
                    </span>
                );
            }
            return <span key={i}>{part}</span>;
        });
    };

    const reactions = ['🔥', '❤️', '😂'];

    return (
        <div className={cn(
            "bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm transition-opacity w-full",
            isDeleting && "opacity-50 pointer-events-none"
        )}>
          
      
            {/* Header */}
            <div className="p-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200 cursor-pointer">
                        <img
                            src={post.user.avatar || `https://ui-avatars.com/api/?name=${post.user.username}`}
                            className="w-full h-full object-cover"
                            alt={post.user.username}
                        />
                    </div>
                    <div>
                        <h3 className="font-semibold text-base text-gray-900 cursor-pointer hover:underline">
                            {post.user.fullName || post.user.username}
                        </h3>
                        <p className="text-sm text-gray-500">{formatTimeAgo(post.createdAt)}</p>
                    </div>
                </div>
                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <MoreHorizontal size={20} />
                    </button>
                    {showMenu && (
                        <div className="absolute right-0 top-8 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-20 min-w-[150px]">
                            <button
                                onClick={() => {
                                    setShowShareMenu(true);
                                    setShowMenu(false);
                                }}
                                className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                                <Share2 size={16} />
                                Share
                            </button>
                            {isOwnPost && (
                                <button
                                    onClick={() => {
                                        handleDeletePost();
                                        setShowMenu(false);
                                    }}
                                    disabled={isDeleting}
                                    className="w-full text-left px-4 py-2 text-red-500 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isDeleting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                            Deleting...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 size={16} />
                                            Delete
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Caption */}
            {post.caption && (
                <div className="px-4 pb-3">
                    <p className="text-base text-gray-900 leading-relaxed">
                        {renderCaption(post.caption)}
                    </p>
                </div>
            )}

            
           {/* Media */}
{hasMedia && (
  <div className={cn(
    "relative overflow-hidden",
    mediaUrls.length > 1 && "grid grid-cols-3 gap-[2px]"
  )}>
    {mediaUrls.slice(0, 3).map((url, index) => (
      <div key={index} className="relative">
        {post.mediaType === 'video' ? (
          <video
            src={url}
            controls
            className="w-full h-auto object-cover block"
          />
        ) : (
          <img
            src={url}
            alt={`Post media ${index + 1}`}
            className="w-full h-auto object-cover block"
          />
        )}
      </div>
    ))}
  </div>
)}


            {/* Actions */}
            <div className="p-2">
                <div className="flex items-center gap-5 relative">
                    <div className="flex items-center gap-1 text-gray-600">
                        <Eye size={18} />
                        <span className="text-base font-medium">{post.viewsCount || likes}</span>
                    </div>
                    <div className="relative group">
                        <button
                            onClick={toggleLike}
                            onMouseEnter={() => setShowReactions(true)}
                            disabled={isLiking}
                            className="flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={isLiked ? 'liked' : 'unliked'}
                                    initial={{ scale: 0.8 }}
                                    animate={{ scale: 1 }}
                                    exit={{ scale: 0.8 }}
                                    transition={{ duration: 0.15 }}
                                >
                                    {isLiking ? (
                                        <div className="w-5 h-5 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Heart
                                            size={20}
                                            className={cn(
                                                "transition-colors",
                                                isLiked ? "fill-pink-500 text-pink-500" : "text-gray-600 group-hover:text-pink-500"
                                            )}
                                        />
                                    )}
                                </motion.div>
                            </AnimatePresence>
                            <span className={cn(
                                "text-base font-medium",
                                isLiked ? "text-pink-500" : "text-gray-600 group-hover:text-pink-500"
                            )}>
                                {likes > 0 ? likes : 'Like'}
                            </span>
                        </button>

                        {/* Reaction Popup */}
                        <AnimatePresence>
                            {showReactions && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    onMouseLeave={() => setShowReactions(false)}
                                    className="absolute bottom-full left-0 mb-2 bg-white rounded-2xl shadow-xl border border-gray-200 p-3 z-10 min-w-[200px]"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        {reactions.map((emoji, i) => (
                                            <button
                                                key={i}
                                                className="text-2xl hover:scale-125 transition-transform"
                                                onClick={() => {
                                                    setShowReactions(false);
                                                    if (!isLiked) toggleLike();
                                                }}
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                    <button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg py-2 px-4 flex items-center justify-center gap-2 font-semibold hover:from-purple-600 hover:to-pink-600 transition-colors">
                                        <Zap size={16} />
                                        Woow!!!
                                    </button>
                                    <button
                                        onClick={() => setShowReactions(false)}
                                        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                                    >
                                        <X size={16} />
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    <button
                        onClick={handleToggleComments}
                        className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <MessageCircle size={22} />
                        <span className="text-base font-medium">Comment</span>
                        {commentsCount > 0 && (
                            <span className="text-base font-medium">({commentsCount})</span>
                        )}
                    </button>
                    <div className="relative">
                        <button
                            onClick={() => setShowShareMenu(!showShareMenu)}
                            className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            <Share2 size={22} />
                            <span className="text-base font-medium">Share</span>
                        </button>

                        {/* Share Menu */}
                        <AnimatePresence>
                            {showShareMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-20 min-w-[180px]"
                                    onMouseLeave={() => setShowShareMenu(false)}
                                >
                                    <button
                                        onClick={handleShare}
                                        className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                        <Share2 size={16} />
                                        Share Post
                                    </button>
                                    <button
                                        onClick={handleCopyLink}
                                        className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                        {linkCopied ? (
                                            <>
                                                <Check size={16} className="text-green-500" />
                                                <span className="text-green-500">Copied!</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy size={16} />
                                                Copy Link
                                            </>
                                        )}
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Comments Section */}
            <AnimatePresence>
                {showComments && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-gray-100 overflow-hidden"
                    >
                        <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
                            {/* Add Comment */}
                            <div className="flex gap-2">
                                <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 flex-shrink-0">
                                    <img
                                        src={currentUser?.avatar || `https://ui-avatars.com/api/?name=${currentUser?.username}`}
                                        alt="You"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="flex-1 flex gap-2">
                                    <input
                                        type="text"
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                                        placeholder="Add a comment..."
                                        className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-black/5"
                                    />
                                    <button
                                        onClick={handleAddComment}
                                        disabled={!commentText.trim() || isCommenting}
                                        className="p-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Send size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Comments List */}
                            {isFetchingComments ? (
                                <div className="flex items-center justify-center py-4">
                                    <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : comments.length > 0 ? (
                                <div className="space-y-3">
                                    {comments.map((comment) => (
                                        <div key={comment._id} className="flex gap-2">
                                            <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 flex-shrink-0">
                                                <img
                                                    src={comment.user?.avatar || `https://ui-avatars.com/api/?name=${comment.user?.username}`}
                                                    alt={comment.user?.username}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <div className="bg-gray-50 rounded-lg px-3 py-2">
                                                    <span className="font-semibold text-base text-gray-900 mr-2">
                                                        {comment.user?.username}
                                                    </span>
                                                    <span className="text-base text-gray-700">{comment.content}</span>
                                                </div>
                                                <div className="flex items-center gap-3 mt-1 px-1">
                                                    <span className="text-sm text-gray-500">
                                                        {new Date(comment.createdAt).toLocaleDateString()}
                                                    </span>
                                                    {currentUser?._id === comment.user?._id && (
                                                        <button
                                                            onClick={() => handleDeleteComment(comment._id)}
                                                            className="text-sm text-red-500 hover:text-red-700"
                                                        >
                                                            Delete
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-base text-gray-500 text-center py-4">No comments yet</p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
