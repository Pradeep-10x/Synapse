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
      className="bg-[var(--synapse-surface)] border border-[var(--synapse-border)] rounded-[var(--radius-md)] overflow-hidden mb-4 shadow-sm transition-all duration-300"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--synapse-border)]">
        <Link
          to={`/profile/${post.user.username}`}
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity group"
        >
          <div className="w-10 h-10 rounded-full bg-[var(--synapse-surface-hover)] border border-[var(--synapse-border)] flex items-center justify-center overflow-hidden">
            <img
              src={post.user.avatar || "/default-avatar.jpg"}
              alt={post.user.username}
              className="w-full h-full object-cover scale-110"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-lg text-[var(--synapse-text)] tracking-tight group-hover:text-[var(--synapse-blue)] transition-colors">{post.user.username}</span>
              {post.user.isVerified && (
                <span className="text-[var(--synapse-blue)] text-[10px] font-medium bg-[var(--synapse-active)] px-1 rounded-[2px]">PRO</span>
              )}
            </div>
            <span className="text-sm font-mono text-[var(--synapse-text-muted)]">
              {formatDistanceToNow(new Date(post.createdAt))}
            </span>
          </div>
        </Link>
        <div className="relative" ref={optionsRef}>
          <button
            onClick={() => setShowOptions(!showOptions)}
            className="text-[var(--synapse-text-muted)] hover:text-[var(--synapse-text)] transition-colors p-1"
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
                className="absolute right-0 top-8 z-50 w-48 bg-[var(--synapse-surface)] rounded-[var(--radius-sm)] shadow-xl border border-[var(--synapse-border)] overflow-hidden"
              >
                <div className="p-1">
                  <button
                    onClick={handleShare}
                    className="w-full px-3 py-2 text-left text-xs text-[var(--synapse-text)] hover:bg-[var(--synapse-surface-hover)] flex items-center gap-2 transition-colors rounded-[2px]"
                  >
                    <Share2 className="w-3.5 h-3.5 text-[var(--synapse-text-muted)]" />
                    Share Post
                  </button>
                  {isOwner && (
                    <>
                      <div className="h-[1px] bg-[var(--synapse-border)] my-1"></div>
                      <button
                        onClick={handleEditCaption}
                        className="w-full px-3 py-2 text-left text-xs text-[var(--synapse-text)] hover:bg-[var(--synapse-surface-hover)] flex items-center gap-2 transition-colors rounded-[2px]"
                      >
                        <Pencil className="w-3.5 h-3.5 text-[var(--synapse-text-muted)]" />
                        Edit Caption
                      </button>
                      <button
                        onClick={handleDeletePost}
                        disabled={isDeleting}
                        className="w-full px-3 py-2 text-left text-xs text-red-500 hover:bg-red-500/10 flex items-center gap-2 transition-colors rounded-[2px]"
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
        <div className="px-3 py-2 border-b border-[var(--synapse-border)] bg-[var(--synapse-surface-hover)]">
          <textarea
            value={editedCaption}
            onChange={(e) => setEditedCaption(e.target.value)}
            className="w-full bg-[var(--synapse-bg)] border border-[var(--synapse-border)] rounded-[var(--radius-sm)] px-3 py-2 text-[var(--synapse-text)] placeholder-[var(--synapse-text-muted)] focus:outline-none focus:border-[var(--synapse-blue)] resize-none font-mono text-xs"
            rows={2}
            placeholder="Write a caption..."
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={handleCancelEdit}
              className="p-1.5 text-[var(--synapse-text-muted)] hover:text-[var(--synapse-text)] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleSaveCaption}
              disabled={savingCaption}
              className="p-1.5 text-[var(--synapse-blue)] hover:bg-[var(--synapse-active)] rounded-[var(--radius-sm)] transition-colors disabled:opacity-50"
            >
              {savingCaption ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      ) : caption && (
        <div className="px-4 py-3.5 text-[var(--synapse-text)] text-base leading-relaxed border-b border-[var(--synapse-border)]/50 font-sans">
          <span><b>Caption :</b> {caption}</span>
        </div>
      )}

      {/* Media */}
      <div className="relative bg-black w-full flex items-center justify-center border-b border-[var(--synapse-border)]">
        {post.mediaType === 'image' ? (
          <img
            src={post.mediaUrl}
            alt={post.caption || 'Post content'}
            className="w-full h-auto max-h-[450px] object-cover"
          />
        ) : (
          <video
            src={post.mediaUrl}
            className="w-full h-full max-h-[450px] object-cover"
            controls
            muted={!isVideoPlaying}
            onPlay={() => setIsVideoPlaying(true)}
            onPause={() => setIsVideoPlaying(false)}
          />
        )}
      </div>

      {/* Actions */}
      <div className="p-3 bg-[var(--synapse-surface)]">
        <div className="flex items-center gap-5">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 transition-all duration-200 group ${isLiked ? 'text-red-500' : 'text-[var(--synapse-text-muted)] hover:text-red-500'
              }`}
          >
            <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : 'stroke-[1.5]'}`} />
            <span className="text-base font-medium font-mono">{likesCount}</span>
          </button>

          <button
            ref={toggleButtonRef}
            onClick={handleToggleComments}
            className="flex items-center gap-1.5 text-[var(--synapse-text-muted)] hover:text-[var(--synapse-blue)] transition-colors group"
          >
            <MessageCircle className="w-6 h-6 stroke-[1.5]" />
            <span className="text-base font-medium font-mono">{commentsCount}</span>
          </button>

          <button className="text-[var(--synapse-text-muted)] hover:text-[var(--synapse-text)] transition-colors ml-auto">
            <Bookmark className="w-6 h-6 stroke-[1.5]" />
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
                    <img src={currentUser?.avatar || "/default-avatar.jpg"} alt="Me" className="w-full h-full object-cover scale-110" />
                  </div>
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Add to the discussion..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="w-full bg-[var(--synapse-bg)] border border-[var(--synapse-border)] rounded-[var(--radius-sm)] pl-3 pr-10 py-2.5 text-sm text-[var(--synapse-text)] placeholder-[var(--synapse-text-muted)] focus:outline-none focus:border-[var(--synapse-blue)] transition-colors"
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
                  <div className="flex flex-col">
                    {comments.map((comment) => (
                      <div key={comment._id} className="flex gap-3 py-3 border-b border-[var(--synapse-border)]/30 last:border-0 group/comment">
                        <Link to={`/profile/${comment.user.username}`} className="shrink-0 pt-0.5">
                          <div className="w-6 h-6 rounded-full bg-[var(--synapse-surface-hover)] border border-[var(--synapse-border)] overflow-hidden">
                            <img
                              src={comment.user.avatar || "/default-avatar.jpg"}
                              alt={comment.user.username}
                              className="w-full h-full object-cover scale-110"
                            />
                          </div>
                        </Link>
                        <div className="flex-1 min-w-0 relative">
                          <div className="flex items-center justify-between mb-0.5">
                            <div className="flex items-center gap-2">
                              <Link
                                to={`/profile/${comment.user.username}`}
                                className="font-bold text-sm text-[var(--synapse-text)] hover:text-[var(--synapse-blue)] transition-colors tracking-tight"
                              >
                                {comment.user.username}
                              </Link>
                              <span className="text-xs uppercase tracking-wider text-[var(--synapse-text-muted)] opacity-60">
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
                          <p className="text-base font-mono text-[var(--synapse-text)] leading-relaxed">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 border border-dashed border-[var(--synapse-border)] rounded-[var(--radius-sm)]">
                    <p className="text-[var(--synapse-text-muted)] text-sm">No activity yet. Initialize discussion.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div >
    </motion.article >
  );
}

