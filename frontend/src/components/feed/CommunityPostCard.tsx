import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Bookmark, MoreHorizontal, ChevronDown, ChevronUp, Send, Loader2, Trash2, Share2, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { communityPostAPI, communityCommentAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'react-hot-toast';

const formatDistanceToNow = (date: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return `${Math.floor(diffInSeconds / 604800)}w ago`;
};

interface PostUser {
  _id: string;
  username: string;
  avatar?: string;
  isVerified?: boolean;
}

interface Comment {
  _id: string;
  user: {
    _id: string;
    username: string;
    avatar?: string;
  };
  content: string;
  createdAt: string;
}

interface CommunityPost {
  _id: string;
  user: PostUser;
  caption?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  isLiked?: boolean;
  community?: {
    _id: string;
    name: string;
    coverImage?: string;
  };
}

interface CommunityPostCardProps {
  post: CommunityPost;
  onLike?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  isAdmin?: boolean;
}

export default function CommunityPostCard({ post, onLike, onDelete, isAdmin = false }: CommunityPostCardProps) {
  const { user: currentUser } = useAuthStore();
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const optionsRef = useRef<HTMLDivElement>(null);
  const commentsRef = useRef<HTMLDivElement>(null);

  const isOwner = currentUser?._id === post.user._id;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(event.target as Node)) {
        setShowOptions(false);
      }
      if (commentsRef.current && !commentsRef.current.contains(event.target as Node)) {
        setShowComments(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/community/post/${post._id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Check out this community post',
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Failed to share:', error);
    }
    setShowOptions(false);
  };

  const handleDeletePost = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      setIsDeleting(true);
      await communityPostAPI.delete(post._id);
      toast.success('Post deleted successfully');
      onDelete?.(post._id);
    } catch (error) {
      console.error('Failed to delete post:', error);
      toast.error('Failed to delete post');
    } finally {
      setIsDeleting(false);
      setShowOptions(false);
    }
  };

  const handleLike = async () => {
    setIsLiked(!isLiked);
    setLikesCount((prev) => (isLiked ? prev - 1 : prev + 1));
    
    try {
      await communityPostAPI.like(post._id);
      onLike?.(post._id);
    } catch (error) {
      setIsLiked(isLiked);
      setLikesCount((prev) => (!isLiked ? prev - 1 : prev + 1));
      console.error('Failed to like post:', error);
    }
  };

  const fetchComments = async () => {
    if (comments.length > 0) return;
    try {
      setLoadingComments(true);
      const response = await communityCommentAPI.getComments(post._id);
      setComments(response.data.data?.comments || response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleToggleComments = () => {
    if (!showComments) {
      fetchComments();
    }
    setShowComments(!showComments);
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submittingComment) return;

    try {
      setSubmittingComment(true);
      const response = await communityCommentAPI.addComment(post._id, newComment.trim());
      const createdComment = response.data.data;
      setComments((prev) => [createdComment, ...prev]);
      setCommentsCount((prev) => prev + 1);
      setNewComment('');
    } catch (error) {
      console.error('Failed to post comment:', error);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      setDeletingCommentId(commentId);
      await communityCommentAPI.deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
      setCommentsCount((prev) => prev - 1);
    } catch (error) {
      console.error('Failed to delete comment:', error);
    } finally {
      setDeletingCommentId(null);
    }
  };

  const canDeleteComment = (comment: Comment) => {
    if (!currentUser) return false;
    return comment.user._id === currentUser._id || post.user._id === currentUser._id || isAdmin;
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-card rounded-xl overflow-hidden mb-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[rgba(168,85,247,0.1)]">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Link
            to={`/profile/${post.user.username}`}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity flex-shrink-0"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#a855f7] to-[#06b6d4] flex items-center justify-center overflow-hidden">
              <img
                src={post.user.avatar || "/default-avatar.jpg"}
                alt={post.user.username}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#e5e7eb]">{post.user.username}</span>
                {post.user.isVerified && (
                  <span className="text-[#06b6d4] text-xs font-medium">✓</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-[#9ca3af]">
                {post.community && (
                  <>
                    <Link to={`/community/${post.community._id}`} className="text-[#a855f7] hover:underline flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {post.community.name}
                    </Link>
                    <span>•</span>
                  </>
                )}
                <span>{formatDistanceToNow(new Date(post.createdAt))}</span>
              </div>
            </div>
          </Link>
        </div>
        {(isOwner || isAdmin) && (
          <div className="relative" ref={optionsRef}>
            <button 
              onClick={() => setShowOptions(!showOptions)}
              className="text-[#9ca3af] hover:text-[#e5e7eb] transition-colors"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            
            <AnimatePresence>
              {showOptions && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.1 }}
                  className="absolute right-0 top-8 z-50 w-40 bg-[#1a1a2e] rounded-lg shadow-xl border border-[rgba(168,85,247,0.3)] overflow-hidden"
                >
                  <button
                    onClick={handleShare}
                    className="w-full px-4 py-2 text-left text-sm text-[#e5e7eb] hover:bg-[rgba(168,85,247,0.1)] flex items-center gap-2 transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                  {(isOwner || isAdmin) && (
                    <button
                      onClick={handleDeletePost}
                      disabled={isDeleting}
                      className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-[rgba(168,85,247,0.1)] flex items-center gap-2 transition-colors"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      Delete Post
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Caption */}
      {post.caption && (
        <div className="px-4 py-2 text-lg text-[#e5e7eb] border-b border-[rgba(168,85,247,0.1)]">
          <span>{post.caption}</span>
        </div>
      )}

      {/* Media */}
      {post.mediaUrl && (
        <div className="relative bg-[#0a0a12] aspect-[30/17] flex items-center justify-center">
          {post.mediaType === 'image' ? (
            <img
              src={post.mediaUrl}
              alt={post.caption || 'Post image'}
              className="w-full h-full object-contain"
            />
          ) : (
            <video
              src={post.mediaUrl}
              className="w-full h-full object-contain"
              controls
              muted={!isVideoPlaying}
              onPlay={() => setIsVideoPlaying(true)}
              onPause={() => setIsVideoPlaying(false)}
            />
          )}
        </div>
      )}

      {/* Actions */}
      <div className="p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1 transition-all duration-200 ${isLiked ? 'text-red-500' : 'text-[#9ca3af] hover:text-red-500'
              }`}
          >
            <span className="text-sm font-medium">{likesCount}</span>
            <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={handleToggleComments}
            className="flex items-center gap-1 text-[#9ca3af] hover:text-[#e5e7eb] transition-colors"
          >
            <span className="text-sm font-medium">{commentsCount}</span>
            <MessageCircle className="w-6 h-6" />
            {showComments ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button className="text-[#9ca3af] hover:text-[#e5e7eb] transition-colors ml-auto">
            <Bookmark className="w-6 h-6" />
          </button>
        </div>

        {/* Comments Section */}
        <AnimatePresence>
          {showComments && (
            <motion.div
              ref={commentsRef}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-4 border-t border-[rgba(168,85,247,0.1)] pt-4">
                <form onSubmit={handleSubmitComment} className="flex items-center gap-2 mb-4">
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 bg-[rgba(168,85,247,0.05)] border border-[rgba(168,85,247,0.1)] rounded-lg px-3 py-2 text-sm text-[#e5e7eb] placeholder-[#9ca3af] focus:outline-none focus:border-[rgba(168,85,247,0.3)]"
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim() || submittingComment}
                    className="p-2 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {submittingComment ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </form>

                {loadingComments ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-[#a855f7]" />
                  </div>
                ) : comments.length > 0 ? (
                  <div className="space-y-3 max-h-60 overflow-y-auto no-scrollbar">
                    {comments.map((comment) => (
                      <div key={comment._id} className="flex gap-3">
                        <Link to={`/profile/${comment.user.username}`}>
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#a855f7] to-[#06b6d4] flex-shrink-0 overflow-hidden">
                            <img
                              src={comment.user.avatar || "/default-avatar.jpg"}
                              alt={comment.user.username}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Link
                                to={`/profile/${comment.user.username}`}
                                className="font-semibold text-sm text-[#e5e7eb] hover:underline"
                              >
                                {comment.user.username}
                              </Link>
                              <span className="text-xs text-[#9ca3af]">
                                {formatDistanceToNow(new Date(comment.createdAt))}
                              </span>
                            </div>
                            {canDeleteComment(comment) && (
                              <button
                                onClick={() => handleDeleteComment(comment._id)}
                                disabled={deletingCommentId === comment._id}
                                className="text-[#9ca3af] hover:text-red-500 transition-colors p-1"
                                title="Delete comment"
                              >
                                {deletingCommentId === comment._id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </div>
                          <p className="text-sm text-[#e5e7eb] break-words">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-[#9ca3af] text-sm py-4">No comments yet. Be the first to comment!</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.article>
  );
}

