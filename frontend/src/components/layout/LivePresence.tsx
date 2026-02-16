import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSocketStore, RecentlyActiveUser } from '@/store/socketStore';
import { useAuthStore } from '@/store/authStore';
import { userAPI } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';



interface LivePresenceProps {
    compact?: boolean;
}

export function LivePresence({ compact = false }: LivePresenceProps) {
    const { onlineUsers, recentlyActive, setRecentlyActive } = useSocketStore();
    const { user: currentUser } = useAuthStore();
    const [, setTick] = useState(0); // Force re-render for time updates
    const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());

    // Fetch followed users on mount
    useEffect(() => {
        const fetchFollowing = async () => {
            if (!currentUser?._id) return;
            try {
                const response = await userAPI.getFollowing(currentUser._id, 1, 1000);
                
                const data = response.data.data;
                const followingList = data.following || [];
                const ids = new Set<string>();
                
                if (Array.isArray(followingList)) {
                     followingList.forEach((item: any) => {
                         // item is a Follow document with populated 'following' field
                         if (item.following?._id) {
                              ids.add(item.following._id);
                         } else if (item.following && typeof item.following === 'string') {
                             ids.add(item.following);
                         }
                     });
                }
                setFollowedIds(ids);

            } catch (error) {
                console.error('Failed to fetch following list:', error);
            }
        };

        fetchFollowing();
    }, [currentUser?._id]);

    // Convert Map to array, exclude current user, and take first 5
    // FILTER: Only show users present in "followedIds"
    const onlineUsersList = Array.from(onlineUsers.entries())
        .map(([id, data]) => ({ id, ...data }))
        .filter(user => user.id !== currentUser?._id && followedIds.has(user.id))
        .slice(0, 5);

    // Filter count as well
    const onlineFollowedCount = Array.from(onlineUsers.keys())
        .filter(id => id !== currentUser?._id && followedIds.has(id))
        .length;

    const onlineCount = onlineFollowedCount;

    useEffect(() => {
        const fetchRecentlyActive = async () => {
            try {
                const response = await userAPI.getRecentlyActive();
                setRecentlyActive(response.data.data || []);
            } catch (error) {
                console.error('Failed to fetch recently active users:', error);
            }
        };

        fetchRecentlyActive();

        // Refresh data every 30 seconds
        const fetchInterval = setInterval(fetchRecentlyActive, 30000);
        
        // Update displayed time every 30 seconds
        const tickInterval = setInterval(() => setTick(t => t + 1), 30000);
        
        return () => {
            clearInterval(fetchInterval);
            clearInterval(tickInterval);
        };
    }, []);

    // Convert Map to array and sort by lastActive
    // Backend now already filters recently active by followed, so we just filter specific online dupes
    const recentlyActiveList = Array.from(recentlyActive.values())
        .filter((user: RecentlyActiveUser) => user._id !== currentUser?._id && !onlineUsers.has(user._id))
        .sort((a: RecentlyActiveUser, b: RecentlyActiveUser) => new Date(b.lastActive || 0).getTime() - new Date(a.lastActive || 0).getTime())
        .slice(0, 5);

    if (compact) {
        return (
            <div className="bg-[var(--synapse-surface)] border border-[var(--synapse-border)] rounded-md p-3 shadow-sm mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  
                    <span className="text-sm font-semibold text-[var(--synapse-text)] tracking-tight">Live Now</span>
                    <span className="hidden sm:inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
                        {onlineCount} Online
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex -space-x-4">
                        {onlineUsersList.map((user) => (
                            <Link to={`/profile/${user.username}`} key={user.username} className="relative group">
                                <img
                                    src={user.avatar || "/default-avatar.jpg"}
                                    alt={user.username}
                                    className="w-10 h-10 rounded-full border-2 border-[var(--synapse-surface)] object-cover ring-2 ring-[var(--synapse-bg)] hover:scale-110 hover:z-10 transition-transform duration-200"
                                    title={user.username}
                                />
                            </Link>
                        ))}
                        {onlineCount > 5 && (
                            <div className="w-12 h-12 rounded-full border-2 border-[var(--synapse-surface)] bg-[var(--synapse-surface-hover)] flex items-center justify-center text-xs font-bold text-[var(--synapse-text-muted)] ring-2 ring-[var(--synapse-bg)]">
                                +{onlineCount - 5}
                            </div>
                        )}
                        {onlineUsersList.length === 0 && (
                            <span className="text-xs text-[var(--synapse-text-muted)] italic">No active users</span>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[var(--synapse-surface)] border border-[var(--synapse-border)] rounded-lg overflow-hidden shadow-sm h-full flex flex-col">
            {/* Header */}
            <div className="px-6 py-5 border-b border-[var(--synapse-border)]">
                <h3 className="text-lg font-semibold text-[var(--synapse-text)]">Live Presence</h3>
            </div>

            <div className="p-6 space-y-6 flex-1">
                {/* Online Users */}
                <div className="space-y-4">
                    {onlineUsersList.length > 0 ? (
                        <>
                            <div className="flex flex-wrap gap-4">
                                {onlineUsersList.map((user) => (
                                    <Link to={`/profile/${user.username}`} key={user.username} className="relative group flex flex-col items-center">
                                        <div className="relative">
                                            <img
                                                src={user.avatar || "/default-avatar.jpg"}
                                                alt={user.username}
                                                className="w-12 h-12 rounded-full border-2 border-[var(--synapse-surface)] object-cover hover:scale-105 transition-transform"
                                                title={user.username}
                                            />
                                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-black rounded-full flex items-center justify-center z-10">
                                                <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                                            </div>
                                        </div>
                                        <span className="mt-1.5 text-md font-bold text-[var(--synapse-text-muted)] max-w-[60px] truncate text-center group-hover:text-[var(--synapse-text)] transition-colors">
                                            {user.username}
                                        </span>
                                    </Link>
                                ))}
                                {onlineCount > 5 && (
                                    <div className="flex flex-col items-center">
                                        <div className="w-12 h-12 rounded-full border-2 border-[var(--synapse-surface)] bg-[var(--synapse-surface-hover)] flex items-center justify-center text-xs font-semibold text-[var(--synapse-text-muted)]">
                                            +{onlineCount - 5}
                                        </div>
                                        <span className="mt-1.5 text-xs text-[var(--synapse-text-muted)]">more</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-between items-center text-sm text-[var(--synapse-text-muted)]">
                                <span className="font-medium flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    {onlineCount} ONLINE NOW
                                </span>
                            </div>
                        </>
                    ) : (
                        <div className="text-sm text-[var(--synapse-text-muted)] italic">
                            No one is Active right now...
                        </div>
                    )}
                </div>

                <div className="h-px bg-[var(--synapse-border)]" />

                {/* Recently Active */}
                {recentlyActiveList.length > 0 && (
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium text-[var(--synapse-text-muted)] uppercase tracking-wider">Recently Active</h4>
                        <div className="space-y-4">
                            <AnimatePresence>
                                {recentlyActiveList.map((user) => (
                                    <Link to={`/profile/${user.username}`}
                                        key={user.username}
                                        className="block"
                                    >
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        className="flex items-center gap-4 group cursor-pointer hover:bg-[var(--synapse-surface-hover)] p-2 -mx-2 rounded-lg transition-colors"
                                    >
                                        <div className="relative">
                                            <img
                                                src={user.avatar || "/default-avatar.jpg"}
                                                alt={user.username}
                                                className="w-11 h-11 rounded-full object-cover scale-110"
                                            />
                                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-gray-500 rounded-full border-2 border-[var(--synapse-surface)]"></div>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-base font-medium text-[var(--synapse-text)] group-hover:text-[var(--synapse-blue)] transition-colors">{user.username}</span>
                                            <span className="text-sm text-[var(--synapse-text-muted)]">
                                                {user.lastActive ? formatDistanceToNow(new Date(user.lastActive), { addSuffix: true }).replace('about ', '') : 'Offline'}
                                            </span>
                                        </div>
                                    </motion.div>
                                    </Link>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
