import { useEffect, useState } from 'react';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { Link } from 'react-router-dom';
import { cn } from '@/components/ui/Button';
import { toast } from 'react-hot-toast';

export default function RightSidebar() {
    const { user: currentUser } = useAuthStore();
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [following, setFollowing] = useState<Set<string>>(new Set());
    const [loadingStates, setLoadingStates] = useState<Set<string>>(new Set());

    useEffect(() => {
        const fetchSuggestions = async () => {
            try {
                const { data } = await api.get('/user/search?query=a');
                const users = data.data?.slice(0, 3) || [];
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
        <div className="hidden lg:block w-80 h-screen fixed right-0 top-0 p-6 bg-white z-40 border-l border-gray-200 overflow-y-auto">

            {/* Suggestions Section */}
            <div className="mb-8">
                <h3 className="font-bold text-gray-900 mb-4 text-lg">Suggestions</h3>
                <div className="space-y-4">
                    {suggestions.length > 0 ? (
                        suggestions.map((suggestion) => {
                            const isFollowing = following.has(suggestion._id);
                            return (
                                <div key={suggestion._id} className="flex items-center justify-between">
                                    <Link to={`/profile/${suggestion.username}`} className="flex items-center gap-3 flex-1">
                                        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200">
                                            <img
                                                src={suggestion.avatar || `https://ui-avatars.com/api/?name=${suggestion.username}`}
                                                alt={suggestion.username}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <span className="font-medium text-sm text-gray-900">{suggestion.username}</span>
                                    </Link>
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleFollow(suggestion._id);
                                        }}
                                        disabled={loadingStates.has(suggestion._id)}
                                        className={cn(
                                            "px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                                            isFollowing
                                                ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                                : "bg-black text-white hover:bg-gray-800"
                                        )}
                                    >
                                        {loadingStates.has(suggestion._id) ? '...' : isFollowing ? 'Following' : 'Follow'}
                                    </button>
                                </div>
                            );
                        })
                    ) : (
                        <>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="w-10 h-10 rounded-full bg-gray-200" />
                                    <span className="font-medium text-sm text-gray-900">Nick Shelburne</span>
                                </div>
                                <button className="bg-black text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-800 transition-colors">
                                    Follow
                                </button>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="w-10 h-10 rounded-full bg-gray-200" />
                                    <span className="font-medium text-sm text-gray-900">Brittni Lando</span>
                                </div>
                                <button className="bg-black text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-800 transition-colors">
                                    Follow
                                </button>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="w-10 h-10 rounded-full bg-gray-200" />
                                    <span className="font-medium text-sm text-gray-900">Ivan Shevchenko</span>
                                </div>
                                <button className="bg-black text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-800 transition-colors">
                                    Follow
                                </button>
                            </div>
                        </>
                    )}
                    <Link to="/suggestions" className="text-sm text-gray-600 hover:text-gray-900 font-medium">
                        See all
                    </Link>
                </div>
            </div>

        </div>
    );
}
