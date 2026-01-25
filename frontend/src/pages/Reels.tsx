import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reelAPI, likeAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Heart, MessageCircle, Share2, MoreVertical, ArrowLeft, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface Reel {
  _id: string;
  videoUrl: string;
  caption?: string;
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  user: {
    _id: string;
    username: string;
    avatar?: string;
    isVerified?: boolean;
  };
  createdAt: string;
}

export default function ReelsPage() {
  const { reelId } = useParams<{ reelId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [reels, setReels] = useState<Reel[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const viewedReelsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    fetchReels();
  }, []);

  useEffect(() => {
    // Setup intersection observer for autoplay
    if (videoRefs.current.length > 0) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const video = entry.target as HTMLVideoElement;
            if (entry.isIntersecting) {
              video.play().catch(() => {
                // Autoplay blocked
              });
            } else {
              video.pause();
            }
          });
        },
        { threshold: 0.5 }
      );

      videoRefs.current.forEach((video) => {
        if (video) observerRef.current?.observe(video);
      });
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [reels]);

  useEffect(() => {
    // Track view when reel comes into view
    if (reels[currentIndex] && !viewedReelsRef.current.has(reels[currentIndex]._id)) {
      viewedReelsRef.current.add(reels[currentIndex]._id);
      updateViews(reels[currentIndex]._id);
    }
  }, [currentIndex, reels]);

  const fetchReels = async () => {
    try {
      setLoading(true);
      // Fetch reel feed (reels from followed users + own reels)
      const response = await reelAPI.getFeed(1, 50);
      const fetchedReels = response.data.data?.reels || [];
      setReels(fetchedReels);

      // Find initial index if reelId provided
      if (reelId) {
        const index = fetchedReels.findIndex((r: Reel) => r._id === reelId);
        if (index !== -1) setCurrentIndex(index);
      }
    } catch (error: any) {
      console.error('Failed to fetch reels:', error);
      // Fallback to user's own reels if feed fails
      if (user?._id) {
        try {
          const response = await reelAPI.getUserReels(user._id);
          const fetchedReels = response.data.data?.reels || [];
          setReels(fetchedReels);
        } catch (fallbackError) {
          console.error('Failed to fetch user reels:', fallbackError);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const updateViews = async (reelId: string) => {
    try {
      // In production: POST /reel/:id/view
      // For now, just update locally
      setReels((prev) =>
        prev.map((reel) =>
          reel._id === reelId
            ? { ...reel, viewsCount: reel.viewsCount + 1 }
            : reel
        )
      );
    } catch (error) {
      console.error('Failed to update views');
    }
  };

  const handleScroll = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY > 0 && currentIndex < reels.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (e.deltaY < 0 && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleLike = async (reelId: string) => {
    try {
      await likeAPI.likeUnlikeReel(reelId);
      setIsLiked(!isLiked);
      setReels((prev) =>
        prev.map((reel) =>
          reel._id === reelId
            ? { ...reel, likesCount: isLiked ? reel.likesCount - 1 : reel.likesCount + 1 }
            : reel
        )
      );
    } catch (error) {
      console.error('Failed to like reel');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#a855f7]" />
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#9ca3af] text-lg mb-4">No reels available</p>
          <Link
            to="/create"
            className="px-6 py-3 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg font-semibold text-white transition-colors"
          >
            Create Your First Reel
          </Link>
        </div>
      </div>
    );
  }

  const currentReel = reels[currentIndex];

  return (
    <div className="min-h-screen bg-black overflow-hidden flex items-center justify-center relative">
      {/* Back Button */}
      <button
        onClick={() => navigate('/feed')}
        className="absolute top-8 left-8 z-10 p-3 glass-card rounded-full hover:border-[rgba(168,85,247,0.3)] transition-colors"
      >
        <ArrowLeft className="w-5 h-5 text-white" />
      </button>

      {/* Reel Container */}
      <div
        className="w-full max-w-md h-screen flex flex-col items-center justify-center relative"
        onWheel={handleScroll}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="relative w-full aspect-[9/16] bg-black rounded-xl overflow-hidden"
          >
            {/* Video */}
            <video
              ref={(el) => {
                videoRefs.current[currentIndex] = el;
              }}
              src={currentReel.videoUrl}
              className="w-full h-full object-cover"
              loop
              muted
              playsInline
            />

            {/* Right Actions */}
            <div className="absolute right-4 bottom-24 flex flex-col gap-6">
              <button
                onClick={() => handleLike(currentReel._id)}
                className="flex flex-col items-center gap-1 text-white"
              >
                <div className={`w-12 h-12 rounded-full glass-card flex items-center justify-center transition-colors ${isLiked ? 'bg-red-500/20' : 'hover:bg-red-500/20'
                  }`}>
                  <Heart className={`w-6 h-6 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                </div>
                <span className="text-xs font-medium">{currentReel.likesCount}</span>
              </button>

              <Link
                to={`/reel/${currentReel._id}/comments`}
                className="flex flex-col items-center gap-1 text-white"
              >
                <div className="w-12 h-12 rounded-full glass-card flex items-center justify-center hover:bg-[rgba(168,85,247,0.2)] transition-colors">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <span className="text-xs font-medium">{currentReel.commentsCount}</span>
              </Link>

              <button className="flex flex-col items-center gap-1 text-white">
                <div className="w-12 h-12 rounded-full glass-card flex items-center justify-center hover:bg-[rgba(168,85,247,0.2)] transition-colors">
                  <Share2 className="w-6 h-6" />
                </div>
              </button>

              <button className="flex flex-col items-center gap-1 text-white">
                <div className="w-12 h-12 rounded-full glass-card flex items-center justify-center hover:bg-[rgba(168,85,247,0.2)] transition-colors">
                  <MoreVertical className="w-6 h-6" />
                </div>
              </button>
            </div>

            {/* Bottom Info */}
            <div className="absolute bottom-4 left-4 right-20 text-white">
              <Link
                to={`/profile/${currentReel.user.username}`}
                className="flex items-center gap-2 mb-2 hover:opacity-80 transition-opacity"
              >
                <div className="w-8 h-8 rounded-full bg-[#a855f7] flex items-center justify-center overflow-hidden">
                  <img src={currentReel.user.avatar || "/default-avatar.jpg"} alt={currentReel.user.username} className="w-full h-full object-cover" />
                </div>
                <span className="font-semibold">{currentReel.user.username}</span>
                {currentReel.user.isVerified && (
                  <span className="text-[#06b6d4]">✓</span>
                )}
              </Link>
              {currentReel.caption && (
                <p className="text-sm line-clamp-2">{currentReel.caption}</p>
              )}
              <p className="text-xs text-white/70 mt-1">{currentReel.viewsCount} views</p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Scroll Indicator */}
        {reels.length > 1 && (
          <div className="mt-4 flex items-center gap-2">
            {reels.map((_, index) => (
              <div
                key={index}
                className={`h-1 rounded-full transition-all ${index === currentIndex
                  ? 'w-8 bg-[#7c3aed]'
                  : 'w-1 bg-white/30'
                  }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

