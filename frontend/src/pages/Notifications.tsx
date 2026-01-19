import { useState, useEffect } from 'react';
import { Heart, User, MessageCircle, Check, Trash2, UserPlus, UserCheck } from 'lucide-react';
import { cn } from '@/components/ui/Button';
import { api } from '@/lib/axios';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';

export default function NotificationsPage() {
    const { user: currentUser } = useAuthStore();
    const { fetchUnreadCount, resetCount } = useNotificationStore();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [following, setFollowing] = useState<Set<string>>(new Set());
    const [loadingStates, setLoadingStates] = useState<Set<string>>(new Set());

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const { data } = await api.get('/notification');
                const notifs = data.data || [];
                setNotifications(notifs);
                
                // Check follow status for all users in notifications
                if (currentUser?._id && notifs.length > 0) {
                    const followChecks = await Promise.all(
                        notifs
                            .filter((n: any) => n.type === 'follow' && n.fromUser?._id)
                            .map(async (notif: any) => {
                                try {
                                    const { data: followData } = await api.get(`/user/${notif.fromUser._id}/followers`);
                                    const followers = followData.data?.followers || followData.data || [];
                                    const isFollowing = followers.some((f: any) => {
                                        const followerId = f.follower?._id || f.follower || f._id;
                                        return followerId === currentUser._id || followerId?.toString() === currentUser._id?.toString();
                                    });
                                    return { userId: notif.fromUser._id, isFollowing };
                                } catch {
                                    return { userId: notif.fromUser._id, isFollowing: false };
                                }
                            })
                    );
                    
                    const followingSet = new Set<string>();
                    followChecks.forEach(({ userId, isFollowing }) => {
                        if (isFollowing) followingSet.add(userId);
                    });
                    setFollowing(followingSet);
                }
            } catch (error) {
                console.error("Failed to fetch notifications", error);
            } finally {
                setLoading(false);
            }
        };
        fetchNotifications();
        
        // Refresh unread count after fetching notifications
        fetchUnreadCount();
    }, [currentUser?._id, fetchUnreadCount]);

    const handleMarkAsRead = async () => {
        try {
            await api.put('/notification/read');
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            resetCount(); // Reset unread count in store
            toast.success('All notifications marked as read');
        } catch (error) {
            toast.error('Failed to mark as read');
        }
    };

    const handleDeleteAll = async () => {
        if (!confirm('Are you sure you want to delete all notifications?')) return;
        try {
            await api.delete('/notification/delete');
            setNotifications([]);
            resetCount(); // Reset unread count in store
            toast.success('All notifications deleted');
        } catch (error) {
            toast.error('Failed to delete notifications');
        }
    };

    const handleFollow = async (userId: string) => {
        if (loadingStates.has(userId)) return;
        
        setLoadingStates(prev => new Set(prev).add(userId));
        try {
            const { data } = await api.post(`/user/${userId}/follow`);
            const followingStatus = data.data?.following ?? false;
            
            setFollowing(prev => {
                const newSet = new Set(prev);
                if (followingStatus) {
                    newSet.add(userId);
                } else {
                    newSet.delete(userId);
                }
                return newSet;
            });
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to follow/unfollow user');
        } finally {
            setLoadingStates(prev => {
                const newSet = new Set(prev);
                newSet.delete(userId);
                return newSet;
            });
        }
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="pb-20 md:pb-0 px-4 md:px-6 max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
                {notifications.length > 0 && (
                    <div className="flex gap-2">
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAsRead}
                                className="px-4 py-2 bg-black text-white rounded-lg text-base font-semibold hover:bg-gray-800 transition-colors flex items-center gap-2"
                            >
                                <Check size={16} />
                                Mark all read
                            </button>
                        )}
                        <button
                            onClick={handleDeleteAll}
                            className="px-4 py-2 bg-red-50 text-red-500 rounded-lg text-base font-semibold hover:bg-red-100 transition-colors flex items-center gap-2"
                        >
                            <Trash2 size={16} />
                            Delete all
                        </button>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="text-center py-20">
                    <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-gray-500">Loading notifications...</p>
                </div>
            ) : notifications.length === 0 ? (
                <div className="text-center py-20 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                    <Bell size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-xl font-medium text-gray-900 mb-2">No notifications yet</p>
                    <p className="text-base text-gray-500">When you get notifications, they'll appear here.</p>
                </div>
            ) : (
                <div className="space-y-2">
                {notifications.map((notif: any) => (
                    <div
                        key={notif._id}
                        className={cn(
                            "flex items-center gap-4 p-4 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer bg-white border border-gray-200",
                            !notif.isRead && "bg-purple-50/50 border-purple-100"
                        )}
                    >
                        <div className="relative flex-shrink-0">
                            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200">
                                <img
                                    src={notif.fromUser?.avatar || `https://ui-avatars.com/api/?name=${notif.fromUser?.username}`}
                                    alt={notif.fromUser?.username}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div
                                className={cn(
                                    "absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white",
                                    notif.type === 'like'
                                        ? 'bg-red-500'
                                        : notif.type === 'follow'
                                        ? 'bg-blue-500'
                                        : 'bg-green-500'
                                )}
                            >
                                {notif.type === 'like' && <Heart size={12} fill="currentColor" />}
                                {notif.type === 'follow' && <User size={12} fill="currentColor" />}
                                {notif.type === 'comment' && <MessageCircle size={12} fill="currentColor" />}
                            </div>
                        </div>

                        <div className="flex-1 min-w-0">
                            <p className="text-base text-gray-900">
                                <span className="font-semibold mr-1">{notif.fromUser?.username || 'Someone'}</span>
                                <span className="text-gray-600">
                                    {notif.type === 'like' && 'liked your post'}
                                    {notif.type === 'follow' && 'started following you'}
                                    {notif.type === 'comment' && 'commented on your post'}
                                </span>
                            </p>
                            <span className="text-sm text-gray-500">
                                {new Date(notif.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                        {notif.type === 'follow' ? (
                            <button 
                                onClick={() => handleFollow(notif.fromUser._id)}
                                disabled={loadingStates.has(notif.fromUser._id)}
                                className={cn(
                                    "px-4 py-1.5 rounded-lg text-base font-semibold transition-colors flex-shrink-0 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed",
                                    following.has(notif.fromUser._id)
                                        ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                        : "bg-black text-white hover:bg-gray-800"
                                )}
                            >
                                {loadingStates.has(notif.fromUser._id) ? (
                                    '...'
                                ) : following.has(notif.fromUser._id) ? (
                                    <>
                                        <UserCheck size={16} />
                                        Following
                                    </>
                                ) : (
                                    <>
                                        <UserPlus size={16} />
                                        Follow
                                    </>
                                )}
                            </button>
                        ) : (
                            <Link
                                to={notif.post ? `/post/${notif.post}` : notif.reel ? `/reel/${notif.reel}` : '#'}
                                className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200"
                            >
                                <img
                                    src={`https://picsum.photos/100/100?random=${notif._id}`}
                                    className="w-full h-full object-cover"
                                    alt="Post"
                                />
                            </Link>
                        )}
                    </div>
                ))}
                </div>
            )}
        </div>
    );
}
