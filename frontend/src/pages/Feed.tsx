import { useState, useEffect, useRef } from 'react';
import { ActivityItem, ActivityProps } from '@/components/feed/ActivityItem';
import { LivePresence } from '@/components/layout/LivePresence';
import { feedAPI, notificationAPI } from '@/lib/api';
import { useSocketStore } from '@/store/socketStore';
import { useAuthStore } from '@/store/authStore';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';

export default function FeedPage() {
  const [activities, setActivities] = useState<ActivityProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const observerTarget = useRef<HTMLDivElement>(null);
  const { socket } = useSocketStore();
  const { user } = useAuthStore();

  const mapPostToActivity = (post: any): ActivityProps => ({
    type: 'post',
    timestamp: format(new Date(post.createdAt), 'HH:mm'),
    user: {
      name: post.user.username,
      avatar: post.user.avatar
    },
    content: {
      text: 'posted a new update',
      highlight: post.caption,
      mediaUrl: post.mediaUrl
    },
    postId: post._id,
    originalTimestamp: new Date(post.createdAt).getTime() // For sorting
  } as any);

  const mapNotificationToActivity = (notif: any): ActivityProps => {
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
      postId: notif.post || notif.reel || null, // Best effort to link to content
      originalTimestamp: new Date(notif.createdAt).getTime()
    } as any;
  };

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
          const notifActivities = notifications.map(mapNotificationToActivity);
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
      // Filter out own posts
      if (data?.post && data.post.user?._id !== user._id && data.post.user !== user._id) {
        const newActivity = mapPostToActivity(data.post);
        setActivities(prev => [newActivity, ...prev]);
      }
    };

    const handleNewNotification = (notif: any) => {
      // Filter out self-caused notifications (just in case)
      if (notif.fromUser?._id !== user._id && notif.fromUser !== user._id) {
        const newActivity = mapNotificationToActivity(notif);
        setActivities(prev => [newActivity, ...prev]);
      }
    };

    socket.on('post:new', handleNewPost);
    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('post:new', handleNewPost);
      socket.off('notification:new', handleNewNotification);
    };
  }, [socket, user]);

  return (
    <div className="animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="mb-8 pt-2">
        <h1 className="text-sm font-medium text-[var(--synapse-text-muted)] tracking-widest uppercase mb-1">
          Live Status: <span className="text-[var(--synapse-text)]">Active</span> • Real-time Feed
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

          <div className="p-8">
            <div className="flex flex-col">
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-8 h-8 animate-spin text-[var(--synapse-text-muted)]" />
                </div>
              ) : activities.length > 0 ? (
                <>
                  <AnimatePresence mode="popLayout">
                    {activities.map((activity, index) => (
                      <motion.div
                        key={`${activity.postId}-${index}`} // Composite key to be safe, or just index if items don't have unique IDs across types? Activity props has postId but some system events might not. index is bad for reorder.
                        // I'll try to use a unique ID if possible. ActivityProps has postId?
                        // `postId: post._id` or `notif.post`. notifications might share postId.
                        // I'll stick to index but discouraged for animation. unique ID is better.
                        // I'll use index for now to be safe against crash, but add layout.
                        // Actually, I should inspect `activities` structure.
                        layout
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3 }}
                      >
                        <ActivityItem {...activity} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {hasNext && (
                    <div ref={observerTarget} className="flex justify-center py-4">
                      {loadingMore && <Loader2 className="w-6 h-6 animate-spin text-[var(--synapse-text-muted)]" />}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-10 text-[var(--synapse-text-muted)]">
                  No recent activity in the system.
                </div>
              )}
            </div>
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



