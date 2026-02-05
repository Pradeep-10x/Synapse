import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Heart, MessageCircle, UserPlus, Play, Image, Loader2, Trash2, CheckCheck } from 'lucide-react';
import { notificationAPI } from '@/lib/api';
import { useSocketStore, Notification } from '@/store/socketStore';
import { toast } from 'react-hot-toast';

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'like':
      return <Heart className="w-5 h-5 text-red-500" />;
    case 'comment':
      return <MessageCircle className="w-5 h-5 text-blue-500" />;
    case 'follow':
      return <UserPlus className="w-5 h-5 text-green-500" />;
    case 'reel':
      return <Play className="w-5 h-5 text-purple-500" />;
    case 'post':
    case 'story':
      return <Image className="w-5 h-5 text-yellow-500" />;
    default:
      return <Bell className="w-5 h-5 text-gray-500" />;
  }
};

const getNotificationMessage = (notification: Notification) => {
  const username = notification.fromUser?.username || 'Someone';
  switch (notification.type) {
    case 'like':
      return `${username} liked your ${notification.post ? 'post' : notification.reel ? 'reel' : 'story'}`;
    case 'comment':
      return `${username} commented on your ${notification.post ? 'post' : 'reel'}`;
    case 'follow':
      return `${username} started following you`;
    case 'post':
      return `${username} shared a new post`;
    case 'reel':
      return `${username} shared a new reel`;
    case 'story':
      return `${username} shared a new story`;
    default:
      return notification.message || 'New notification';
  }
};

const formatTime = (date: string) => {
  const now = new Date();
  const notifDate = new Date(date);
  const diffMs = now.getTime() - notifDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return notifDate.toLocaleDateString();
};

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const { notifications, setNotifications, markAllAsRead, clearNotifications } = useSocketStore();

  useEffect(() => {
    fetchNotifications();
    // Mark all as read on mount
    const markRead = async () => {
      try {
        await notificationAPI.markAsRead();
        markAllAsRead();
      } catch (error) {
        console.error('Failed to mark notifications as read:', error);
      }
    };
    markRead();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationAPI.getNotifications();
      setNotifications(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAsRead();
      markAllAsRead();
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark notifications as read');
    }
  };

  const handleClearAll = async () => {
    try {
      await notificationAPI.deleteNotifications();
      clearNotifications();
      toast.success('All notifications cleared');
    } catch (error) {
      toast.error('Failed to clear notifications');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Notifications</h1>
        <div className="flex gap-2">
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-[rgba(168,85,247,0.1)] rounded-lg transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Mark all read</span>
          </button>
          <button
            onClick={handleClearAll}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Clear all</span>
          </button>
        </div>
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Bell className="w-16 h-16 text-gray-600 mb-4" />
          <h2 className="text-xl font-semibold text-gray-400 mb-2">No notifications yet</h2>
          <p className="text-gray-500">When you get notifications, they'll show up here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification._id}
              className={`flex items-start gap-4 p-4 rounded-xl transition-colors ${notification.isRead
                ? 'bg-[rgba(168,85,247,0.05)]'
                : 'bg-[rgba(168,85,247,0.15)] border border-[rgba(168,85,247,0.3)]'
                } hover:bg-[rgba(168,85,247,0.2)]`}
            >
              {/* User Avatar */}
              <Link to={`/profile/${notification.fromUser?.username}`}>
                <img
                  src={notification.fromUser?.avatar || '/default-avatar.jpg'}
                  alt={notification.fromUser?.username}
                  className="w-12 h-12 rounded-full object-cover border-2 border-purple-500/30 scale-110"
                />
              </Link>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-gray-200">
                  <Link
                    to={`/profile/${notification.fromUser?.username}`}
                    className="font-semibold text-white hover:text-purple-400 transition-colors"
                  >
                    {notification.fromUser?.username}
                  </Link>{' '}
                  {getNotificationMessage(notification).replace(notification.fromUser?.username || '', '')}
                </p>
                <p className="text-sm text-gray-500 mt-1">{formatTime(notification.createdAt)}</p>
              </div>

              {/* Icon */}
              <div className="flex-shrink-0">
                {getNotificationIcon(notification.type)}
              </div>

              {/* Unread indicator */}
              {!notification.isRead && (
                <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
