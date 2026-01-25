import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { userAPI, postAPI, reelAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'react-hot-toast';
import { Grid3x3, Video, Bookmark, User, Settings, Loader2 } from 'lucide-react';

type Tab = 'posts' | 'reels' | 'saved' | 'about';

interface ProfileUser {
  _id: string;
  username: string;
  fullName: string;
  bio?: string;
  avatar?: string;
  followersCount: number;
  followingCount: number;
  isVerified: boolean;
  VerificationBadge?: 'Gold' | 'Silver' | null;
}

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('posts');
  const [posts, setPosts] = useState<any[]>([]);
  const [reels, setReels] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);
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
      if (activeTab === 'posts') {
        fetchPosts();
      } else if (activeTab === 'reels') {
        fetchReels();
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


  const fetchPosts = async () => {
    if (!profileUser) return;
    try {
      setLoadingPosts(true);
      const response = await postAPI.getUserPosts(profileUser._id);
      const data = response.data.data;
      setPosts(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  const fetchReels = async () => {
    if (!profileUser) return;
    try {
      setLoadingPosts(true);
      const response = await reelAPI.getUserReels(profileUser._id);
      setReels(response.data.data?.reels || []);
    } catch (error: any) {
      console.error('Failed to fetch reels:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleFollow = async () => {
    if (!profileUser) return;
    try {
      const response = await userAPI.followUnfollow(profileUser._id);
      const following = response.data.data.following;
      setIsFollowing(following);

      // Optimistic UI update
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#a855f7]" />
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card rounded-xl p-6 text-center max-w-md">
          <p className="text-[#e5e7eb] font-semibold mb-2">Profile not available</p>
          <p className="text-[#9ca3af] text-sm mb-4">{error || 'We could not load this profile right now.'}</p>
          <button
            onClick={() => navigate('/feed')}
            className="px-4 py-2 bg-[#a855f7] rounded-lg text-white font-semibold hover:scale-105 transition-transform"
          >
            Go to feed
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="glass-card rounded-xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-[#a855f7] flex items-center justify-center overflow-hidden flex-shrink-0">
              <img src={profileUser.avatar || "/default-avatar.jpg"} alt={profileUser.username} className="w-full h-full object-cover" />
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              {/* Name first */}
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-[#e5e7eb]">{profileUser.username}</h1>
                {profileUser.isVerified && (
                  <span className="text-[#06b6d4] text-lg font-medium">✓</span>
                )}
              </div>
              {profileUser.fullName && (
                <p className="text-[#9ca3af] mb-2">{profileUser.fullName}</p>
              )}

              {/* Stats - Posts, Followers, Following */}
              <div className="flex items-center gap-6 mb-4">
                <div className="text-center">
                  <div className="font-semibold text-[#e5e7eb]">{posts.length}</div>
                  <div className="text-sm text-[#9ca3af]">posts</div>
                </div>
                <button className="text-center hover:opacity-80 transition-opacity">
                  <div className="font-semibold text-[#e5e7eb]">{profileUser.followersCount}</div>
                  <div className="text-sm text-[#9ca3af]">followers</div>
                </button>
                <button className="text-center hover:opacity-80 transition-opacity">
                  <div className="font-semibold text-[#e5e7eb]">{profileUser.followingCount}</div>
                  <div className="text-sm text-[#9ca3af]">following</div>
                </button>
              </div>
            </div>
          </div>

          {/* Bio - Below profile picture area */}
          {profileUser.bio && (
            <p className="text-[#e5e7eb]  mb-3">{profileUser.bio}</p>
          )}

          {/* Actions - Edit Profile / Follow */}
          <div className="flex items-center gap-3">
            {isOwnProfile ? (
              <Link
                to="/profile/edit"
                className="px-6 py-2 glass-card rounded-lg font-semibold text-[#e5e7eb] hover:border-[rgba(168,85,247,0.3)] transition-colors flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Edit Profile
              </Link>
            ) : (
              <button
                onClick={handleFollow}
                className={`px-6 py-2 rounded-lg font-semibold transition-all duration-300 ${isFollowing
                  ? 'glass-card text-[#e5e7eb] hover:border-[rgba(168,85,247,0.3)]'
                  : 'bg-[#7c3aed] text-white hover:bg-[#6d28d9]'
                  }`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            )}

            {!profileUser.isVerified && profileUser.username === currentUser?.username && (
              <Link
                to="/settings"
                className="px-4 py-2 glass-card rounded-lg text-sm font-medium text-[#e5e7eb] hover:border-[rgba(168,85,247,0.3)] transition-colors"
              >
                Get Verified
              </Link>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-[rgba(168,85,247,0.1)]">
          {[
            { id: 'posts' as Tab, icon: Grid3x3, label: 'Posts' },
            { id: 'reels' as Tab, icon: Video, label: 'Reels' },
            { id: 'saved' as Tab, icon: Bookmark, label: 'Saved' },
            { id: 'about' as Tab, icon: User, label: 'About' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${activeTab === tab.id
                ? 'border-[#a855f7] text-[#a855f7]'
                : 'border-transparent text-[#9ca3af] hover:text-[#e5e7eb]'
                }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'posts' && (
            <div>
              {loadingPosts ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-[#a855f7]" />
                </div>
              ) : !Array.isArray(posts) || posts.length === 0 ? (
                <div className="text-center py-20">
                  <Grid3x3 className="w-12 h-12 text-[#9ca3af] mx-auto mb-4" />
                  <p className="text-[#9ca3af]">No posts yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1">
                  {posts.map((post) => (
                    <Link
                      key={post._id}
                      to={`/post/${post._id}`}
                      className="aspect-square bg-[#0a0a12] overflow-hidden group cursor-pointer relative"
                    >
                      {post.mediaType === 'image' ? (
                        <img
                          src={post.mediaUrl}
                          alt={post.caption}
                          className="w-full h-full object-cover group-hover:opacity-70 transition-opacity"
                        />
                      ) : (
                        <video
                          src={post.mediaUrl}
                          className="w-full h-full object-cover group-hover:opacity-70 transition-opacity"
                          muted
                        />
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-4 text-white">
                          <span className="font-semibold">{post.likesCount}</span>
                          <span className="font-semibold">{post.commentsCount}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'reels' && (
            <div>
              {loadingPosts ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-[#a855f7]" />
                </div>
              ) : reels.length === 0 ? (
                <div className="text-center py-20">
                  <Video className="w-12 h-12 text-[#9ca3af] mx-auto mb-4" />
                  <p className="text-[#9ca3af]">No reels yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1">
                  {reels.map((reel) => (
                    <Link
                      key={reel._id}
                      to={`/reels/${reel._id}`}
                      className="aspect-[9/16] bg-[#0a0a12] overflow-hidden group cursor-pointer relative"
                    >
                      <video
                        src={reel.videoUrl}
                        className="w-full h-full object-cover group-hover:opacity-70 transition-opacity"
                        muted
                      />
                      <div className="absolute bottom-2 left-2 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        {reel.viewsCount} views
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'saved' && (
            <div className="text-center py-20">
              <Bookmark className="w-12 h-12 text-[#9ca3af] mx-auto mb-4" />
              <p className="text-[#9ca3af]">Saved posts will appear here</p>
              {!isOwnProfile && (
                <p className="text-sm text-[#9ca3af] mt-2">This is a private collection</p>
              )}
            </div>
          )}

          {activeTab === 'about' && (
            <div className="glass-card rounded-xl p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-[#e5e7eb] mb-2">Bio</h3>
                <p className="text-[#9ca3af]">{profileUser.bio || 'No bio yet'}</p>
              </div>
              <div>
                <h3 className="font-semibold text-[#e5e7eb] mb-2">Verification</h3>
                <p className="text-[#9ca3af]">
                  {profileUser.isVerified
                    ? `Verified with ${profileUser.VerificationBadge || 'Standard'} badge`
                    : 'Not verified'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

