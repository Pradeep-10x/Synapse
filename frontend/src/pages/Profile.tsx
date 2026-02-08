import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { userAPI, postAPI, notificationAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'react-hot-toast';
import { Bookmark, Loader2, Pencil, ChevronDown, Image } from 'lucide-react';

type Tab = 'activity' | 'media' | 'saved';

interface ProfileUser {
  _id: string;
  username: string;
  fullName: string;
  bio?: string;
  avatar?: string;
  email?: string;
  phone?: string;
  followersCount: number;
  followingCount: number;
  postsCount?: number;
  isVerified: boolean;
  VerificationBadge?: 'Gold' | 'Silver' | null;
}

interface ActivityItem {
  _id: string;
  type: 'follow' | 'like' | 'comment' | 'post' | 'update' | 'join';
  message: string;
  sender?: {
    _id: string;
    username: string;
    fullName: string;
    avatar?: string;
  };
  createdAt: string;
  relatedContent?: string;
}

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('media');
  const [posts, setPosts] = useState<any[]>([]);
  const [, setActivities] = useState<ActivityItem[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isOwnProfile = profileUser?._id === currentUser?._id;

  useEffect(() => {
    const targetUsername = username || currentUser?.username;
    if (targetUsername) {
      fetchProfile(targetUsername);
    }
  }, [username, currentUser]);

  useEffect(() => {
    if (profileUser) {
      if (activeTab === 'media') {
        fetchPosts();
      } else if (activeTab === 'activity') {
        fetchActivity();
      }
    }
  }, [profileUser, activeTab]);

  const fetchProfile = async (targetUsername: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await userAPI.getUserProfile(targetUsername);
      const userData = response.data.data;
      setProfileUser(userData);
      setIsFollowing(userData.isFollowing || false);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to load profile';
      setError(message);
      toast.error(message);
      if (username) {
        navigate('/feed');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchActivity = async () => {
    try {
      setLoadingContent(true);
      const response = await notificationAPI.getNotifications();
      const notifications = response.data.data || [];
      
      // Transform notifications to activity items
      const activityItems: ActivityItem[] = notifications.map((notif: any) => ({
        _id: notif._id,
        type: notif.type,
        message: notif.message || getActivityMessage(notif),
        sender: notif.sender,
        createdAt: notif.createdAt,
        relatedContent: notif.relatedContent,
      }));
      
      setActivities(activityItems);
    } catch (error: any) {
      console.error('Failed to fetch activity:', error);
    } finally {
      setLoadingContent(false);
    }
  };

  const getActivityMessage = (notif: any) => {
    switch (notif.type) {
      case 'follow':
        return 'followed you';
      case 'like':
        return 'liked your post';
      case 'comment':
        return 'commented on your post';
      default:
        return 'interacted with you';
    }
  };

  const fetchPosts = async () => {
    if (!profileUser) return;
    try {
      setLoadingContent(true);
      const response = await postAPI.getUserPosts(profileUser._id);
      const data = response.data.data;
      setPosts(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoadingContent(false);
    }
  };

  const handleFollow = async () => {
    if (!profileUser) return;
    try {
      const response = await userAPI.followUnfollow(profileUser._id);
      const following = response.data.data.following;
      setIsFollowing(following);

      setProfileUser((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          followersCount: following
            ? prev.followersCount + 1
            : prev.followersCount - 1,
        };
      });

      toast.success(following ? 'Followed' : 'Unfollowed');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to follow/unfollow');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--synapse-bg)]">
        <Loader2 className="w-8 h-8 animate-spin text-[#6366f1]" />
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--synapse-bg)]">
        <div className="bg-[var(--synapse-surface)] border border-[var(--synapse-border)] rounded-md p-6 text-center max-w-md">
          <p className="text-[var(--synapse-text)] font-semibold mb-2">Profile not available</p>
          <p className="text-[var(--synapse-text-muted)] text-sm mb-4">{error || 'We could not load this profile right now.'}</p>
          <button
            onClick={() => navigate('/feed')}
            className="px-4 py-2 bg-[#6366f1] rounded-md text-white font-semibold hover:bg-[#5558e3] transition-colors"
          >
            Go to feed
          </button>
        </div>
      </div>
    );
  }

  // Calculate stats for display
  const domainsCount = 3; // Placeholder - could be communities joined
  const postsCount = posts.length;

  return (
    <div className="min-h-screen bg-[var(--synapse-bg)] p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
          
          {/* Left Side - Followers & Following Card */}
          <div className="bg-[var(--synapse-surface)]/80 backdrop-blur-sm border border-[var(--synapse-border)] rounded-md p-6 h-fit">
            {/* Header with Avatar */}
            <div className="flex items-center gap-4 mb-6 pb-4 border-b border-[var(--synapse-border)]">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border-2 border-[var(--synapse-border)] overflow-hidden">
                <img 
                  src={profileUser.avatar || "/default-avatar.jpg"} 
                  alt={profileUser.username} 
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--synapse-text)]">
                  {profileUser.fullName || profileUser.username}
                  {profileUser.isVerified && (
                    <span className="ml-2 text-[#6366f1]">✓</span>
                  )}
                </h2>
                <p className="text-[var(--synapse-text-muted)] text-sm">@{profileUser.username}</p>
              </div>
            </div>

            {/* Followers Section */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[var(--synapse-text)]">Followers</h3>
                <span className="text-2xl font-bold text-[var(--synapse-text)]">{profileUser.followersCount}</span>
              </div>
              <div className="h-1 rounded-full bg-[var(--synapse-surface-hover)]">
                <div className="h-1 rounded-full bg-gradient-to-r from-[#6366f1] to-[#8b5cf6]" style={{ width: `${Math.min(profileUser.followersCount * 2, 100)}%` }} />
              </div>
            </div>

            {/* Following Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[var(--synapse-text)]">Following</h3>
                <span className="text-2xl font-bold text-[var(--synapse-text)]">{profileUser.followingCount}</span>
              </div>
              <div className="h-1 rounded-full bg-[var(--synapse-surface-hover)]">
                <div className="h-1 rounded-full bg-gradient-to-r from-[#10b981] to-[#34d399]" style={{ width: `${Math.min(profileUser.followingCount * 2, 100)}%` }} />
              </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="text-center p-3 rounded-lg bg-[var(--synapse-surface-hover)]/50">
                <p className="text-[var(--synapse-text-muted)] text-xs uppercase tracking-wider mb-1">Communities</p>
                <p className="text-xl font-bold text-[var(--synapse-text)]">{domainsCount}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-[var(--synapse-surface-hover)]/50">
                <p className="text-[var(--synapse-text-muted)] text-xs uppercase tracking-wider mb-1">Posts</p>
                <p className="text-xl font-bold text-[var(--synapse-text)]">{postsCount}</p>
              </div>
            </div>

            {/* Bio if exists */}
            {profileUser.bio && (
              <div className="border-t border-[var(--synapse-border)] pt-4">
                <p className="text-[var(--synapse-text-muted)] text-xs uppercase tracking-wider mb-2">About</p>
                <p className="text-[var(--synapse-text)] text-sm leading-relaxed">{profileUser.bio}</p>
              </div>
            )}
          </div>

          {/* Right Side - Identity Overview */}
          <div className="bg-[var(--synapse-surface)]/80 backdrop-blur-sm border border-[var(--synapse-border)] rounded-md p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-[var(--synapse-text)] mb-2">Identity Overview</h1>
                <div>
                  <p className="text-[var(--synapse-text-muted)] text-sm uppercase tracking-wider mb-1">About:</p>
                  <p className="text-[var(--synapse-text)] text-sm">{profileUser.bio || 'No About yet'}</p>
                </div>
              </div>
              
              {/* Edit Profile Button */}
              {isOwnProfile ? (
                <Link
                  to="/profile/edit"
                  className="flex items-center gap-2 text-[#60a5fa] hover:text-[#93c5fd] transition-colors text-sm"
                >
                  <Pencil className="w-4 h-4" />
                  Edit Profile
                  <ChevronDown className="w-4 h-4" />
                </Link>
              ) : (
                <button
                  onClick={handleFollow}
                  className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                    isFollowing
                      ? 'border border-[var(--synapse-border)] text-[var(--synapse-text)] hover:border-[#6366f1]'
                      : 'bg-[#6366f1] text-white hover:bg-[#5558e3]'
                  }`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-6 mb-6 border-b border-[var(--synapse-border)]">
              {[
              
                { id: 'media' as Tab, label: 'Media' },
                { id: 'saved' as Tab, label: 'Saved' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-3 px-1 text-sm font-medium transition-colors relative ${
                    activeTab === tab.id
                      ? 'text-[var(--synapse-text)]'
                      : 'text-[var(--synapse-text-muted)] hover:text-[var(--synapse-text)]'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6366f1]"></div>
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[300px]">
             

              {activeTab === 'media' && (
                <div>
                  {loadingContent ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="w-6 h-6 animate-spin text-[#6366f1]" />
                    </div>
                  ) : posts.length === 0 ? (
                    <div className="text-center py-16">
                      <Image className="w-12 h-12 text-[var(--synapse-text-muted)] mx-auto mb-4 mt-12 opacity-50" />
                      <p className="text-[var(--synapse-text-muted)] ">No media yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {posts.map((post) => (
                        <Link
                          key={post._id}
                          to={`/post/${post._id}`}
                          className="aspect-square bg-[var(--synapse-surface-hover)] rounded-md overflow-hidden group cursor-pointer relative"
                        >
                          {post.mediaType === 'image' ? (
                            <img
                              src={post.mediaUrl}
                              alt={post.caption}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <video
                              src={post.mediaUrl}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              muted
                            />
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-4 text-white text-sm">
                              <span className="font-semibold">♥ {post.likesCount}</span>
                              <span className="font-semibold">💬 {post.commentsCount}</span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'saved' && (
                <div className="text-center py-16">
                  <Bookmark className="w-12 h-12 text-[var(--synapse-text-muted)] mx-auto mb-4 mt-12 opacity-50" />
                  <p className="text-[var(--synapse-text-muted)]">Saved posts will appear here</p>
                  {!isOwnProfile && (
                    <p className="text-sm text-[var(--synapse-text-muted)] mt-2">This is a private collection</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

}
