import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { userAPI, postAPI, reelAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'react-hot-toast';
import { Grid3x3, Video, Bookmark, User, Settings, Loader2, Camera, Pencil, Mail, Phone, MapPin, FileText, Upload, Image } from 'lucide-react';

type Tab = 'posts' | 'reels' | 'saved' | 'about';

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
        <Loader2 className="w-8 h-8 animate-spin text-[#6366f1]" />
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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

  return (
    <div className="min-h-screen bg-[var(--synapse-bg)] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Main Profile Card */}
        <div className="bg-[var(--synapse-surface)] border border-[var(--synapse-border)] rounded-sm p-8">
          {/* Header */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-2 h-2 rounded-sm bg-[#6366f1]"></div>
            <h1 className="text-lg font-semibold text-[var(--synapse-text)]">Profile</h1>
          </div>

          {/* Profile Content */}
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Side - Avatar */}
            <div className="flex flex-col items-center gap-4 mr-20 pl-20" >
              <div className="relative">
                <div className="w-40 h-40  rounded-full bg-[var(--synapse-surface-hover)] border border-[var(--synapse-border)] overflow-hidden">
                  <img 
                    src={profileUser.avatar || "/default-avatar.jpg"} 
                    alt={profileUser.username} 
                    className="w-full h-full object-cover object-center min-w-full min-h-full"
                  />
                </div>
                {isOwnProfile && (
                  <button className="absolute bottom-2 right-2 w-8 h-8 bg-[var(--synapse-surface)] border border-[var(--synapse-border)] rounded-full flex items-center justify-center hover:bg-[var(--synapse-surface-hover)] transition-colors">
                    <Camera className="w-4 h-4 text-[var(--synapse-text-muted)]" />
                  </button>
                )}
              </div>

              {/* Upload Boxes */}
              {isOwnProfile && (
                <div className="flex gap-3 mt-5 ml-1">
                  <div className="w-40 h-10 border-2 border-solid border-[var(--synapse-border)] rounded-md flex flex-col items-center justify-center cursor-pointer hover:border-[#6366f1] transition-colors group">
                
                    <span className="text-sm text-[#6366f1] font-medium">Change Avatar</span>
                  </div>
                 
                </div>
              )}
            </div>

            {/* Right Side - Info */}
            <div className="flex-1 space-y-4 -mt-5" >
              {/* Name */}
              <div>
                <label className="text-md font-semibold text-[var(--synapse-text)] mb-1 block">Name:</label>
                <p className="text-sm text-[var(--synapse-text-muted)]">
                  {profileUser.fullName || profileUser.username}
                  {profileUser.isVerified && (
                    <span className="ml-2 text-[#6366f1]">✓</span>
                  )}
                </p>
              </div>

              {/* Email */}
              <div>
                <label className="text-md font-semibold text-[var(--synapse-text)] mb-1 block">Email:</label>
                <p className="text-sm text-[var(--synapse-text-muted)]">{profileUser.email || `${profileUser.username}@synapse.app`}</p>
              </div>

              {/* Stats as Phone Number style */}
              <div>
                <label className="text-md  font-semibold text-[var(--synapse-text)] mb-1 block">People:</label>
                <p className="text-sm text-[var(--synapse-text-muted)]">{profileUser.followersCount} followers · {profileUser.followingCount} following</p>
              </div>

              {/* Bio as Address */}
              <div>
                <label className="text-md font-semibold text-[var(--synapse-text)] mb-1 block">About:</label>
                <p className="text-sm text-[var(--synapse-text-muted)]">{profileUser.bio || 'No bio yet'}</p>
              </div>

              {/* Action Button */}
              <div className="pt-4">
                {isOwnProfile ? (
                  <Link
                    to="/profile/edit"
                    className="inline-flex items-center gap-2 px-6 py-2.5 border border-[#6366f1] text-[#6366f1] rounded-md font-medium hover:bg-[#6366f1] hover:text-white transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                    EDIT PROFILE
                  </Link>
                ) : (
                  <button
                    onClick={handleFollow}
                    className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-colors ${
                      isFollowing
                        ? 'border border-[var(--synapse-border)] text-[var(--synapse-text)] hover:border-[#6366f1]'
                        : 'bg-[#6366f1] text-white hover:bg-[#5558e3]'
                    }`}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                )}

              
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="mt-6 bg-[var(--synapse-surface)] border border-[var(--synapse-border)] rounded-sm">
          {/* Tabs Header */}
          <div className="flex items-center border-b border-[var(--synapse-border)]">
            {[
              { id: 'posts' as Tab, icon: Grid3x3, label: 'Posts' },
             
              { id: 'saved' as Tab, icon: Bookmark, label: 'Saved' },
              
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 -mb-px transition-colors ${
                  activeTab === tab.id
                    ? 'border-[#6366f1] text-[#6366f1]'
                    : 'border-transparent text-[var(--synapse-text-muted)] hover:text-[var(--synapse-text)]'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="font-medium text-sm">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'posts' && (
              <div>
                {loadingPosts ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-[#6366f1]" />
                  </div>
                ) : !Array.isArray(posts) || posts.length === 0 ? (
                  <div className="text-center py-16">
                    <Grid3x3 className="w-12 h-12 text-[var(--synapse-text-muted)] mx-auto mb-4" />
                    <p className="text-[var(--synapse-text-muted)]">No posts yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {posts.map((post) => (
                      <Link
                        key={post._id}
                        to={`/post/${post._id}`}
                        className="aspect-square bg-[var(--synapse-surface-hover)] rounded-lg overflow-hidden group cursor-pointer relative"
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
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
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

            {activeTab === 'reels' && (
              <div>
                {loadingPosts ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-[#6366f1]" />
                  </div>
                ) : reels.length === 0 ? (
                  <div className="text-center py-16">
                    <Video className="w-12 h-12 text-[var(--synapse-text-muted)] mx-auto mb-4" />
                    <p className="text-[var(--synapse-text-muted)]">No reels yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {reels.map((reel) => (
                      <Link
                        key={reel._id}
                        to={`/reels/${reel._id}`}
                        className="aspect-[9/16] bg-[var(--synapse-surface-hover)] rounded-lg overflow-hidden group cursor-pointer relative"
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
              <div className="text-center py-16">
                <Bookmark className="w-12 h-12 text-[var(--synapse-text-muted)] mx-auto mb-4" />
                <p className="text-[var(--synapse-text-muted)]">Saved posts will appear here</p>
                {!isOwnProfile && (
                  <p className="text-sm text-[var(--synapse-text-muted)] mt-2">This is a private collection</p>
                )}
              </div>
            )}

            {activeTab === 'about' && (
              <div className="space-y-6 max-w-lg">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-[#6366f1] mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-[var(--synapse-text)] mb-1">Username</h3>
                    <p className="text-[var(--synapse-text-muted)]">@{profileUser.username}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-[#6366f1] mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-[var(--synapse-text)] mb-1">Bio</h3>
                    <p className="text-[var(--synapse-text-muted)]">{profileUser.bio || 'No bio yet'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Settings className="w-5 h-5 text-[#6366f1] mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-[var(--synapse-text)] mb-1">Verification</h3>
                    <p className="text-[var(--synapse-text-muted)]">
                      {profileUser.isVerified
                        ? `Verified with ${profileUser.VerificationBadge || 'Standard'} badge`
                        : 'Not verified'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

