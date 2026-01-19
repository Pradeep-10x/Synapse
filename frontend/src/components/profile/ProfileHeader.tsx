import { User, useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Settings, MessageCircle } from 'lucide-react';
import { api } from '@/lib/axios';
import { useState, useEffect } from 'react';
import { cn } from '@/components/ui/Button';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

interface ProfileHeaderProps {
    user: User;
    isOwnProfile: boolean;
    postsCount?: number;
    onFollowersClick?: () => void;
    onFollowingClick?: () => void;
    onFollowChange?: () => void;
}

export default function ProfileHeader({ user, isOwnProfile, postsCount = 0, onFollowersClick, onFollowingClick, onFollowChange }: ProfileHeaderProps) {
    const navigate = useNavigate();
    const { user: currentUser, checkAuth } = useAuthStore();
    const [isFollowing, setIsFollowing] = useState(false);
    const [followersCount, setFollowersCount] = useState(user.followersCount || 0);
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingFollow, setIsCheckingFollow] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Check initial follow status
    useEffect(() => {
        const checkFollowStatus = async () => {
            if (isOwnProfile || !currentUser?._id || !user._id) {
                setIsCheckingFollow(false);
                return;
            }
            try {
                const { data } = await api.get(`/user/${user._id}/followers`);
                const followers = data.data?.followers || data.data || [];
                const isUserFollowing = followers.some((f: any) => {
                    const followerId = f.follower?._id || f.follower || f._id;
                    return followerId === currentUser._id || followerId?.toString() === currentUser._id?.toString();
                });
                setIsFollowing(isUserFollowing);
            } catch (error) {
                console.error('Failed to check follow status');
            } finally {
                setIsCheckingFollow(false);
            }
        };
        checkFollowStatus();
    }, [user._id, currentUser?._id, isOwnProfile]);

    useEffect(() => {
        setFollowersCount(user.followersCount || 0);
    }, [user.followersCount]);

    const handleFollow = async () => {
        if (isLoading || isOwnProfile) return;
        
        setIsLoading(true);
        try {
            const { data } = await api.post(`/user/${user._id}/follow`);
            const following = data.data?.following ?? false;
            setIsFollowing(following);
            
            // Update count based on API response
            setFollowersCount(prev => following ? prev + 1 : Math.max(0, prev - 1));
            
            // Refresh current user's following count
            await checkAuth();
            
            // Refresh profile user to get updated follower count
            setIsRefreshing(true);
            try {
                const { data: profileData } = await api.get(`/user/u/${user.username}`);
                setFollowersCount(profileData.data?.followersCount || 0);
                // Notify parent to refresh profile
                onFollowChange?.();
            } catch (err) {
                console.error('Failed to refresh profile', err);
            } finally {
                setIsRefreshing(false);
            }
        } catch (error: any) {
            console.error('Failed to follow/unfollow user', error);
            toast.error(error.response?.data?.message || 'Failed to follow/unfollow user');
        } finally {
            setIsLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="mb-8 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                {/* Avatar */}
                <div className="relative">
                    <div className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden border-4 border-white shadow-lg">
                        <img
                            src={user.avatar || `https://ui-avatars.com/api/?name=${user.username}`}
                            alt={user.username}
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>

                {/* Info */}
                <div className="flex-1 w-full space-y-4">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-4">
                        <div className="flex-1 text-center md:text-left">
                            <h1 className="text-2xl font-bold text-gray-900">{user.username}</h1>
                            {user.isVerified && (
                                <span className="inline-block ml-2 text-blue-500">✓</span>
                            )}
                        </div>

                        <div className="flex gap-2">
                            {isOwnProfile ? (
                                <>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => navigate('/settings')}
                                        className="bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-200"
                                    >
                                        Edit profile
                                    </Button>
                                    <Link
                                        to="/settings"
                                        className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
                                    >
                                        <Settings size={18} />
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={handleFollow}
                                        disabled={isLoading || isCheckingFollow || isRefreshing}
                                        className={cn(
                                            "px-6 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2",
                                            isFollowing
                                                ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                                : "bg-black text-white hover:bg-gray-800"
                                        )}
                                    >
                                        {isLoading || isRefreshing ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                {isRefreshing ? 'Updating...' : '...'}
                                            </>
                                        ) : (
                                            isFollowing ? 'Following' : 'Follow'
                                        )}
                                    </button>
                                    <button 
                                        onClick={() => {
                                            const params = new URLSearchParams({
                                                userId: user._id,
                                                username: user.username
                                            });
                                            if (user.avatar) params.set('avatar', user.avatar);
                                            if (user.fullName) params.set('fullName', user.fullName);
                                            navigate(`/messages?${params.toString()}`);
                                        }}
                                        className="px-6 py-2 rounded-lg text-sm font-semibold bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-200 flex items-center gap-2"
                                    >
                                        <MessageCircle size={18} />
                                        Message
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-center md:justify-start gap-6 text-sm">
                        <div className="text-center md:text-left">
                            <span className="font-bold text-lg text-gray-900">{postsCount}</span>
                            <span className="text-gray-600 ml-1">posts</span>
                        </div>
                        <button 
                            onClick={onFollowersClick}
                            className="text-center md:text-left cursor-pointer hover:opacity-70 transition-opacity"
                        >
                            <span className="font-bold text-lg text-gray-900">{followersCount}</span>
                            <span className="text-gray-600 ml-1">followers</span>
                        </button>
                        <button 
                            onClick={onFollowingClick}
                            className="text-center md:text-left cursor-pointer hover:opacity-70 transition-opacity"
                        >
                            <span className="font-bold text-lg text-gray-900">{user.followingCount || 0}</span>
                            <span className="text-gray-600 ml-1">following</span>
                        </button>
                    </div>

                    <div className="text-center md:text-left">
                        <h2 className="font-semibold text-gray-900 mb-1">{user.fullName}</h2>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{user.bio || 'No bio yet'}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
