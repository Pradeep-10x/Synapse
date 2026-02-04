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
];

export function LivePresence() {
    return (
        <div className="bg-[var(--synapse-surface)] border border-[var(--synapse-border)] rounded-lg overflow-hidden shadow-sm h-full flex flex-col">
            {/* Header */}
            <div className="px-6 py-5 border-b border-[var(--synapse-border)]">
                <h3 className="text-lg font-semibold text-[var(--synapse-text)]">Live Presence</h3>
            </div>

            <div className="p-6 space-y-6 flex-1">
                {/* Online Users */}
                <div className="space-y-4">
                    <div className="flex items-center -space-x-2">
                        {ONLINE_USERS.map((src, i) => (
                            <img
                                key={i}
                                src={src}
                                alt="Online user"
                                className="w-12 h-12 rounded-full border-2 border-[var(--synapse-surface)] object-cover scale-110"
                            />
                        ))}
                    </div>
                    <div className="flex justify-between items-center text-sm text-[var(--synapse-text-muted)]">
                        <span className="font-medium">ONLINE NOW</span>
                    </div>
                </div>

                <div className="h-px bg-[var(--synapse-border)]" />

                {/* Recently Active */}
                <div className="space-y-4">
                    <h4 className="text-sm font-medium text-[var(--synapse-text-muted)] uppercase tracking-wider">Recently Active</h4>
                    <div className="space-y-4">
                        {RECENT_ACTIVITY.map((user) => (
                            <div key={user.name} className="flex items-center gap-4">
                                <div className="relative">
                                    <img
                                        src={user.avatar}
                                        alt={user.name}
                                        className="w-11 h-11 rounded-full object-cover scale-110"
                                    />
                                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[var(--synapse-surface)]"></div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-base font-medium text-[var(--synapse-text)]">{user.name}</span>
                                    <span className="text-sm text-[var(--synapse-text-muted)]">{user.time}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
