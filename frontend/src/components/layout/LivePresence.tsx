import { } from 'lucide-react';

const ONLINE_USERS = [
    'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop',
    'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop',
];

const RECENT_ACTIVITY = [
    { name: 'Alex', time: '2 min ago', avatar: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100&h=100&fit=crop' },
    { name: 'Maya', time: '5 min ago', avatar: 'https://images.unsplash.com/photo-1438761681033-540607524143?w=100&h=100&fit=crop' },
    { name: 'Justin', time: '10 min ago', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop' },
    { name: 'Sarah', time: '1h ago', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop' },
];

export function LivePresence() {
    return (
        <aside className="hidden xl:flex w-[280px] flex-col gap-6 p-6 h-screen overflow-y-auto bg-[var(--synapse-bg)] border-l border-[var(--synapse-border)] fixed right-0 top-0 z-50">

            {/* Header */}
            <h3 className="text-sm font-semibold text-[var(--synapse-text-muted)] tracking-wide">Live Presence</h3>

            {/* Online Users */}
            <div className="space-y-3">
                <div className="flex items-center -space-x-2">
                    {ONLINE_USERS.map((src, i) => (
                        <img
                            key={i}
                            src={src}
                            alt="Online user"
                            className="w-10 h-10 rounded-full border-2 border-[var(--synapse-bg)] object-cover"
                        />
                    ))}
                </div>
                <div className="flex justify-between items-center text-xs text-[var(--synapse-text-muted)] mt-2">
                    <span className="font-medium">ONLINE NOW</span>
                    <span className="font-mono">13</span>
                </div>
            </div>

            <div className="h-px bg-[var(--synapse-border)]" />

            {/* Recent Activity */}
            <div className="space-y-4">
                <h4 className="text-xs font-medium text-[var(--synapse-text-muted)] uppercase tracking-wider">Recently Active</h4>
                <div className="space-y-4">
                    {RECENT_ACTIVITY.map((user) => (
                        <div key={user.name} className="flex items-center gap-3">
                            <div className="relative">
                                <img
                                    src={user.avatar}
                                    alt={user.name}
                                    className="w-8 h-8 rounded-full object-cover opacity-80"
                                />
                                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#404040] rounded-full border-2 border-[var(--synapse-bg)]"></div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-[var(--synapse-text)]">{user.name}</span>
                                <span className="text-xs text-[var(--synapse-text-muted)] mono">{user.time}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </aside>
    );
}
