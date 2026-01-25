import { useEffect, useRef, useState } from 'react';
import { feedAPI } from '@/lib/api';
import PostCard from './PostCard';
import { Loader2 } from 'lucide-react';

interface Post {
  _id: string;
  user: {
    _id: string;
    username: string;
    avatar?: string;
    isVerified?: boolean;
  };
  caption?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  isLiked?: boolean;
}

export default function FeedList() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const [error, setError] = useState('');
  const observerTarget = useRef<HTMLDivElement>(null);

  const fetchFeed = async (pageNum: number, append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const response = await feedAPI.getHomeFeed(pageNum, 10);

      const { posts: newPosts, hasNext: hasMore } = response.data.data;

      if (append) {
        setPosts((prev) => [...prev, ...newPosts]);
      } else {
        setPosts(newPosts);
      }

      setHasNext(hasMore);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load feed');
      console.error('Feed error:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchFeed(1);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNext && !loadingMore && !loading) {
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
  }, [hasNext, loadingMore, loading, page]);

  const handleLike = async (postId: string) => {
    // Optimistic update - actual API call can be added later
    setPosts((prev) =>
      prev.map((post) =>
        post._id === postId
          ? {
            ...post,
            isLiked: !post.isLiked,
            likesCount: post.isLiked ? post.likesCount - 1 : post.likesCount + 1,
          }
          : post
      )
    );
  };

  const handleDelete = (postId: string) => {
    // Remove the post from the list
    setPosts((prev) => prev.filter((post) => post._id !== postId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#a855f7]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={() => fetchFeed(1)}
          className="px-4 py-2 glass-card rounded-lg text-[#e5e7eb] hover:border-[rgba(168,85,247,0.3)] transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-[#9ca3af] text-lg mb-2">You're all caught up</p>
        <p className="text-[#9ca3af] text-sm">Follow more users to see their posts</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {posts.map((post) => (
        <PostCard key={post._id} post={post} onLike={handleLike} onDelete={handleDelete} />
      ))}

      {/* Infinite Scroll Trigger */}
      {hasNext && (
        <div ref={observerTarget} className="flex items-center justify-center py-8">
          {loadingMore && <Loader2 className="w-6 h-6 animate-spin text-[#a855f7]" />}
        </div>
      )}

      {!hasNext && posts.length > 0 && (
        <div className="text-center py-8">
          <p className="text-[#9ca3af] text-sm">You're all caught up</p>
        </div>
      )}
    </div>
  );
}

