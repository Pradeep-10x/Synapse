import { useState, useEffect, useRef } from 'react';
import { ActivityItem, ActivityProps } from '@/components/feed/ActivityItem';
import { LivePresence } from '@/components/layout/LivePresence';
import { feedAPI, notificationAPI } from '@/lib/api';
import { useSocketStore } from '@/store/socketStore';
import { useAuthStore } from '@/store/authStore';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';

const TWO_MINUTES = 2 * 60 * 1000; // 2 minutes in milliseconds

export default function FeedPage() {
  const [activities, setActivities] = useState<ActivityProps[]>([]);
  const [realtimeNotifications, setRealtimeNotifications] = useState<ActivityProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const [postSlideIndex, setPostSlideIndex] = useState(0);
  const observerTarget = useRef<HTMLDivElement>(null);
  const { socket } = useSocketStore();
  const { user } = useAuthStore();

  const mapPostToActivity = (post: any): ActivityProps => {
    // Determine media type description
    let mediaDescription = 'posted a new update';
    if (post.mediaType === 'image') {
      mediaDescription = 'posted a new image';
    } else if (post.mediaType === 'video') {
      mediaDescription = 'posted a new video';
    } else if (post.mediaUrl) {
      // Fallback: detect from URL extension
      const url = post.mediaUrl.toLowerCase();
      if (url.includes('.mp4') || url.includes('.webm') || url.includes('.mov') || url.includes('video')) {
        mediaDescription = 'posted a new video';
      } else if (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || url.includes('.gif') || url.includes('.webp') || url.includes('image')) {
        mediaDescription = 'posted a new image';
      }
    }

    // Check if it's a community post
    if (post.community) {
      const communityName = post.community?.name || 'a community';
      mediaDescription = `posted in ${communityName}`;
    }

    return {
      type: 'post',
      timestamp: format(new Date(post.createdAt), 'HH:mm'),
      user: {
        name: post.user?.username || post.author?.username || 'Unknown',
        avatar: post.user?.avatar || post.author?.avatar
      },
      content: {
        text: mediaDescription,
        highlight: post.caption || post.text || '',
        mediaUrl: post.mediaUrl
      },
      postId: post._id,
      originalTimestamp: new Date(post.createdAt).getTime(),
      isRealtime: false
    } as any;
  };

  const mapNotificationToActivity = (notif: any, isRealtime = false): ActivityProps => {
    let text = 'updated the system';
    let type: any = 'system';

    switch (notif.type) {
      case 'like':
        text = `liked your ${notif.post ? 'post' : notif.reel ? 'reel' : 'story'}`;
        type = 'event';
        break;
      case 'comment':
        text = `commented on your ${notif.post ? 'post' : 'reel'}`;
        type = 'event';
        break;
      case 'follow':
        text = 'started following you';
        type = 'join';
        break;
      case 'mention':
        text = 'mentioned you in a post';
        type = 'event';
        break;
      default:
        text = notif.message || 'New notification';
    }

    return {
      type,
      timestamp: format(new Date(notif.createdAt), 'HH:mm'),
      user: {
        name: notif.fromUser?.username || 'System',
        avatar: notif.fromUser?.avatar
      },
      content: {
        text,
        highlight: ''
      },
      postId: notif.post || notif.reel || null,
      originalTimestamp: new Date(notif.createdAt).getTime(),
      isRealtime
    } as any;
  };

  // Move realtime notifications to recent after 2 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setRealtimeNotifications(prev => {
        const stillRealtime: ActivityProps[] = [];
        const toMoveToRecent: ActivityProps[] = [];
        
        prev.forEach(notif => {
          if (now - (notif as any).originalTimestamp < TWO_MINUTES) {
            stillRealtime.push(notif);
          } else {
            toMoveToRecent.push({ ...notif, isRealtime: false } as any);
          }
        });

        if (toMoveToRecent.length > 0) {
          setActivities(prevActivities => {
            const combined = [...toMoveToRecent, ...prevActivities];
            combined.sort((a: any, b: any) => b.originalTimestamp - a.originalTimestamp);
            return combined;
          });
        }

        return stillRealtime;
      });
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const fetchFeed = async (pageNum: number, append = false) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);

      // Fetch Posts
      const postResponse = await feedAPI.getHomeFeed(pageNum, 20);
      const { posts, hasNext: more } = postResponse.data.data;
      let newActivities = posts.map(mapPostToActivity);

      // Fetch Notifications only on first load
      if (pageNum === 1) {
        try {
          const notifResponse = await notificationAPI.getNotifications();
          const notifications = notifResponse.data.data || [];
          const notifActivities = notifications.map((n: any) => mapNotificationToActivity(n, false));
          newActivities = [...newActivities, ...notifActivities];
        } catch (err) {
          console.error('Failed to load notifications', err);
        }
      }

      // Sort by timestamp descending
      newActivities.sort((a: any, b: any) => b.originalTimestamp - a.originalTimestamp);

      if (append) {
        setActivities(prev => {
          const combined = [...prev, ...newActivities];
          return combined;
        });
      } else {
        setActivities(newActivities);
      }
      setHasNext(more);
    } catch (error) {
      console.error('Failed to load feed:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchFeed(1);
  }, []);

  // Infinite Scroll
  useEffect(() => {
    const target = observerTarget.current;
    if (!target || !hasNext || loading || loadingMore) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setPage(p => p + 1);
        fetchFeed(page + 1, true);
      }
    }, { threshold: 0.1 });

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasNext, loading, loadingMore, page]);

  // Real-time Socket Events
  useEffect(() => {
    if (!socket || !user) return;

    const handleNewPost = (data: any) => {
      if (data?.post && data.post.user?._id !== user._id && data.post.user !== user._id) {
        const newActivity = mapPostToActivity(data.post);
        setActivities(prev => [newActivity, ...prev]);
      }
    };

    const handleNewNotification = (notif: any) => {
      if (notif.fromUser?._id !== user._id && notif.fromUser !== user._id) {
        const newActivity = mapNotificationToActivity(notif, true);
        setRealtimeNotifications(prev => [newActivity, ...prev]);
      }
    };

    socket.on('post:new', handleNewPost);
    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('post:new', handleNewPost);
      socket.off('notification:new', handleNewNotification);
    };
  }, [socket, user]);

  // Separate notifications from posts for recent section
  const recentNotifications = activities.filter((a: any) => a.type !== 'post').slice(0, 4);
  const postsActivities = activities.filter((a: any) => a.type === 'post');

  // Slide indexes for each section
  const [realtimeSlideIndex, setRealtimeSlideIndex] = useState(0);
  const [recentSlideIndex, setRecentSlideIndex] = useState(0);

  // Post slide index for the posts carousel
  const totalPostSlides = Math.min(postsActivities.length, 10); // Max 10 posts in carousel
  const totalRealtimeSlides = Math.min(realtimeNotifications.length, 4);
  const totalRecentSlides = Math.min(recentNotifications.length, 4);

  // Auto-slide for realtime notifications
  useEffect(() => {
    if (totalRealtimeSlides > 1) {
      const interval = setInterval(() => {
        setRealtimeSlideIndex((prev) => (prev + 1) % totalRealtimeSlides);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [totalRealtimeSlides]);

  // Auto-slide for recent notifications
  useEffect(() => {
    if (totalRecentSlides > 1) {
      const interval = setInterval(() => {
        setRecentSlideIndex((prev) => (prev + 1) % totalRecentSlides);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [totalRecentSlides]);

  // Auto-slide for posts
  useEffect(() => {
    if (totalPostSlides > 1) {
      const interval = setInterval(() => {
        setPostSlideIndex((prev) => (prev + 1) % totalPostSlides);
      }, 6000);
      return () => clearInterval(interval);
    }
  }, [totalPostSlides]);

  return (
    <div className="animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="mb-8 pt-2">
        <h1 className="text-sm font-medium text-[var(--synapse-text-muted)] tracking-widest uppercase mb-1">
          Live Status: <span className="text-green-500 font-semibold">Active</span> • Real-time Feed
        </h1>
      </div>

      {/* Main Content - Activity Card + Live Presence side by side */}
      <div className="flex gap-6 items-stretch">
        {/* Main Activity Card */}
        <div className="flex-1 bg-[var(--synapse-surface)] border border-[var(--synapse-border)] rounded-[var(--radius-lg)] overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-[var(--synapse-border)] bg-[rgba(255,255,255,0.02)] flex justify-between items-center">
            <h2 className="font-semibold text-xl text-[var(--synapse-text)]">Activity Stream</h2>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs text-[var(--synapse-text-muted)] font-mono">LIVE</span>
            </div>
          </div>

          <div className="py-2 px-6 pb-10 space-y-2">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--synapse-text-muted)]" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-[var(--synapse-text-muted)] uppercase tracking-wider">
                        <b>Real-time Activity</b>
                      </h3>
                      {realtimeNotifications.length > 0 && (
                        <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded-full">
                          {realtimeNotifications.length} new
                        </span>
                      )}
                    </div>
                    {/* Dots for realtime */}
                    {totalRealtimeSlides > 1 && (
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(totalRealtimeSlides, 4) }).map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setRealtimeSlideIndex(idx)}
                            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                              realtimeSlideIndex === idx
                                ? 'bg-red-500 w-3'
                                : 'bg-[var(--synapse-text-muted)] opacity-40 hover:opacity-70'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="min-h-[50px]">
                    {realtimeNotifications.length > 0 ? (
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={realtimeSlideIndex}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.3 }}
                        >
                          <ActivityItem {...realtimeNotifications[realtimeSlideIndex]} />
                        </motion.div>
                      </AnimatePresence>
                    ) : (
                      <div className="flex items-center justify-center h-[30px] text-[var(--synapse-text-muted)] italic text-md">
                        No real-time activity
                      </div>
                    )}
                  </div>
                </div>

                <div className="h-px bg-[var(--synapse-border)]" />

                {/* Section 2: Recent Notifications */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-[var(--synapse-text-muted)] uppercase tracking-wider">
                      <b>Recent Activities</b>
                   
                    </h3>
                    {/* Dots for recent */}
                    {totalRecentSlides > 1 && (
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(totalRecentSlides, 4) }).map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setRecentSlideIndex(idx)}
                            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                              recentSlideIndex === idx
                                ? 'bg-emerald-500 w-3'
                                : 'bg-[var(--synapse-text-muted)] opacity-40 hover:opacity-70'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="min-h-[50px]">
                    {recentNotifications.length > 0 ? (
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={recentSlideIndex}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.3 }}
                        >
                          <ActivityItem {...recentNotifications[recentSlideIndex]} />
                        </motion.div>
                      </AnimatePresence>
                    ) : (
                      <div className="flex items-center justify-center h-[30px] text-[var(--synapse-text-muted)] italic text-md">
                        No recent notifications
                      </div>
                    )}
                  </div>
                </div>

                <div className="h-px bg-[var(--synapse-border)]" />

                {/* Section 3: Posts & Updates - With Carousel */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-[var(--synapse-text-muted)] uppercase tracking-wider"><b>Posts & Updates</b>
                    </h3>
                    {/* Dots for posts */}
                    {totalPostSlides > 1 && (
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(totalPostSlides, 4) }).map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setPostSlideIndex(idx)}
                            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                              postSlideIndex === idx
                                ? 'bg-blue-500 w-3'
                                : 'bg-[var(--synapse-text-muted)] opacity-40 hover:opacity-70'
                            }`}
                          />
                        ))}
                        {totalPostSlides > 4 && (
                          <span className="text-xs text-[var(--synapse-text-muted)] ml-1">
                            +{totalPostSlides - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="min-h-[80px]">
                    {postsActivities.length > 0 ? (
                      <div className="flex items-center gap-2">
                        {/* Left Arrow */}
                        <button
                          onClick={() => setPostSlideIndex(prev => prev > 0 ? prev - 1 : totalPostSlides - 1)}
                          className={`p-2 rounded-full bg-[var(--synapse-surface-hover)] hover:bg-[var(--synapse-border)] transition-colors flex-shrink-0 ${
                            totalPostSlides <= 1 ? 'opacity-30 cursor-not-allowed' : ''
                          }`}
                          disabled={totalPostSlides <= 1}
                        >
                          <ChevronLeft className="w-5 h-5 text-[var(--synapse-text-muted)]" />
                        </button>
                        
                        {/* Post Content - Shifted right */}
                        <div className="flex-1 ml-2">
                          <AnimatePresence mode="wait">
                            <motion.div
                              key={postSlideIndex}
                              initial={{ opacity: 0, x: 30 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -30 }}
                              transition={{ duration: 0.25 }}
                            >
                              <ActivityItem {...postsActivities[postSlideIndex]} />
                            </motion.div>
                          </AnimatePresence>
                        </div>
                        
                        {/* Right Arrow */}
                        <button
                          onClick={() => setPostSlideIndex(prev => (prev + 1) % totalPostSlides)}
                          className={`p-2 rounded-full bg-[var(--synapse-surface-hover)] hover:bg-[var(--synapse-border)] transition-colors flex-shrink-0 ${
                            totalPostSlides <= 1 ? 'opacity-30 cursor-not-allowed' : ''
                          }`}
                          disabled={totalPostSlides <= 1}
                        >
                          <ChevronRight className="w-5 h-5 text-[var(--synapse-text-muted)]" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-[80px] text-[var(--synapse-text-muted)] italic text-sm">
                        No posts yet
                      </div>
                    )}
                  </div>
                  {hasNext && (
                    <div ref={observerTarget} className="flex justify-center py-2">
                      {loadingMore && <Loader2 className="w-5 h-5 animate-spin text-[var(--synapse-text-muted)]" />}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Live Presence Card */}
        <div className="w-[420px] flex-shrink-0 hidden lg:block">
          <LivePresence />
        </div>
      </div>
    </div>
  );
}
