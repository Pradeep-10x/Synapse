import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import ProfileHeader from '@/components/profile/ProfileHeader';
import { Grid, Film, UserSquare, Heart, MessageCircle } from 'lucide-react';
import { cn } from '@/components/ui/Button';
import { api } from '@/lib/axios';
import { Link } from 'react-router-dom';

export default function ProfilePage() {
    const { username } = useParams();
    const { user: currentUser } = useAuthStore();
    const [profileUser, setProfileUser] = useState<any>(null);
    const [posts, setPosts] = useState<any[]>([]);
    const [reels, setReels] = useState<any[]>([]);
    const [followers, setFollowers] = useState<any[]>([]);
    const [following, setFollowing] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'posts' | 'reels' | 'tagged'>('posts');
    const [loading, setLoading] = useState(true);
    const [showFollowers, setShowFollowers] = useState(false);
    const [showFollowing, setShowFollowing] = useState(false);

    const isOwnProfile = currentUser?.username === username;

    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            try {
                if (isOwnProfile && currentUser) {
                    setProfileUser(currentUser);
                } else if (username) {
                    const { data } = await api.get(`/user/u/${username}`);
                    setProfileUser(data.data);
                }
            } catch (error) {
                console.error("Failed to fetch profile", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [username, currentUser, isOwnProfile]);

    // Refresh profile when user data changes (e.g., after follow/unfollow)
    useEffect(() => {
        if (!isOwnProfile && username && profileUser) {
            const refreshProfile = async () => {
                try {
                    const { data } = await api.get(`/user/u/${username}`);
                    setProfileUser(data.data);
                } catch (error) {
                    console.error("Failed to refresh profile", error);
                }
            };
            // Small delay to ensure backend has updated
            const timer = setTimeout(refreshProfile, 500);
            return () => clearTimeout(timer);
        }
    }, [currentUser?.followingCount, username, isOwnProfile]); // Refresh when following count changes

    useEffect(() => {
        const fetchPosts = async () => {
            if (!profileUser?._id) return;
            try {
                const { data } = await api.get(`/post/user/${profileUser._id}`);
                setPosts(data.data.posts || []);
            } catch (error) {
                console.error("Failed to fetch posts", error);
            }
        };
        if (activeTab === 'posts') {
            fetchPosts();
        }
    }, [profileUser?._id, activeTab]);

    useEffect(() => {
        const fetchReels = async () => {
            if (!profileUser?._id) return;
            try {
                const { data } = await api.get(`/reel/${profileUser._id}`);
                setReels(data.data.reels || []);
            } catch (error) {
                console.error("Failed to fetch reels", error);
            }
        };
        if (activeTab === 'reels') {
            fetchReels();
        }
    }, [profileUser?._id, activeTab]);

    const fetchFollowers = async () => {
        if (!profileUser?._id) return;
        try {
            const { data } = await api.get(`/user/${profileUser._id}/followers`);
            const followersList = data.data?.followers || data.data || [];
            // Extract user data from follower objects
            const followersData = followersList.map((f: any) => f.follower || f);
            setFollowers(followersData);
            setShowFollowers(true);
        } catch (error) {
            console.error("Failed to fetch followers", error);
        }
    };

    const fetchFollowing = async () => {
        if (!profileUser?._id) return;
        try {
            const { data } = await api.get(`/user/${profileUser._id}/following`);
            const followingList = data.data?.following || data.data || [];
            // Extract user data from following objects
            const followingData = followingList.map((f: any) => f.following || f);
            setFollowing(followingData);
            setShowFollowing(true);
        } catch (error) {
            console.error("Failed to fetch following", error);
        }
    };

    if (loading || !profileUser) {
        return (
            <div className="flex justify-center items-center pt-20">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    return (
        <div className="pb-20 md:pb-0 px-4 md:px-6 max-w-4xl mx-auto">
            <ProfileHeader 
                user={profileUser} 
                isOwnProfile={isOwnProfile} 
                postsCount={posts.length}
                onFollowersClick={fetchFollowers}
                onFollowingClick={fetchFollowing}
                onFollowChange={async () => {
                    // Refresh profile data after follow/unfollow
                    if (username) {
                        try {
                            const { data } = await api.get(`/user/u/${username}`);
                            setProfileUser(data.data);
                        } catch (error) {
                            console.error("Failed to refresh profile", error);
                        }
                    }
                }}
            />

            {/* Tabs */}
            <div className="bg-white rounded-2xl border border-gray-200 mt-6 shadow-sm">
                <div className="flex justify-center gap-8 border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('posts')}
                        className={cn(
                            "flex items-center gap-2 py-4 border-b-2 transition-colors text-base font-semibold",
                            activeTab === 'posts'
                                ? "border-black text-gray-900"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <Grid size={18} />
                        <span>Posts</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('reels')}
                        className={cn(
                            "flex items-center gap-2 py-4 border-b-2 transition-colors text-base font-semibold",
                            activeTab === 'reels'
                                ? "border-black text-gray-900"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <Film size={18} />
                        <span>Reels</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('tagged')}
                        className={cn(
                            "flex items-center gap-2 py-4 border-b-2 transition-colors text-base font-semibold",
                            activeTab === 'tagged'
                                ? "border-black text-gray-900"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <UserSquare size={18} />
                        <span>Tagged</span>
                    </button>
                </div>
            </div>

            {/* Grid */}
            {activeTab === 'posts' && (
                <div className="grid grid-cols-3 gap-1 md:gap-2 mt-4">
                    {posts.length > 0 ? (
                        posts.map((post) => (
                            <Link
                                key={post._id}
                                to={`/post/${post._id}`}
                                className="aspect-square bg-gray-100 relative group overflow-hidden cursor-pointer rounded-lg"
                            >
                                {post.mediaType === 'video' ? (
                                    <video
                                        src={post.mediaUrl}
                                        className="w-full h-full object-cover"
                                        muted
                                    />
                                ) : (
                                    <img
                                        src={post.mediaUrl}
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                        alt="Post"
                                    />
                                )}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white">
                                    <div className="flex items-center gap-2">
                                        <Heart size={20} fill="currentColor" />
                                        <span className="font-semibold">{post.likesCount || 0}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MessageCircle size={20} fill="currentColor" />
                                        <span className="font-semibold">{post.commentsCount || 0}</span>
                                    </div>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <div className="col-span-3 text-center py-20 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                            <Grid size={48} className="mx-auto text-gray-300 mb-4" />
                            <p className="text-xl font-medium text-gray-900 mb-2">No posts yet</p>
                            <p className="text-base text-gray-500">When {isOwnProfile ? 'you' : 'they'} share photos and videos, they'll appear here.</p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'reels' && (
                <div className="grid grid-cols-3 gap-1 md:gap-2 mt-4">
                    {reels.length > 0 ? (
                        reels.map((reel) => (
                            <div
                                key={reel._id}
                                className="aspect-square bg-gray-100 relative group overflow-hidden cursor-pointer rounded-lg"
                            >
                                <video
                                    src={reel.videoUrl}
                                    className="w-full h-full object-cover"
                                    muted
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white">
                                    <div className="flex items-center gap-2">
                                        <Heart size={20} fill="currentColor" />
                                        <span className="font-semibold">{reel.likesCount || 0}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MessageCircle size={20} fill="currentColor" />
                                        <span className="font-semibold">{reel.commentsCount || 0}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-3 text-center py-20 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                            <Film size={48} className="mx-auto text-gray-300 mb-4" />
                            <p className="text-xl font-medium text-gray-900 mb-2">No reels yet</p>
                            <p className="text-base text-gray-500">When {isOwnProfile ? 'you' : 'they'} create reels, they'll appear here.</p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'tagged' && (
                <div className="text-center py-20 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                    <UserSquare size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-xl font-medium text-gray-900 mb-2">No tagged posts</p>
                    <p className="text-base text-gray-500">Posts you're tagged in will appear here.</p>
                </div>
            )}

            {/* Followers Modal */}
            {showFollowers && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowFollowers(false)}>
                    <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="font-bold text-xl">Followers</h3>
                            <button onClick={() => setShowFollowers(false)} className="text-gray-500 hover:text-gray-700">✕</button>
                        </div>
                        <div className="overflow-y-auto max-h-[60vh]">
                            {followers.length > 0 ? (
                                followers.map((follower: any) => (
                                    <Link
                                        key={follower._id}
                                        to={`/profile/${follower.username}`}
                                        className="flex items-center gap-3 p-4 hover:bg-gray-50 border-b border-gray-100"
                                        onClick={() => setShowFollowers(false)}
                                    >
                                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200">
                                            <img
                                                src={follower.avatar || `https://ui-avatars.com/api/?name=${follower.username}`}
                                                alt={follower.username}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-900">{follower.username}</p>
                                            <p className="text-base text-gray-500">{follower.fullName || ''}</p>
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <div className="text-center py-12 text-gray-500">
                                    <p>No followers yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Following Modal */}
            {showFollowing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowFollowing(false)}>
                    <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="font-bold text-xl">Following</h3>
                            <button onClick={() => setShowFollowing(false)} className="text-gray-500 hover:text-gray-700">✕</button>
                        </div>
                        <div className="overflow-y-auto max-h-[60vh]">
                            {following.length > 0 ? (
                                following.map((follow: any) => (
                                    <Link
                                        key={follow._id}
                                        to={`/profile/${follow.username}`}
                                        className="flex items-center gap-3 p-4 hover:bg-gray-50 border-b border-gray-100"
                                        onClick={() => setShowFollowing(false)}
                                    >
                                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200">
                                            <img
                                                src={follow.avatar || `https://ui-avatars.com/api/?name=${follow.username}`}
                                                alt={follow.username}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-900">{follow.username}</p>
                                            <p className="text-base text-gray-500">{follow.fullName || ''}</p>
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <div className="text-center py-12 text-gray-500">
                                    <p>Not following anyone yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
