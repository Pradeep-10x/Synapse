import { useState, useEffect } from 'react';
import { Search as SearchIcon, UserPlus, UserCheck } from 'lucide-react';
import { api } from '@/lib/axios';
import { Link } from 'react-router-dom';
import { cn } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'react-hot-toast';

export default function SearchPage() {
    const { user: currentUser } = useAuthStore();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [following, setFollowing] = useState<Set<string>>(new Set());
    const [loadingStates, setLoadingStates] = useState<Set<string>>(new Set());

    // Fetch initial suggestions and check follow status
    useEffect(() => {
        const fetchSuggestions = async () => {
            try {
                const { data } = await api.get('/user/search?query=a');
                const users = data.data?.slice(0, 5) || [];
                setSuggestions(users);

                // Check which users are already being followed
                if (currentUser?._id) {
                    const followChecks = await Promise.all(
                        users.map(async (user: any) => {
                            try {
                                const { data: followData } = await api.get(`/user/${user._id}/followers`);
                                const followers = followData.data?.followers || [];
                                const isFollowing = followers.some((f: any) =>
                                    f.follower?._id === currentUser._id || f.follower === currentUser._id
                                );
                                return { userId: user._id, isFollowing };
                            } catch {
                                return { userId: user._id, isFollowing: false };
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
                console.error("Failed to fetch suggestions");
            }
        };
        fetchSuggestions();
    }, [currentUser?._id]);

    // Debounce search and check follow status
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.trim().length > 1) {
                setLoading(true);
                try {
                    const { data } = await api.get(`/user/search?query=${query}`);
                    const users = data.data || [];
                    setResults(users);

                    // Check which users are already being followed
                    if (currentUser?._id && users.length > 0) {
                        const followChecks = await Promise.all(
                            users.map(async (user: any) => {
                                try {
                                    const { data: followData } = await api.get(`/user/${user._id}/followers`);
                                    const followers = followData.data?.followers || [];
                                    const isFollowing = followers.some((f: any) =>
                                        f.follower?._id === currentUser._id || f.follower === currentUser._id
                                    );
                                    return { userId: user._id, isFollowing };
                                } catch {
                                    return { userId: user._id, isFollowing: false };
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
                    console.error("Search failed", error);
                } finally {
                    setLoading(false);
                }
            } else {
                setResults([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query, currentUser?._id]);

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

    return (
        <div className="pb-20 md:pb-0 px-4 md:px-6 max-w-4xl mx-auto">
            {/* Search Bar */}
            <div className="sticky top-0 bg-white/80 backdrop-blur-xl z-10 py-6 mb-4 border-b border-gray-100 rounded-b-3xl -mx-4 md:-mx-6 px-4 md:px-6">
                <div className="relative group">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" size={20} />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search people..."
                        className="w-full bg-gray-100/50 border-none pl-12 pr-4 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 transition-all text-gray-900 placeholder:text-gray-400"
                    />
                </div>
            </div>

            <div className="space-y-8">
                {/* Search Results */}
                {query.trim().length > 1 ? (
                    <div>
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 ml-1">Search Results</h3>
                        {loading ? (
                            <div className="text-center py-10 text-gray-500">Searching...</div>
                        ) : results.length > 0 ? (
                            <div className="space-y-3">
                                {results.map((user: any) => {
                                    const isFollowing = following.has(user._id);
                                    return (
                                        <div key={user._id} className="flex items-center justify-between p-4 bg-white/60 backdrop-blur-sm border border-white/20 rounded-2xl hover:bg-white/80 transition-all group shadow-sm">
                                            <Link to={`/profile/${user.username}`} className="flex items-center gap-4 flex-1">
                                                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white ring-1 ring-gray-100">
                                                    <img
                                                        src={user.avatar || `https://ui-avatars.com/api/?name=${user.username}`}
                                                        className="w-full h-full object-cover"
                                                        alt={user.username}
                                                    />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-900 leading-tight">@{user.username}</h4>
                                                    <p className="text-base text-gray-500">{user.fullName || 'No name'}</p>
                                                </div>
                                            </Link>
                                            <button
                                                onClick={() => handleFollow(user._id)}
                                                disabled={loadingStates.has(user._id)}
                                                className={cn(
                                                    "p-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
                                                    isFollowing ? "bg-gray-100 text-gray-900" : "bg-black text-white"
                                                )}
                                            >
                                                {loadingStates.has(user._id) ? '...' : isFollowing ? <UserCheck size={20} /> : <UserPlus size={20} />}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                                <p className="text-gray-400 font-medium whitespace-pre-line">
                                    No users found for<br /><span className="text-gray-900 font-bold">"{query}"</span>
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Suggestions Section (Show when no search) */
                    <div>
                        <div className="flex items-center justify-between mb-4 px-1">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Suggested for you</h3>
                        </div>
                        <div className="space-y-3">
                            {suggestions.map((user: any) => {
                                const isFollowing = following.has(user._id);
                                return (
                                    <div key={user._id} className="flex items-center justify-between p-4 bg-white/60 backdrop-blur-sm border border-white/20 rounded-2xl hover:bg-white/80 transition-all shadow-sm">
                                        <Link to={`/profile/${user.username}`} className="flex items-center gap-4 flex-1">
                                            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white ring-1 ring-gray-100">
                                                <img
                                                    src={user.avatar || `https://ui-avatars.com/api/?name=${user.username}`}
                                                    className="w-full h-full object-cover"
                                                    alt={user.username}
                                                />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900 leading-tight">@{user.username}</h4>
                                                <p className="text-sm text-gray-500">{user.fullName || 'No name'}</p>
                                            </div>
                                        </Link>
                                        <button
                                            onClick={() => handleFollow(user._id)}
                                            disabled={loadingStates.has(user._id)}
                                            className={cn(
                                                "p-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
                                                isFollowing ? "bg-gray-100 text-gray-900" : "bg-black text-white"
                                            )}
                                        >
                                            {loadingStates.has(user._id) ? '...' : isFollowing ? <UserCheck size={20} /> : <UserPlus size={20} />}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Explore Grid (only show if no search) */}
                {query.trim().length <= 1 && (
                    <div className="pt-4">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 px-1">Discover</h3>
                        <div className="grid grid-cols-3 gap-2">
                            {[...Array(9)].map((_, i) => (
                                <div
                                    key={i}
                                    className={`aspect-square bg-gray-100 relative group overflow-hidden cursor-pointer rounded-2xl shadow-sm ${i % 5 === 0 ? 'col-span-2 row-span-2' : ''
                                        }`}
                                >
                                    <img
                                        src={`https://picsum.photos/400/400?random=${i + 200}`}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        alt="Explore"
                                    />
                                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-300" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
