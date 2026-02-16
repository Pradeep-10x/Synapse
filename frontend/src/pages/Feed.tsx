import { useState, useEffect, useRef } from 'react';
import { ActivityItem, ActivityProps } from '@/components/feed/ActivityItem';
import { LivePresence } from '@/components/layout/LivePresence';
import { feedAPI, notificationAPI, communityPostAPI } from '@/lib/api';
import { useSocketStore } from '@/store/socketStore';
import { useAuthStore } from '@/store/authStore';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';

const TWO_MINUTES = 2 * 60 * 1000; // 2 minutes in milliseconds
const FIVE_MINUTES = 5 * 60 * 1000; // 5 minutes in milliseconds

// Load persisted realtime items from localStorage, filtering expired ones
const loadPersistedRealtime = (key: string, ttl: number): ActivityProps[] => {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    const items = JSON.parse(stored) as any[];
    const now = Date.now();
    return items.filter((item: any) => now - item.originalTimestamp < ttl);
  } catch {
    return [];
  }
};

export default function FeedPage() {
  const [activities, setActivities] = useState<ActivityProps[]>([]);
  const [realtimeNotifications, setRealtimeNotifications] = useState<ActivityProps[]>(() => loadPersistedRealtime('orbit_rt_notifs', TWO_MINUTES));
  const [realtimePosts, setRealtimePosts] = useState<ActivityProps[]>(() => loadPersistedRealtime('orbit_rt_posts', FIVE_MINUTES));
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const [postSlideIndex, setPostSlideIndex] = useState(0);
  const observerTarget = useRef<HTMLDivElement>(null);
  const { socket } = useSocketStore();
  const { user } = useAuthStore();

  // Persist realtime state to localStorage
  useEffect(() => {
    localStorage.setItem('orbit_rt_notifs', JSON.stringify(realtimeNotifications));
  }, [realtimeNotifications]);

  useEffect(() => {
    localStorage.setItem('orbit_rt_posts', JSON.stringify(realtimePosts));
  }, [realtimePosts]);

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
      const communityName = post.community?.name 
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
      communityId: post.community?._id || null,
      id: post._id,
      originalTimestamp: new Date(post.createdAt).getTime(),
      isRealtime: false
    } as any;
  };

  const generateActivityKey = (activity: ActivityProps) => {
    // Create a unique key based on content, user, and target ID to dedup between socket and DB
    const targetId = activity.postId || activity.communityId || '';
    const user = activity.user?.name || '';
    const text = activity.content.text || '';
    return `${user}-${text}-${targetId}`;
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
      case 'community_like':
        text = notif.message || 'liked a community post';
        type = 'event';
        break;
      case 'community_comment':
        text = notif.message || 'commented on a community post';
        type = 'event';
        break;
      case 'community_post':
        text = notif.message || 'posted in a community';
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
      postId: notif.post || notif.reel || notif.communityPost || notif.community || null,
      communityId: notif.community || null,
      id: notif._id,
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

  // Remove realtime community posts after 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setRealtimePosts(prev => {
        const stillFresh = prev.filter((post: any) => now - post.originalTimestamp < FIVE_MINUTES);
        // Reset slide index if posts were removed
        if (stillFresh.length < prev.length) {
          setPostSlideIndex(idx => Math.min(idx, Math.max(0, stillFresh.length - 1)));
        }
        return stillFresh;
      });
    }, 30000); // Check every 30 seconds

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

      // Fetch community posts and notifications only on first load
      if (pageNum === 1) {
        // Fetch community posts from joined communities
        try {
          const communityResponse = await communityPostAPI.getJoinedFeed(1, 20);
          const communityPosts = communityResponse.data.data?.posts || [];
          const communityActivities = communityPosts.map(mapPostToActivity);
          newActivities = [...newActivities, ...communityActivities];
        } catch (err) {
          console.error('Failed to load community posts', err);
        }

        // Fetch notifications
        try {
          const notifResponse = await notificationAPI.getNotifications();
          const notifications = notifResponse.data.data || [];
          
          const now = Date.now();
          const freshNotifications: ActivityProps[] = [];
          const oldNotifications: ActivityProps[] = [];

          notifications.forEach((n: any) => {
            const timestamp = new Date(n.createdAt).getTime();
            if (now - timestamp < TWO_MINUTES) {
              freshNotifications.push(mapNotificationToActivity(n, true));
            } else {
              oldNotifications.push(mapNotificationToActivity(n, false));
            }
          });

          // Add fresh ones to realtime state
          if (freshNotifications.length > 0) {
            setRealtimeNotifications(prev => {
              // Deduplicate using robust composite key
              const existingKeys = new Set(prev.map(p => generateActivityKey(p)));
              const uniqueFresh = freshNotifications.filter(n => !existingKeys.has(generateActivityKey(n)));
              return [...uniqueFresh, ...prev];
            });
          }

          newActivities = [...newActivities, ...oldNotifications];
        } catch (err) {
          console.error('Failed to load notifications', err);
        }
      }

      // Deduplicate by postId (in case a community post also appears in regular feed)
      const seen = new Set<string>();
      newActivities = newActivities.filter((a: any) => {
        if (!a.postId) return true; // keep notifications without postId
        if (seen.has(a.postId)) return false;
        seen.add(a.postId);
        return true;
      });

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
      // Regular post from followed user
      if (data?.post && data.post.user?._id !== user._id && data.post.user !== user._id) {
        const newActivity = mapPostToActivity(data.post);
        setActivities(prev => [newActivity, ...prev]);
      }
    };
    
    const handleCommunityPost = (data: any) => {
      // Community post — add to realtimePosts (expires after 5 min)
      if (data?.post && data.post.user?._id !== user._id && data.post.author?._id !== user._id) {
        const newActivity = mapPostToActivity(data.post);
        (newActivity as any).isRealtimePost = true;
        setRealtimePosts(prev => [newActivity, ...prev]);
        
        // Also add to realtime notifications if it has activity data
        if (data.activity) {
          const notifActivity = {
            type: 'event',
            timestamp: format(new Date(data.activity.createdAt), 'HH:mm'),
            user: {
              name: data.activity.user.username,
              avatar: data.activity.user.avatar
            },
            content: {
              text: 'posted in',
              highlight: data.activity.community?.name || ''
            },
            postId: data.post._id,
            communityId: data.activity.community?.id || data.post.community?._id || data.post.community || null,
            originalTimestamp: new Date(data.activity.createdAt).getTime(),
            isRealtime: true
          } as any;
          setRealtimeNotifications(prev => [notifActivity, ...prev]);
        }
      }
    };

    const handleNewNotification = (notif: any) => {
      if (notif.fromUser?._id !== user._id && notif.fromUser !== user._id) {
        const newActivity = mapNotificationToActivity(notif, true);
        setRealtimeNotifications(prev => [newActivity, ...prev]);
      }
    };
    
    const handleCommunityActivity = (data: any) => {
      // Handle likes and comments from community
      // Ignore if I am the author of the post (I will get a specific notification:new event instead)
      if (data?.post?.author?._id === user._id || data?.post?.user?._id === user._id) {
        return;
      }

      if (data?.activity && data.activity.user.username !== user.username) {
        const notifActivity = {
          type: 'event',
          timestamp: format(new Date(data.activity.createdAt), 'HH:mm'),
          user: {
            name: data.activity.user.username,
            avatar: data.activity.user.avatar
          },
          content: {
            text: data.activity.message + (data.activity.community?.name ? ' in' : ''),
            highlight: data.activity.community?.name || ''
          },
          postId: data.activity.postId || data.postId,
          communityId: data.activity.community?.id || data.community?._id || null,
          originalTimestamp: new Date(data.activity.createdAt).getTime(),
          isRealtime: true
        } as any;
        setRealtimeNotifications(prev => {
          const key = generateActivityKey(notifActivity);
          const existingKeys = new Set(prev.map(p => generateActivityKey(p)));
          if (existingKeys.has(key)) return prev;
          return [notifActivity, ...prev];
        });
      }
    };

    // Friend joined a community
    const handleFriendJoined = (data: any) => {
      if (data?.activity && data.user?._id !== user._id) {
        const notifActivity = {
          type: 'join',
          timestamp: format(new Date(data.activity.createdAt), 'HH:mm'),
          user: {
            name: data.user.username,
            avatar: data.user.avatar
          },
          content: {
            text: 'joined',
            highlight: data.community?.name || 'a community'
          },
          postId: data.community?._id || data.activity.community?.id || 'community',
          communityId: data.community?._id || data.activity.community?.id || null,
          originalTimestamp: new Date(data.activity.createdAt).getTime(),
          isRealtime: true
        } as any;
        setRealtimeNotifications(prev => [notifActivity, ...prev]);
      }
    };

    // Friend created a community
    const handleFriendCreated = (data: any) => {
      if (data?.activity && data.user?._id !== user._id) {
        const notifActivity = {
          type: 'event',
          timestamp: format(new Date(data.activity.createdAt), 'HH:mm'),
          user: {
            name: data.user.username,
            avatar: data.user.avatar
          },
          content: {
            text: 'created a new community',
            highlight: data.community?.name || ''
          },
          postId: data.community?._id || data.activity.community?.id || 'community',
          communityId: data.community?._id || data.activity.community?.id || null,
          originalTimestamp: new Date(data.activity.createdAt).getTime(),
          isRealtime: true
        } as any;
        setRealtimeNotifications(prev => [notifActivity, ...prev]);
      }
    };

    // Someone joined my community
    const handleMemberJoined = (data: any) => {
      if (data?.activity && data.user?._id !== user._id) {
        const notifActivity = {
          type: 'join',
          timestamp: format(new Date(data.activity.createdAt), 'HH:mm'),
          user: {
            name: data.user?.username || data.activity.user.username,
            avatar: data.user?.avatar || data.activity.user.avatar
          },
          content: {
            text: data.activity.message + ' in',
            highlight: data.community?.name || data.activity.community?.name || ''
          },
          postId: data.community?._id || data.activity.community?.id || 'community',
          communityId: data.community?._id || data.activity.community?.id || null,
          originalTimestamp: new Date(data.activity.createdAt).getTime(),
          isRealtime: true
        } as any;
        setRealtimeNotifications(prev => [notifActivity, ...prev]);
      }
    };

    socket.on('post:new', handleNewPost);
    socket.on('notification:new', handleNewNotification);
    
    // Community events
    socket.on('community:post:new', handleCommunityPost);
    socket.on('community:post:liked', handleCommunityActivity);
    socket.on('community:comment:new', handleCommunityActivity);
    
    // Friend/member events
    socket.on('friend:joined:community', handleFriendJoined);
    socket.on('friend:created:community', handleFriendCreated);
    socket.on('community:member:joined', handleMemberJoined);

    return () => {
      socket.off('post:new', handleNewPost);
      socket.off('notification:new', handleNewNotification);
      socket.off('community:post:new', handleCommunityPost);
      socket.off('community:post:liked', handleCommunityActivity);
      socket.off('community:comment:new', handleCommunityActivity);
      socket.off('friend:joined:community', handleFriendJoined);
      socket.off('friend:created:community', handleFriendCreated);
      socket.off('community:member:joined', handleMemberJoined);
    };
  }, [socket, user]);

  // Separate notifications from posts for recent section
  const recentNotifications = activities.filter((a: any) => a.type !== 'post').slice(0, 4);
  // Merge fetched posts with realtime community posts, deduplicate, sort by time
  const fetchedPosts = activities.filter((a: any) => a.type === 'post');
  const allPosts = [...realtimePosts, ...fetchedPosts];
  const seenPostIds = new Set<string>();
  const postsActivities = allPosts.filter((a: any) => {
    if (!a.postId) return true;
    if (seenPostIds.has(a.postId)) return false;
    seenPostIds.add(a.postId);
    return true;
  }).sort((a: any, b: any) => b.originalTimestamp - a.originalTimestamp);

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
    <div className="animate-in fade-in duration-500 lg:px-24 xl:px-0">
      {/* Page Header */}
      <div className="mb-4 sm:mb-8 pt-2">
        <h1 className="text-sm font-medium text-[var(--synapse-text-muted)] tracking-widest uppercase mb-1">
          Live Status: <span className="text-green-500 font-semibold">Active</span> • Real-time Feed
        </h1>
      </div>

      {/* Live Presence — horizontal strip above Activity on small screens (<1024px) */}
      <div className="lg:hidden">
        <LivePresence compact />
      </div>

      {/* Main Content - Activity Card + Live Presence side by side */}
      <div className="flex gap-4 sm:gap-6 items-stretch">
        {/* Main Activity Card */}
        <div className="flex-1 min-w-0 bg-[var(--synapse-surface)] border border-[var(--synapse-border)] rounded-[var(--radius-lg)] overflow-hidden shadow-sm">
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-[var(--synapse-border)] bg-[rgba(255,255,255,0.02)] flex justify-between items-center">
            <h2 className="font-semibold text-xl text-[var(--synapse-text)]">Activity Stream</h2>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs text-[var(--synapse-text-muted)] font-mono">LIVE</span>
            </div>
          </div>

          <div className="py-2 px-4 sm:px-6 pb-10 space-y-2">
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
                            className={`dot-btn w-1.5 h-1.5 rounded-full transition-all duration-300 ${
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
                            className={`dot-btn w-1.5 h-1.5 rounded-full transition-all duration-300 ${
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
                            className={`dot-btn w-1.5 h-1.5 rounded-full transition-all duration-300 ${
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
                  <div className="min-h-[80px] overflow-hidden">
                    {postsActivities.length > 0 ? (
                      <div className="relative cursor-grab active:cursor-grabbing select-none">
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.div
                            key={postSlideIndex}
                            initial={{ opacity: 0, x: 80 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -80 }}
                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={0.15}
                            onDragEnd={(_e, info) => {
                              const threshold = 50;
                              if (info.offset.x < -threshold && totalPostSlides > 1) {
                                setPostSlideIndex(prev => (prev + 1) % totalPostSlides);
                              } else if (info.offset.x > threshold && totalPostSlides > 1) {
                                setPostSlideIndex(prev => prev > 0 ? prev - 1 : totalPostSlides - 1);
                              }
                            }}
                          >
                            <ActivityItem {...postsActivities[postSlideIndex]} />
                          </motion.div>
                        </AnimatePresence>
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

        {/* Live Presence Card — shrinks from 420→220px between 1920→1710px viewport, then Activity card shrinks */}
        <div className="hidden lg:block flex-shrink-0" style={{ width: 'clamp(300px, calc(95vw - 1404px), 420px)' }}>
          <LivePresence />
        </div>
      </div>
    </div>
  );
}
