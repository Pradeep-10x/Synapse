export type ActivityType = 'system' | 'post' | 'join' | 'event' | 'create';

export interface ActivityProps {
    type: ActivityType;
    user?: {
        name: string;
        avatar?: string;
    };
    timestamp: string;
    content: {
        text: string;
        mediaUrl?: string; // For posts with images
        highlight?: string; // For key terms like "Tech Talk"
    };
}

export function ActivityItem({ type, user, timestamp, content }: ActivityProps) {
    return (
        <div className="group relative pl-10 py-4 border-l-2 border-[var(--synapse-border)] last:border-0 hover:bg-[var(--synapse-surface)] transition-colors duration-200 -ml-[1px]">

            {/* Timeline Dot by Type */}
            <div className={`absolute left-[-6px] top-7 w-3 h-3 rounded-full border-2 border-[var(--synapse-bg)] ${type === 'system' ? 'bg-amber-500' : 'bg-[var(--synapse-text-muted)] group-hover:bg-[var(--synapse-blue)]'} transition-colors duration-200`} />

            <div className="flex flex-col gap-3">
                {/* Header Line */}
                <div className="flex items-center gap-4 text-base">
                    <span className="font-mono text-sm text-[var(--synapse-text-muted)]">{timestamp}</span>

                    {user && (
                        <span className="font-semibold text-[var(--synapse-text)] text-base">
                            {user.name}
                        </span>
                    )}

                    <span className="text-[var(--synapse-text-muted)] text-base">
                        {type === 'system' && <span className="text-amber-500 font-medium mr-1">System Update:</span>}
                        {content.text}
                        {content.highlight && (
                            <span className="text-[var(--synapse-text)] font-medium ml-1">"{content.highlight}"</span>
                        )}
                    </span>
                </div>

                {/* Content Body (Media) */}
                {content.mediaUrl && (
                    <div className="mt-3 relative group-hover:scale-[1.01] transition-transform duration-300 ease-out">
                        <div className="aspect-[21/9] w-full max-w-3xl overflow-hidden rounded-lg border border-[var(--synapse-border)] relative">
                            <img
                                src={content.mediaUrl}
                                alt="Activity content"
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"></div>
                            <div className="absolute bottom-4 left-4 text-white font-semibold text-lg drop-shadow-md">
                                {content.highlight || 'Media Content'}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
