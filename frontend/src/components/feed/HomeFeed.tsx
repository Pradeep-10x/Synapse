import { useEffect, useState } from 'react';
import PostCard from './PostCard';
import StoryRail from './StoryRail';
import { api } from '@/lib/axios';
import { cn } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { Link } from 'react-router-dom';
import { UserPlus, UserCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function HomeFeed() {
    const { user: currentUser } = useAuthStore();
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [following, setFollowing] = useState<Set<string>>(new Set());
    const [loadingStates, setLoadingStates] = useState<Set<string>>(new Set());

    const [activeTab, setActiveTab] = useState<'recents' | 'friends' | 'popular'>('friends');

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const { data } = await api.get('/feed');
                setPosts(data.data.posts || []);
            } catch (error) {
                console.error("Failed to fetch feed, using dummy data");
                // ... dummy data ...
                setPosts([
                    {
                        _id: '1',
                        user: { username: 'george_lobko', fullName: 'George Lobko', avatar: 'https://i.pravatar.cc/150?u=george' },
                        mediaUrl: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80', 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400&q=80', 'https://images.unsplash.com/photo-1464822759844-d150ad2996e1?w=400&q=80'],
                        mediaType: 'image',
                        caption: 'Hi everyone, today I was on the most beautiful mountain in the world, I also want to say hi to Silena, Olya and Davis! 🏔️',
                        likesCount: 6355,
                        commentsCount: 45,
                        viewsCount: 6355,
                        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
                    },
                    {
                        _id: '2',
                        user: { username: 'vitaliy_boyko', fullName: 'Vitaliy Boyko', avatar: 'https://i.pravatar.cc/150?u=vitaliy' },
                        mediaUrl: [],
                        mediaType: 'text',
                        caption: 'I chose a wonderful coffee today, I wanted to tell you what product they have in stock - it\'s a latte with coconut milk... delicious... it\'s really incredibly tasty!!! 🥥 🤤',
                        likesCount: 6355,
                        commentsCount: 12,
                        viewsCount: 6355,
                        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
                    }
                ]);
            } finally {
                setLoading(false);
            }
        };

        fetchPosts();
    }, []);

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

    const handlePostDelete = (deletedPostId: string) => {
        setPosts(prev => prev.filter(p => p._id !== deletedPostId));
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



    const tabs = [
        { id: 'recents', label: 'Recents' },
        { id: 'friends', label: 'Friends' },
        { id: 'popular', label: 'Popular' },
    ];

    return (
        <div className="pb-20 md:pb-0 px-4 md:px-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex gap-6 lg:gap-12">
                    {/* Left Column - Stories and Feeds */}
                    <div className="flex-1 max-w-3xl">
                        <StoryRail />

                        {/* Feeds Header */}
                        <div className="space-y-4 mb-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-3xl font-bold text-gray-900">Feeds</h2>
                            </div>
                            <div className="flex gap-2">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={cn(
                                            "px-4 py-2 rounded-full text-base font-medium transition-colors",
                                            activeTab === tab.id
                                                ? "bg-black text-white"
                                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                        )}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Posts */}
                        <div className="space-y-4">
                            {loading ? (
                                <div className="text-center py-20">
                                    <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                    <p className="text-base text-gray-500">Loading feed...</p>
                                </div>
                            ) : posts.length === 0 ? (
                                <div className="text-center py-20 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                                    <p className="text-xl font-medium text-gray-900 mb-2">No posts to display</p>
                                    <p className="text-base text-gray-500">When you follow people, their posts will appear here.</p>
                                </div>
                            ) : (
                                posts.map(post => (
                                    <PostCard
                                        key={post._id}
                                        post={post}
                                        onDelete={() => handlePostDelete(post._id)}
                                    />
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right Column - People You May Know */}
                    <div className="hidden lg:block w-80 flex-shrink-0 lg:ml-auto">
                        <div className="sticky top-20">
                            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                                <h3 className="text-xl font-bold text-gray-900 mb-4">People You May Know</h3>
                                <div className="space-y-4">
                                    {suggestions.length > 0 ? (
                                        suggestions.map((user: any) => {
                                            const isFollowing = following.has(user._id);
                                            return (
                                                <div key={user._id} className="flex items-center justify-between gap-3">
                                                    <Link 
                                                        to={`/profile/${user.username}`} 
                                                        className="flex items-center gap-3 flex-1 min-w-0"
                                                    >
                                                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200 flex-shrink-0">
                                                            <img
                                                                src={user.avatar || `https://ui-avatars.com/api/?name=${user.username}`}
                                                                alt={user.username}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-semibold text-base text-gray-900 truncate">
                                                                {user.fullName || user.username}
                                                            </h4>
                                                            <p className="text-sm text-gray-500 truncate">@{user.username}</p>
                                                        </div>
                                                    </Link>
                                                    <button
                                                        onClick={() => handleFollow(user._id)}
                                                        disabled={loadingStates.has(user._id)}
                                                        className={cn(
                                                            "p-2 rounded-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0",
                                                            isFollowing 
                                                                ? "bg-gray-100 text-gray-700 hover:bg-gray-200" 
                                                                : "bg-black text-white hover:bg-gray-800"
                                                        )}
                                                    >
                                                        {loadingStates.has(user._id) ? (
                                                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                        ) : isFollowing ? (
                                                            <UserCheck size={18} />
                                                        ) : (
                                                            <UserPlus size={18} />
                                                        )}
                                                    </button>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-center py-8 text-gray-500">
                                            <p className="text-base">No suggestions available</p>
                                        </div>
                                    )}
                                </div>
                                {suggestions.length > 0 && (
                                    <Link 
                                        to="/search" 
                                        className="block text-center mt-4 text-base text-gray-600 hover:text-gray-900 font-medium transition-colors"
                                    >
                                        See all suggestions
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
