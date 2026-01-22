import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useSocketStore, Notification } from '@/store/socketStore';
import { Users, MessageSquare, UserPlus, Bell, TrendingUp, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { notificationAPI } from '@/lib/api';

interface CommunityActivity {
  _id: string;
  type: 'new_post' | 'new_member' | 'comment' | 'trending' | 'announcement';
  community: {
    name: string;
    id: string;
  };
  user?: {
    username: string;
    avatar?: string;
  };
  message: string;
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

const getActivityIcon = (type: CommunityActivity['type']) => {
  switch (type) {
    case 'new_post':
      return <MessageSquare className="w-4 h-4 text-[#a855f7]" />;
    case 'new_member':
      return <UserPlus className="w-4 h-4 text-[#06b6d4]" />;
    case 'comment':
      return <MessageSquare className="w-4 h-4 text-[#22d3ee]" />;
    case 'trending':
      return <TrendingUp className="w-4 h-4 text-[#f59e0b]" />;
    case 'announcement':
      return <Bell className="w-4 h-4 text-[#ef4444]" />;
    default:
      return <Zap className="w-4 h-4 text-[#a855f7]" />;
  }
};

export default function CommunityLiveOrbitPanel() {
  const { user } = useAuthStore();
  const { socket } = useSocketStore();
  const [activities, setActivities] = useState<CommunityActivity[]>([]);
  const [loading, setLoading] = useState(true);

  // Listen for real-time community notifications
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification: Notification) => {
      // Check if it's a community-related notification
      // For now, we'll add all notifications as community activities for demo
      // In production, you'd filter by notification.community
      const activityType = notification.type === 'comment' ? 'comment' 
        : notification.type === 'follow' ? 'new_member'
        : notification.type === 'post' ? 'new_post'
        : 'new_post';

      const getActivityMessage = () => {
        switch (notification.type) {
          case 'comment': return 'commented on a post';
          case 'follow': return 'joined the community';
          case 'post': return 'shared a new post';
          case 'like': return 'liked a post';
          default: return 'new activity';
        }
      };

      const newActivity: CommunityActivity = {
        _id: notification._id,
        type: activityType as CommunityActivity['type'],
        community: { name: 'Community', id: '' },
        user: notification.fromUser,
        message: getActivityMessage(),
        createdAt: notification.createdAt
      };

      setActivities(prev => [newActivity, ...prev].slice(0, 8));
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [socket]);

  useEffect(() => {
    if (!user) return;
    
    const fetchCommunityActivities = async () => {
      try {
        setLoading(true);
        // Fetch notifications that are community-related
        const response = await notificationAPI.getNotifications();
        const notifications = response.data?.data || [];
        
        // Filter and transform community-related notifications
        const communityActivities = notifications
          .filter((n: any) => n.community || n.type === 'community')
          .slice(0, 8)
          .map((n: any) => ({
            _id: n._id,
            type: n.type || 'new_post',
            community: n.community || { name: 'Community', id: '' },
            user: n.fromUser,
            message: n.message || 'New activity',
            createdAt: n.createdAt,
          }));
        
        setActivities(communityActivities);
      } catch (error) {
        console.error('Failed to fetch community activities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCommunityActivities();
    // Refresh every 30 seconds
    const interval = setInterval(fetchCommunityActivities, 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user) return null;

  return (
    <aside className="h-full bg-[#0b0c10] border-l border-r border-[rgba(168,85,247,0.15)] overflow-y-auto sticky top-0">
      <div className="p-5 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2 pb-4 border-b border-[rgba(168,85,247,0.1)]">
          <Users className="w-6 h-6 text-[#a855f7] shrink-0" />
          <h2 className="text-lg font-bold text-[#e5e7eb] uppercase tracking-wider">COMMUNITY HUB</h2>
        </div>

        {/* Recent Activity */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
            <h3 className="text-base font-semibold text-[#9ca3af] uppercase tracking-wider">LIVE ACTIVITY</h3>
          </div>
          
          {loading ? (
            <div className="text-sm text-[#6b7280] py-2">Loading...</div>
          ) : activities.length > 0 ? (
            <div className="space-y-2">
              <AnimatePresence>
                {activities.map((activity) => (
                  <motion.div
                    key={activity._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="glass-card rounded-md p-3 hover:border-[rgba(168,85,247,0.3)] transition-all cursor-pointer group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-[#e5e7eb]">
                          {activity.user && (
                            <Link
                              to={`/profile/${activity.user.username}`}
                              className="font-medium hover:text-[#a855f7] transition-colors"
                            >
                              {activity.user.username}
                            </Link>
                          )}
                          {activity.user && ' '}
                          <span className="text-[#9ca3af]">{activity.message}</span>
                        </div>
                        <div className="text-xs text-[#6b7280] mt-1">
                          in <span className="text-[#a855f7]">{activity.community.name}</span>
                          {' · '}
                          {formatTimeAgo(new Date(activity.createdAt))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="text-sm text-[#6b7280] py-2 px-2">No recent activity</div>
          )}
        </div>

        {/* Trending Communities - will be populated from API */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-[#f59e0b] shrink-0" />
            <h3 className="text-base font-semibold text-[#9ca3af] uppercase tracking-wider">TRENDING</h3>
          </div>
          <div className="space-y-2">
            <div className="text-sm text-[#6b7280] py-2 px-2">
              Join communities to see trending topics
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-[#9ca3af] uppercase tracking-wider">QUICK ACTIONS</h3>
          <div className="space-y-2">
            <button className="w-full glass-card rounded-md p-3 hover:border-[rgba(168,85,247,0.3)] transition-all text-left flex items-center gap-3">
              <Users className="w-5 h-5 text-[#a855f7]" />
              <span className="text-sm text-[#e5e7eb]">Create Community</span>
            </button>
            <button className="w-full glass-card rounded-md p-3 hover:border-[rgba(168,85,247,0.3)] transition-all text-left flex items-center gap-3">
              <Bell className="w-5 h-5 text-[#06b6d4]" />
              <span className="text-sm text-[#e5e7eb]">Community Notifications</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
