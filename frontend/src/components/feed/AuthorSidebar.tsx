import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { postAPI } from '@/lib/api';
import { Loader2, ArrowRight, Heart } from 'lucide-react';

interface AuthorSidebarProps {
    user: {
        _id: string;
        username: string;
        fullName?: string;
        avatar?: string;
        isVerified?: boolean;
    };
    currentPostId: string;
    createdAt: string;
}

interface Post {
    _id: string;
    mediaUrl: string;
    mediaType: 'image' | 'video';
    createdAt: string;
    likesCount: number;
}

const formatDistanceToNow = (date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return `${Math.floor(diffInSeconds / 604800)}w ago`;
};

export default function AuthorSidebar({ user, currentPostId, createdAt }: AuthorSidebarProps) {
    const [recentPosts, setRecentPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRecentPosts = async () => {
            try {
                setLoading(true);
                const response = await postAPI.getUserPosts(user._id);
                const posts = response.data.data || [];
                // Filter out current post and take top 4
                const filtered = posts
                    .filter((p: any) => p._id !== currentPostId)
                    .slice(0, 4);
                setRecentPosts(filtered);
            } catch (error) {
                console.error('Failed to fetch user posts:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchRecentPosts();
    }, [user._id, currentPostId]);

    return (
        <div className="space-y-6">
            {/* Author Profile Card */}
            <div className="bg-[var(--synapse-surface)] border border-[var(--synapse-border)] rounded-[var(--radius-md)] p-5 shadow-sm">
                <div className="flex flex-col items-center text-center">
                    <Link to={`/profile/${user.username}`} className="relative group">
                        <div className="w-20 h-20 rounded-full bg-[var(--synapse-surface-hover)] border-2 border-[var(--synapse-surface)] ring-1 ring-[var(--synapse-border)] overflow-hidden mb-3 group-hover:ring-[var(--synapse-blue)] transition-all">
                            <img
                                src={user.avatar || "/default-avatar.jpg"}
                                alt={user.username}
                                className="w-full h-full object-cover scale-110"
                            />
                        </div>
                        {user.isVerified && (
                            <div className="absolute bottom-3 right-0 bg-[var(--synapse-blue)] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border-2 border-[var(--synapse-surface)]">
                                PRO
                            </div>
                        )}
                    </Link>

                    <Link
                        to={`/profile/${user.username}`}
                        className="text-2xl font-bold text-[var(--synapse-text)] hover:text-[var(--synapse-blue)] transition-colors mb-0.5"
                    >
                        {user.fullName || user.username}
                    </Link>

                    {user.fullName && (
                        <p className="text-base text-[var(--synapse-text-muted)] mb-1">@{user.username}</p>
                    )}

                    <p className="text-sm text-[var(--synapse-text-muted)] mb-5">
                        Posted {formatDistanceToNow(new Date(createdAt))}
                    </p>

                    <Link
                        to={`/profile/${user.username}`}
                        className="w-full py-2.5 bg-[var(--synapse-surface-hover)] hover:bg-[var(--synapse-border)] text-[var(--synapse-text)] text-sm font-semibold rounded-[var(--radius-sm)] transition-colors border border-[var(--synapse-border)] flex items-center justify-center gap-2"
                    >
                        <ArrowRight className="w-4 h-4" />
                        View Full Profile
                    </Link>
                </div>
            </div>

            {/* More Posts Section */}
            {loading ? (
                <div className="bg-[var(--synapse-surface)] border border-[var(--synapse-border)] rounded-[var(--radius-md)] p-4 flex justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-[var(--synapse-text-muted)]" />
                </div>
            ) : recentPosts.length > 0 && (
                <div className="bg-[var(--synapse-surface)] border border-[var(--synapse-border)] rounded-[var(--radius-md)] overflow-hidden">
                    <div className="p-4 border-b border-[var(--synapse-border)] flex items-center justify-between">
                        <h3 className="text-base font-semibold text-[var(--synapse-text)]">More from {user.username}</h3>
                        <Link to={`/profile/${user.username}`} className="text-xs text-[var(--synapse-blue)] hover:underline">
                            View All
                        </Link>
                    </div>
                    <div className="grid grid-cols-2 gap-px bg-[var(--synapse-border)]">
                        {recentPosts.map((post) => (
                            <Link
                                key={post._id}
                                to={`/post/${post._id}`}
                                className="aspect-square bg-[var(--synapse-surface)] relative group overflow-hidden"
                            >
                                {post.mediaType === 'image' ? (
                                    <img
                                        src={post.mediaUrl}
                                        alt="Post thumbnail"
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                ) : (
                                    <video
                                        src={post.mediaUrl}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                )}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <div className="flex items-center gap-1 text-white font-bold text-sm">
                                        <Heart className="w-4 h-4 fill-white" />
                                        <span>{post.likesCount}</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
