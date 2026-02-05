import { useEffect } from 'react';
import { useSocketStore } from '@/store/socketStore';
import { useAuthStore } from '@/store/authStore';
import { userAPI } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';



export function LivePresence() {
    const { onlineUsers, recentlyActive, setRecentlyActive } = useSocketStore();
    const { user: currentUser } = useAuthStore();

    // Convert Map to array, exclude current user, and take first 5
    const onlineUsersList = Array.from(onlineUsers.entries())
        .map(([id, data]) => ({ id, ...data }))
        .filter(user => user.id !== currentUser?._id)
        .slice(0, 5);

    const onlineCount = Math.max(0, onlineUsers.size - (onlineUsers.has(currentUser?._id || '') ? 1 : 0));

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

        // Refresh every minute
        const interval = setInterval(fetchRecentlyActive, 60000);
        return () => clearInterval(interval);
    }, []);

    // Convert Map to array and sort by lastActive
    const recentlyActiveList = Array.from(recentlyActive.values())
        .filter(user => user._id !== currentUser?._id && !onlineUsers.has(user._id))
        .sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime())
        .slice(0, 5);

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
                            <div className="flex items-center -space-x-2">
                                {onlineUsersList.map((user) => (
                                    <div key={user.id} className="relative group">
                                        <img
                                            src={user.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop"}
                                            alt={user.username}
                                            className="w-12 h-12 rounded-full border-2 border-[var(--synapse-surface)] object-cover scale-110"
                                            title={user.username}
                                        />
                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-black rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                                        </div>
                                    </div>
                                ))}
                                {onlineCount > 5 && (
                                    <div className="w-12 h-12 rounded-full border-2 border-[var(--synapse-surface)] bg-[var(--synapse-surface-hover)] flex items-center justify-center text-xs font-semibold text-[var(--synapse-text-muted)] z-10">
                                        +{onlineCount - 5}
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
                                    <motion.div
                                        key={user._id}
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
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
