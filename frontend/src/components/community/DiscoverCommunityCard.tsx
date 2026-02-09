import { BarChart2, Users, Loader2 } from 'lucide-react';


interface DiscoverCommunityCardProps {
    community: {
        _id: string;
        name: string;
        description: string;
        membersCount: number;
        coverImage?: string;
        avatar?: string;
    };
    onJoin: (id: string) => void;
    isJoining: boolean;
    onView: (community: any) => void;
}

export function DiscoverCommunityCard({ community, onJoin, isJoining, onView }: DiscoverCommunityCardProps) {
   
    const { _id, name, membersCount, coverImage } = community;

    // Generate a predictable gradient based on name char codes if no image
    const seed = name.charCodeAt(0) % 5;
    const gradients = [
        'from-blue-600/20 to-purple-900/40',
        'from-emerald-600/20 to-teal-900/40',
        'from-amber-600/20 to-orange-900/40',
        'from-rose-600/20 to-pink-900/40',
        'from-indigo-600/20 to-violet-900/40',
    ];
    const bgGradient = gradients[seed];

    return (
        <div
            className="group relative h-60 rounded-[var(--radius-sm)] overflow-hidden border border-[var(--synapse-border)] bg-[var(--synapse-surface)] hover:border-[var(--synapse-text-muted)] transition-all duration-300 shadow-sm hover:shadow-md"
        >
            {/* Background Image / Gradient */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                {coverImage ? (
                    <img
                        src={coverImage}
                        alt={name}
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-70 group-hover:scale-105 transition-all duration-700 ease-out"
                    />
                ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${bgGradient}`} />
                )}
                {/* Dark Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            </div>

            {/* Content */}
            <div className="absolute inset-0 z-10 p-5 flex flex-col justify-between">
                {/* Header (Icon + Name + Members) */}
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                        {/* Icon placeholder (mocked logic or real avatar) */}
                        <div className="w-8 h-8 rounded-md bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 text-white/90">
                            {community.avatar ? (
                                <img src={community.avatar} alt={name} className="w-full h-full object-cover rounded-md" />
                            ) : (
                                <BarChart2 className="w-4 h-4" />
                            )}
                        </div>
                        <div className="flex flex-col">
                            <h3 
                                onClick={() => onView(community)}
                                className="text-lg font-semibold text-white tracking-wide group-hover:text-white/100 transition-colors drop-shadow-sm cursor-pointer hover:underline decoration-white/30 underline-offset-4"
                            >
                                {name}
                            </h3>
                            <p className="text-xs text-white/60 line-clamp-1 max-w-[150px]">{community.description}</p>
                        </div>
                    </div>
                    
                    {/* Members Count Badge */}
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/10 backdrop-blur-sm border border-white/10 text-white/80 text-xs font-medium">
                        <Users className="w-3 h-3" />
                        {membersCount?.toLocaleString() || 0}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-end justify-between">
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 text-xs font-medium text-white/90">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            Active Community
                        </div>
                    </div>
                    
                    {/* Join Button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onJoin(_id);
                        }}
                        disabled={isJoining}
                        className="px-4 py-1.5 bg-[var(--synapse-blue)] hover:bg-[var(--synapse-blue)]/90 text-white text-xs font-semibold rounded-[var(--radius-md)] transition-colors shadow-lg shadow-purple-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isJoining ? (
                            <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Joining...
                            </>
                        ) : (
                            'Join Domain'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
