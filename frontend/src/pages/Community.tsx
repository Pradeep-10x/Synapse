import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { communityPostAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import CommunityPostCard from '@/components/feed/CommunityPostCard';

interface CommunityPost {
  _id: string;
  user: {
    _id: string;
    username: string;
    avatar?: string;
    isVerified?: boolean;
  };
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

export default function CommunityPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [feedPosts, setFeedPosts] = useState<CommunityPost[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchFeed(1, false);
  }, []);

  // Infinite scroll for feed
  useEffect(() => {
    if (!hasNext || loadingMore || loadingFeed) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNext && !loadingMore) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchFeed(nextPage, true);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasNext, loadingMore, loadingFeed, page]);

  const fetchFeed = async (pageNum: number, append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoadingFeed(true);
        setPage(1);
      }

      const response = await communityPostAPI.getJoinedFeed(pageNum, 10);
      const { posts, hasNext: hasMore } = response.data.data || { posts: [], hasNext: false };

      if (append) {
        setFeedPosts((prev) => [...prev, ...posts]);
      } else {
        setFeedPosts(posts);
      }

      setHasNext(hasMore);
    } catch (error: any) {
      console.error('Failed to fetch community feed:', error);
      toast.error('Failed to load community feed');
    } finally {
      setLoadingFeed(false);
      setLoadingMore(false);
    }
  };

  const handleLikePost = async (postId: string) => {
    setFeedPosts(prev => prev.map(post => {
      if (post._id === postId) {
        const newIsLiked = !post.isLiked;
        return {
          ...post,
          isLiked: newIsLiked,
          likesCount: newIsLiked ? post.likesCount + 1 : post.likesCount - 1
        };
      }
      return post;
    }));

    try {
      await communityPostAPI.like(postId);
    } catch (error) {
      // Revert on error
      setFeedPosts(prev => prev.map(post => {
        if (post._id === postId) {
          return {
            ...post,
            isLiked: !post.isLiked,
            likesCount: post.isLiked ? post.likesCount - 1 : post.likesCount + 1
          };
        }
        return post;
      }));
      toast.error('Failed to like post');
    }
  };

  const handleDeletePost = (postId: string) => {
    setFeedPosts(prev => prev.filter(post => post._id !== postId));
  };


  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-10 py-8">
        {/* Header */}
        <div className="mb-6 pb-4 border-b border-[rgba(168,85,247,0.2)]">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-[#e5e7eb]">Community</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/discover-communities')}
                className="px-4 py-2 glass-card rounded-lg text-[#e5e7eb] hover:border-[rgba(168,85,247,0.3)] transition-colors flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                Discover
              </button>
            </div>
          </div>
          <p className="text-[#9ca3af]">Connect with people who share your interests</p>
        </div>

        {/* Feed Content */}
        <div className="max-w-2xl mx-auto">
              {loadingFeed ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#a855f7]" />
                </div>
              ) : feedPosts.length > 0 ? (
                <>
                  {feedPosts.map((post) => (
                    <CommunityPostCard
                      key={post._id}
                      post={post}
                      onLike={handleLikePost}
                      onDelete={handleDeletePost}
                    />
                  ))}
                  {hasNext && (
                    <div ref={observerTarget} className="flex items-center justify-center py-8">
                      {loadingMore && <Loader2 className="w-6 h-6 animate-spin text-[#a855f7]" />}
                    </div>
                  )}
                  {!hasNext && feedPosts.length > 0 && (
                    <div className="text-center py-8">
                      <p className="text-[#9ca3af] text-sm">You're all caught up</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-[#9ca3af] mx-auto mb-4" />
                  <p className="text-[#9ca3af] mb-4">No posts from your communities yet</p>
                  <button
                    onClick={() => navigate('/discover-communities')}
                    className="px-6 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg text-white font-semibold transition-colors"
                  >
                    Discover Communities
                  </button>
                </div>
              )}
            </div>
      </div>
    </div>
  );
}
