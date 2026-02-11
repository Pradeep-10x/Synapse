import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bell, 
  Heart, 
  MessageCircle, 
  UserPlus, 
  Play, 
  Loader2,
  CheckCheck,
  Trash2,
  ChevronDown,
  Users
} from 'lucide-react';
import { notificationAPI } from '@/lib/api';
import { useSocketStore, Notification } from '@/store/socketStore';
import { toast } from 'react-hot-toast';

const getNotificationBadgeColor = (type: string) => {
  switch (type) {
    case 'like':
    case 'community_like':
      return 'bg-rose-500';
    case 'comment':
    case 'community_comment':
      return 'bg-blue-500';
    case 'follow':
      return 'bg-emerald-500';
    case 'reel':
      return 'bg-violet-500';
    case 'community_post':
      return 'bg-amber-500';
    default:
      return 'bg-gray-500';
  }
};

const getActionLabel = (type: string) => {
  switch (type) {
    case 'like':
      return 'Liked';
    case 'comment':
      return 'Commented';
    case 'follow':
      return 'Followed you';
    case 'post':
      return 'New post';
    case 'reel':
      return 'New reel';
    case 'community_like':
      return 'Community Like';
    case 'community_comment':
      return 'Community Comment';
    case 'community_post':
      return 'Community Post';
    default:
      return 'Notification';
  }
};

const formatTime = (date: string) => {
  const now = new Date();
  const notifDate = new Date(date);
  const diffMs = now.getTime() - notifDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return notifDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const { notifications, setNotifications, markAllAsRead, clearNotifications } = useSocketStore();

  useEffect(() => {
    const initNotifications = async () => {
      await fetchNotifications();
      try {
        await notificationAPI.markAsRead();
        markAllAsRead();
      } catch (error) {
        console.error('Failed to mark notifications as read:', error);
      }
    };
    initNotifications();
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
      toast.success('All marked as read');
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  };

  const handleClearAll = async () => {
    try {
      await notificationAPI.deleteNotifications();
      clearNotifications();
      toast.success('Notifications cleared');
    } catch (error) {
      toast.error('Failed to clear notifications');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--synapse-bg)]">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--synapse-text-muted)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--synapse-bg)]">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold tracking-wide text-[var(--synapse-text)]">
            NOTIFICATIONS
          </h1>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--synapse-text-muted)] hover:text-blue-400 hover:bg-blue-500/10 rounded-md transition-all"
              title="Mark all as read"
            >
              <CheckCheck className="w-4 h-4" />
              <span className="hidden md:inline">Read All</span>
            </button>
            <button
              onClick={handleClearAll}
              className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--synapse-text-muted)] hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-all"
              title="Delete all"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden md:inline">Delete</span>
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-[var(--synapse-border)] to-transparent mb-6" />

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Bell className="w-12 h-12 text-[var(--synapse-text-muted)] opacity-40 mb-4" />
            <p className="text-[var(--synapse-text-muted)]">No notifications</p>
          </div>
        ) : (
          <div className="space-y-1">
            {notifications.map((notification) => (
              <NotificationRow key={notification._id} notification={notification} />
            ))}
          </div>
        )}

        {/* Clear All Footer */}
        {notifications.length > 0 && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1 mt-8 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            Clear All
            <ChevronDown className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function NotificationRow({ notification }: { notification: Notification }) {
  const badgeColor = getNotificationBadgeColor(notification.type);
  const actionLabel = getActionLabel(notification.type);
  
  const getNotificationContent = () => {
    const username = notification.fromUser?.username || 'Someone';
    
    switch (notification.type) {
      case 'like':
        return (
          <>
            <span className="font-medium text-[var(--synapse-text)]">{username}</span>
            <span className="text-[var(--synapse-text-muted)]"> liked your post</span>
          </>
        );
      case 'comment':
        return (
          <>
            <span className="font-medium text-[var(--synapse-text)]">{username}</span>
            <span className="text-[var(--synapse-text-muted)]"> commented on your post</span>
            {notification.message && (
              <span className="text-[var(--synapse-text-muted)]">: "{notification.message}"</span>
            )}
          </>
        );
      case 'follow':
        return (
          <>
            <span className="font-medium text-[var(--synapse-text)]">{username}</span>
            <span className="text-[var(--synapse-text-muted)]"> followed you</span>
          </>
        );
      case 'post':
      case 'reel':
        return (
          <>
            <span className="font-medium text-[var(--synapse-text)]">{username}</span>
            <span className="text-[var(--synapse-text-muted)]"> shared a new {notification.type}</span>
          </>
        );
      case 'community_like':
        return (
          <>
            <span className="font-medium text-[var(--synapse-text)]">{username}</span>
            <span className="text-[var(--synapse-text-muted)]"> {notification.message || 'liked a community post'}</span>
          </>
        );
      case 'community_comment':
        return (
          <>
            <span className="font-medium text-[var(--synapse-text)]">{username}</span>
            <span className="text-[var(--synapse-text-muted)]"> {notification.message || 'commented on a community post'}</span>
          </>
        );
      case 'community_post':
        return (
          <>
            <span className="font-medium text-[var(--synapse-text)]">{username}</span>
            <span className="text-[var(--synapse-text-muted)]"> {notification.message || 'posted in a community'}</span>
          </>
        );
      default:
        return (
          <>
            <span className="font-medium text-[var(--synapse-text)]">{notification.message || 'New notification'}</span>
          </>
        );
    }
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'like':
      case 'community_like':
        return <Heart className="w-3.5 h-3.5 text-white" fill="currentColor" />;
      case 'comment':
      case 'community_comment':
        return <MessageCircle className="w-3.5 h-3.5 text-white" />;
      case 'follow':
        return <UserPlus className="w-3.5 h-3.5 text-white" />;
      case 'reel':
        return <Play className="w-3.5 h-3.5 text-white" fill="currentColor" />;
      case 'community_post':
        return <Users className="w-3.5 h-3.5 text-white" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-white" />;
    }
  };

  return (
    <div className={`group flex items-center gap-4 px-4 py-4 rounded-lg transition-colors hover:bg-[var(--synapse-surface)]/50 ${
      !notification.isRead ? 'bg-[var(--synapse-surface)]/30' : ''
    }`}>
      {/* Avatar with badge */}
      <Link to={`/profile/${notification.fromUser?.username}`} className="relative flex-shrink-0">
        <img
          src={notification.fromUser?.avatar || '/default-avatar.jpg'}
          alt=""
          className="w-11 h-11 rounded-full object-cover"
        />
        <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full ${badgeColor} flex items-center justify-center ring-2 ring-[var(--synapse-bg)]`}>
          {getIcon()}
        </div>
      </Link>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-relaxed">
          {getNotificationContent()}
        </p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-[var(--synapse-text-muted)]">
            {formatTime(notification.createdAt)}
          </span>
          <span className="text-xs text-[var(--synapse-text-muted)] opacity-60">
            {actionLabel}
          </span>
        </div>
      </div>

      {/* Thumbnail */}
      {notification.post && (
        <Link to={`/post/${notification.post}`} className="flex-shrink-0">
          <div className="w-16 h-16 rounded-lg bg-[var(--synapse-surface)] border border-[var(--synapse-border)] overflow-hidden group-hover:border-[var(--synapse-text-muted)]/30 transition-colors">
            <div className="w-full h-full bg-gradient-to-br from-[var(--synapse-surface)] to-[var(--synapse-border)] flex items-center justify-center">
              <Play className="w-5 h-5 text-[var(--synapse-text-muted)] opacity-50" />
            </div>
          </div>
        </Link>
      )}

      {/* Unread dot */}
      {!notification.isRead && (
        <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
      )}
    </div>
  );
}
