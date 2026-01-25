import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useSocketStore, Notification } from '@/store/socketStore';
import { Play, Radio, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { storyAPI, notificationAPI } from '@/lib/api';

interface Story {
  _id: string;
  user: {
    _id: string;
    username: string;
    avatar?: string;
  };
  createdAt: string;
}

interface Reel {
  _id: string;
  user: {
    _id: string;
    username: string;
    avatar?: string;
  };
  caption?: string;
  createdAt: string;
}

interface Activity {
  _id: string;
  type: string;
  fromUser?: {
    username: string;
    avatar?: string;
  };
  createdAt: string;
}

const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
};

export default function LiveOrbitPanel() {
  const { user } = useAuthStore();
  const { socket } = useSocketStore();
  const navigate = useNavigate();
  const [liveStories, setLiveStories] = useState<Story[]>([]);
  const [reelsNow, setReelsNow] = useState<Reel[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  // Listen for real-time notifications and update activities
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification: Notification) => {
      // Add to activities in real-time
      if (['like', 'comment', 'follow', 'post', 'reel', 'story'].includes(notification.type)) {
        setActivities(prev => [{
          _id: notification._id,
          type: notification.type,
          fromUser: notification.fromUser,
          createdAt: notification.createdAt
        }, ...prev].slice(0, 8));
      }

      // If it's a reel notification, add to reels
      if (notification.type === 'reel' && notification.reel) {
        setReelsNow(prev => [{
          _id: notification.reel || notification._id,
          user: notification.fromUser as any,
          createdAt: notification.createdAt
        }, ...prev].slice(0, 5));
      }

      // If it's a story notification, add to stories
      if (notification.type === 'story' && notification.story) {
        setLiveStories(prev => [{
          _id: notification.story || notification._id,
          user: notification.fromUser as any,
          createdAt: notification.createdAt
        }, ...prev].slice(0, 5));
      }
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [socket]);

  useEffect(() => {
    if (!user) return;

    const fetchLiveData = async () => {
      try {
        setLoading(true);

        // Fetch live stories
        try {
          const storiesRes = await storyAPI.getStoryFeed();
          const storiesData = storiesRes.data?.data || [];
          // Flatten grouped stories and take most recent 5
          const flatStories: Story[] = storiesData
            .flatMap((group: any) =>
              group.stories?.map((story: any) => ({
                ...story,
                user: group.user || story.user
              })) || []
            )
            .sort((a: Story, b: Story) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
            .slice(0, 5);
          setLiveStories(flatStories);
        } catch (err) {
          console.error('Failed to fetch stories:', err);
        }

        // Fetch recent reels from notifications
        try {
          const notificationsRes = await notificationAPI.getNotifications();
          const notifications = notificationsRes.data?.data || [];
          const reelNotifications = notifications
            .filter((n: any) => n.type === 'reel' && n.reel)
            .slice(0, 5)
            .map((n: any) => ({
              _id: n.reel?._id || n._id,
              user: n.fromUser || { username: 'Unknown', avatar: null },
              createdAt: n.createdAt
            }));
          setReelsNow(reelNotifications);
        } catch (err) {
          console.error('Failed to fetch reels:', err);
        }

        // Fetch recent activity (notifications)
        try {
          const notificationsRes = await notificationAPI.getNotifications();
          const notifications = notificationsRes.data?.data || [];
          const recentActivities = notifications
            .filter((n: any) => ['like', 'comment', 'follow', 'post', 'reel', 'story'].includes(n.type))
            .slice(0, 8)
            .map((n: any) => ({
              _id: n._id,
              type: n.type,
              fromUser: n.fromUser,
              createdAt: n.createdAt
            }));
          setActivities(recentActivities);
        } catch (err) {
          console.error('Failed to fetch activities:', err);
        }
      } catch (err) {
        console.error('Failed to fetch live data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLiveData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchLiveData, 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user) return null;

  return (
    <aside className="h-full bg-[#0b0c10] border-l border-r border-[rgba(168,85,247,0.15)] overflow-y-auto sticky top-0">
      <div className="p-5 space-y-6">
        {/* Header - Aligned with Feed header */}
        <div className="flex items-center gap-2 pb-4 border-b border-[rgba(168,85,247,0.1)]">
          <Radio className="w-6 h-6 text-[#a855f7] animate-pulse shrink-0" />
          <h2 className="text-lg font-bold text-[#e5e7eb] uppercase tracking-wider">LIVE ORBIT</h2>
        </div>

        {/* 1. Live Stories - Vertical Stack */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
            <h3 className="text-base font-semibold text-[#9ca3af] uppercase tracking-wider">STORIES — LIVE</h3>
          </div>
          {loading ? (
            <div className="text-sm text-[#6b7280] py-2">Loading...</div>
          ) : liveStories.length > 0 ? (
            <div className="space-y-1.5">
              <AnimatePresence>
                {liveStories.map((story) => (
                  <motion.div
                    key={story._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="glass-card rounded-md p-2.5 hover:border-[rgba(168,85,247,0.3)] transition-all cursor-pointer group"
                  >
                    <Link
                      to={`/profile/${story.user.username}`}
                      className="flex items-center gap-2.5"
                    >
                      <div className="relative shrink-0">
                        <div className="w-9 h-9 rounded-full bg-[#a855f7] flex items-center justify-center overflow-hidden ring-2 ring-[#a855f7] ring-offset-1 ring-offset-[#0b0c10] group-hover:ring-[#c084fc] transition-colors">
                          <img
                            src={story.user.avatar || "/default-avatar.jpg"}
                            alt={story.user.username}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0b0c10]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-base font-medium text-[#e5e7eb] truncate group-hover:text-[#a855f7] transition-colors">
                          {story.user.username}
                        </div>
                        <div className="text-sm text-[#6b7280]">
                          {formatTimeAgo(new Date(story.createdAt))}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="text-sm text-[#6b7280] py-2 px-2">No live stories</div>
          )}
        </div>

        {/* 2. Reels Now - Auto-Updating Queue */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <Play className="w-5 h-5 text-[#06b6d4] shrink-0" />
            <h3 className="text-base font-semibold text-[#9ca3af] uppercase tracking-wider">REELS — NOW</h3>
          </div>
          {loading ? (
            <div className="text-sm text-[#6b7280] py-2">Loading...</div>
          ) : reelsNow.length > 0 ? (
            <div className="space-y-1.5">
              <AnimatePresence>
                {reelsNow.map((reel) => (
                  <motion.div
                    key={reel._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="glass-card rounded-md p-2.5 hover:border-[rgba(6,182,212,0.3)] transition-all cursor-pointer group"
                    onClick={() => navigate('/reels')}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-[#a855f7] flex items-center justify-center overflow-hidden shrink-0">
                        <img
                          src={reel.user?.avatar || "/default-avatar.jpg"}
                          alt={reel.user?.username || 'Unknown'}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-base font-medium text-[#e5e7eb] truncate group-hover:text-[#06b6d4] transition-colors">
                          ▶ {reel.user?.username || 'Someone'} {reel.caption ? 'started a reel' : 'uploaded'}
                        </div>
                        <div className="text-sm text-[#6b7280]">
                          {formatTimeAgo(new Date(reel.createdAt))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="text-sm text-[#6b7280] py-2 px-2">No reels now</div>
          )}
        </div>

        {/* 3. Orbit Activity Stream - Ambient Awareness */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-5 h-5 text-[#6b7280] shrink-0" />
            <h3 className="text-base font-semibold text-[#6b7280] uppercase tracking-wider">IN YOUR ORBIT</h3>
          </div>
          {loading ? (
            <div className="text-sm text-[#6b7280] py-2">Loading...</div>
          ) : activities.length > 0 ? (
            <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
              <AnimatePresence>
                {activities.map((activity) => {
                  const getActivityText = () => {
                    const username = activity.fromUser?.username || 'Someone';
                    switch (activity.type) {
                      case 'like':
                        return `${username} liked a post`;
                      case 'comment':
                        return `${username} commented`;
                      case 'follow':
                        return `${username} joined ORBIT`;
                      case 'post':
                        return `${username} posted`;
                      case 'reel':
                        return `${username} shared a reel`;
                      case 'story':
                        return `${username} added a story`;
                      default:
                        return 'New activity';
                    }
                  };

                  return (
                    <motion.div
                      key={activity._id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-sm text-[#6b7280] px-2 py-1.5 rounded hover:bg-[rgba(168,85,247,0.05)] hover:text-[#9ca3af] transition-colors leading-relaxed"
                    >
                      <span className="text-[#4b5563] mr-1.5">•</span> {getActivityText()}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ) : (
            <div className="text-sm text-[#6b7280] py-2 px-2">No recent activity</div>
          )}
        </div>

      </div>
    </aside>
  );
}

