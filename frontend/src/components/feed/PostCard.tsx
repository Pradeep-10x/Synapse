import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Bookmark, MoreHorizontal, Send, Loader2, Trash2, Share2, Pencil, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { likeAPI, commentAPI, postAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'react-hot-toast';
// Simple date formatter (replacing date-fns to avoid dependency)
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

interface Post {
  _id: string;
  user: PostUser;
  caption?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  isLiked?: boolean;
  likes?: string[];
}

interface PostCardProps {
  post: Post;
  onLike?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  initialCommentsOpen?: boolean;
}

export default function PostCard({ post, onLike, onDelete, initialCommentsOpen = false }: PostCardProps) {
  const { user: currentUser } = useAuthStore();

  const initialIsLiked = post.isLiked || (post.likes && currentUser?._id && post.likes.includes(currentUser._id)) || false;

  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);
  const [caption, setCaption] = useState(post.caption || '');
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [showComments, setShowComments] = useState(initialCommentsOpen);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  // Effect to load comments if initially open
  useEffect(() => {
    if (initialCommentsOpen) {
      fetchComments();
    }
  }, []);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [editedCaption, setEditedCaption] = useState(post.caption || '');
  const [savingCaption, setSavingCaption] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);

  const optionsRef = useRef<HTMLDivElement>(null);
  const commentsRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);

  const isOwner = currentUser?._id === post.user._id;

  // Click outside to close options menu and comments
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(event.target as Node)) {
        setShowOptions(false);
      }
      if (
        commentsRef.current &&
        !commentsRef.current.contains(event.target as Node) &&
        toggleButtonRef.current &&
        !toggleButtonRef.current.contains(event.target as Node)
      ) {
        setShowComments(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/post/${post._id}`;
    // ... rest of handleShare (unchanged)
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Check out this post',
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

  // ... (keeping other handlers same until render) ...



  const handleDeletePost = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      setIsDeleting(true);
      await postAPI.deletePost(post._id);
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

  const handleEditCaption = () => {
    setIsEditingCaption(true);
    setEditedCaption(caption);
    setShowOptions(false);
  };

  const handleSaveCaption = async () => {
    try {
      setSavingCaption(true);
      await postAPI.updateCaption(post._id, editedCaption);
      setCaption(editedCaption);
      setIsEditingCaption(false);
      toast.success('Caption updated');
    } catch (error) {
      console.error('Failed to update caption:', error);
      toast.error('Failed to update caption');
    } finally {
      setSavingCaption(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingCaption(false);
    setEditedCaption(caption);
  };

  const handleLike = async () => {
    // Optimistic update
    setIsLiked(!isLiked);
    setLikesCount((prev) => (isLiked ? prev - 1 : prev + 1));

    try {
      await likeAPI.likeUnlikePost(post._id);
      onLike?.(post._id);
    } catch (error) {
      // Revert on error
      setIsLiked(isLiked);
      setLikesCount((prev) => (!isLiked ? prev - 1 : prev + 1));
      console.error('Failed to like post:', error);
    }
  };

  const fetchComments = async () => {
    if (comments.length > 0) return; // Already fetched
    try {
      setLoadingComments(true);
      const response = await commentAPI.getPostComments(post._id);
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
      const response = await commentAPI.createPostComment(post._id, newComment.trim());
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
      await commentAPI.deleteComment(commentId);
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
    // User can delete if they are the comment author or the post owner
    return comment.user._id === currentUser._id || post.user._id === currentUser._id;
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-4 rounded-xl border border-[var(--synapse-border)] bg-[var(--synapse-bg)]/50 hover:border-[var(--synapse-text-muted)]/20 transition-all duration-200 mb-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <Link
          to={`/profile/${post.user.username}`}
          className="flex items-center gap-3 min-w-0 flex-1 group"
        >
          <div className="w-10 h-10 rounded-full border border-[var(--synapse-border)] flex items-center justify-center overflow-hidden ring-1 ring-[var(--synapse-surface)]">
            <img
              src={post.user.avatar || "/default-avatar.jpg"}
              alt={post.user.username}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-[var(--synapse-text)] truncate group-hover:text-[var(--synapse-blue)] transition-colors">
                {post.user.username}
              </span>
              {post.user.isVerified && (
                <span className="text-[#06b6d4] text-[10px] font-medium bg-[var(--synapse-active)] px-1 rounded-[2px] flex-shrink-0">PRO</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--synapse-text-muted)] font-medium">
              {formatDistanceToNow(new Date(post.createdAt))}
            </div>
          </div>
        </Link>
        <div className="relative flex-shrink-0" ref={optionsRef}>
          <button
            onClick={() => setShowOptions(!showOptions)}
            className="p-2 rounded-lg hover:bg-[var(--synapse-surface-hover)] text-[var(--synapse-text-muted)] hover:text-[var(--synapse-text)] transition-colors"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          {/* Options Dropdown */}
          <AnimatePresence>
            {showOptions && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.1 }}
                className="absolute right-0 top-full mt-1 z-50 w-48 bg-[var(--synapse-surface)] rounded-lg shadow-xl border border-[var(--synapse-border)] overflow-hidden"
              >
                <div className="p-1">
                  <button
                    onClick={handleShare}
                    className="w-full px-3 py-2 text-left text-xs text-[var(--synapse-text)] hover:bg-[var(--synapse-surface-hover)] flex items-center gap-2 transition-colors rounded-md"
                  >
                    <Share2 className="w-3.5 h-3.5 text-[var(--synapse-text-muted)]" />
                    Share Post
                  </button>
                  {isOwner && (
                    <>
                      <div className="h-[1px] bg-[var(--synapse-border)] my-1"></div>
                      <button
                        onClick={handleEditCaption}
                        className="w-full px-3 py-2 text-left text-xs text-[var(--synapse-text)] hover:bg-[var(--synapse-surface-hover)] flex items-center gap-2 transition-colors rounded-md"
                      >
                        <Pencil className="w-3.5 h-3.5 text-[var(--synapse-text-muted)]" />
                        Edit Caption
                      </button>
                      <button
                        onClick={handleDeletePost}
                        disabled={isDeleting}
                        className="w-full px-3 py-2 text-left text-xs text-red-500 hover:bg-red-500/10 flex items-center gap-2 transition-colors rounded-md"
                      >
                        {isDeleting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        Delete Post
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Caption */}
      {isEditingCaption ? (
        <div className="mb-3 p-2 border border-[var(--synapse-border)] rounded-md bg-[var(--synapse-surface-hover)]">
          <textarea
            value={editedCaption}
            onChange={(e) => setEditedCaption(e.target.value)}
            className="w-full bg-transparent border-none text-[var(--synapse-text)] placeholder-[var(--synapse-text-muted)] focus:outline-none resize-none text-sm"
            rows={2}
            placeholder="Write a caption..."
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={handleCancelEdit}
              className="p-1 text-[var(--synapse-text-muted)] hover:text-[var(--synapse-text)]"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={handleSaveCaption}
              disabled={savingCaption}
              className="p-1 text-[var(--synapse-blue)] hover:bg-[var(--synapse-active)] rounded transition-colors disabled:opacity-50"
            >
              {savingCaption ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      ) : caption && (
        <div className="mb-3">
          <p className={`text-sm text-[var(--synapse-text)] leading-relaxed ${!isCaptionExpanded ? 'line-clamp-2' : ''}`}>
            {caption}
          </p>
          {caption.length > 100 && (
            <button
              onClick={() => setIsCaptionExpanded(!isCaptionExpanded)}
              className="text-[var(--synapse-blue)] text-xs font-medium mt-1 hover:underline"
            >
              {isCaptionExpanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}

      {/* Media */}
      {post.mediaUrl && (
        <div
          className="block rounded-md overflow-hidden border mb-3"
          style={{ borderColor: 'rgba(83, 81, 81, 0.93)' }}
        >
          {post.mediaType === 'image' ? (
            <img
              src={post.mediaUrl}
              alt={post.caption || 'Post content'}
              className="w-full aspect-video object-cover"
            />
          ) : (
            <video
              src={post.mediaUrl}
              className="w-full h-auto max-h-[400px] object-cover"
              controls
              muted={!isVideoPlaying}
              onPlay={() => setIsVideoPlaying(true)}
              onPause={() => setIsVideoPlaying(false)}
            />
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-5 pt-1">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 transition-all duration-200 group ${isLiked ? 'text-red-500' : 'text-[var(--synapse-text-muted)] hover:text-red-500'
            }`}
        >
          <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
          <span className="text-sm font-medium">{likesCount}</span>
        </button>

        <button
          ref={toggleButtonRef}
          onClick={handleToggleComments}
          className="flex items-center gap-1.5 text-[var(--synapse-text-muted)] hover:text-[var(--synapse-blue)] transition-colors group"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm font-medium">{commentsCount}</span>
        </button>

        <button
          onClick={() => {
            // Basic bookmark support if needed, or keeping it visual
            toast.success('Bookmarked');
          }}
          className="text-[var(--synapse-text-muted)] hover:text-[var(--synapse-text)] transition-colors ml-auto"
        >
          <Bookmark className="w-5 h-5" />
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
            <div className="mt-4 pt-4 border-t border-[var(--synapse-border)]">
              {/* Add Comment Form */}
              <form onSubmit={handleSubmitComment} className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-[var(--synapse-surface-hover)] border border-[var(--synapse-border)] overflow-hidden shrink-0">
                  <img src={currentUser?.avatar || "/default-avatar.jpg"} alt="Me" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Add to the discussion..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="w-full bg-[var(--synapse-bg)] border border-[var(--synapse-border)] rounded-md pl-3 pr-10 py-2 text-sm text-[var(--synapse-text)] placeholder-[var(--synapse-text-muted)] focus:outline-none focus:border-[var(--synapse-blue)] transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim() || submittingComment}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[var(--synapse-blue)] hover:text-white disabled:opacity-30 transition-colors"
                  >
                    {submittingComment ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </form>

              {/* Comments List */}
              {loadingComments ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-[var(--synapse-text-muted)]" />
                </div>
              ) : comments.length > 0 ? (
                <div className="flex flex-col space-y-3">
                  {comments.map((comment) => (
                    <div key={comment._id} className="flex gap-3 group/comment">
                      <Link to={`/profile/${comment.user.username}`} className="shrink-0 pt-0.5">
                        <div className="w-8 h-8 rounded-full bg-[var(--synapse-surface-hover)] border border-[var(--synapse-border)] overflow-hidden">
                          <img
                            src={comment.user.avatar || "/default-avatar.jpg"}
                            alt={comment.user.username}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/profile/${comment.user.username}`}
                              className="font-semibold text-sm text-[var(--synapse-text)] hover:text-[var(--synapse-blue)] transition-colors"
                            >
                              {comment.user.username}
                            </Link>
                            <span className="text-xs text-[var(--synapse-text-muted)]">
                              {formatDistanceToNow(new Date(comment.createdAt))}
                            </span>
                          </div>
                          {canDeleteComment(comment) && (
                            <button
                              onClick={() => handleDeleteComment(comment._id)}
                              disabled={deletingCommentId === comment._id}
                              className="opacity-0 group-hover/comment:opacity-100 text-[var(--synapse-text-muted)] hover:text-red-500 transition-all p-1"
                            >
                              {deletingCommentId === comment._id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-[var(--synapse-text)] leading-relaxed">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-[var(--synapse-text-muted)] text-sm">No comments yet.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

