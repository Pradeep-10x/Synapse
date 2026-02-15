
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  Loader2,
  MessageSquare,
  Heart,
  Users,
  Pencil,
  ArrowLeft,
  Check
} from 'lucide-react';
import { userAPI, postAPI, communityAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'react-hot-toast';

type Tab = 'connections' | 'posts';

interface ConnectionUser {
  _id: string;
  username: string;
  avatar?: string;
  fullName?: string;
}

interface FollowerItem {
  follower: ConnectionUser;
}

interface FollowingItem {
  following: ConnectionUser;
}

interface Post {
  _id: string;
  user: {
    _id: string;
    username: string;
    avatar?: string;
  };
  caption?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  community?: {
    _id: string;
    name: string;
  };
}

const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
};

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const [profileUser, setProfileUser] = useState<any>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab] = useState<Tab>('connections');

  const [followers, setFollowers] = useState<FollowerItem[]>([]);
  const [following, setFollowing] = useState<FollowingItem[]>([]);
  const [joinedCommunities, setJoinedCommunities] = useState<any[]>([]);

  const [posts, setPosts] = useState<Post[]>([]);
  const [totalPostsCount, setTotalPostsCount] = useState(0);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [modalType, setModalType] = useState<'followers' | 'following' | null>(null);

  const [isFollowing, setIsFollowing] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // For managing follow state in the modal list


  const isOwnProfile = currentUser && profileUser && currentUser._id === profileUser._id;

  // 1. Fetch Profile User Data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!username) return;
      setLoadingProfile(true);
      try {
        const res = await userAPI.getUserProfile(username);
        const data = res.data.data;
        setProfileUser(data);
        setIsFollowing(data.isFollowing || false);
      } catch (error: any) {
        toast.error('User not found');
        navigate('/feed');
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [username, navigate]);

  // 2. Fetch Connections & Posts once profileUser is available
  useEffect(() => {
    if (!profileUser?._id) return;

    const fetchConnections = async () => {
      try {
        const [followersRes, followingRes] = await Promise.all([
          userAPI.getFollowers(profileUser._id),
          userAPI.getFollowing(profileUser._id),
        ]);
        const f = followersRes.data?.data?.followers ?? [];
        const g = followingRes.data?.data?.following ?? [];
        setFollowers(Array.isArray(f) ? f : []);
        setFollowing(Array.isArray(g) ? g : []);
      } catch (e) {
        console.error(e);
      }
    };

    const fetchUserCommunities = async () => {
      try {
        const res = await communityAPI.getUserJoined(profileUser._id);
        const list = res.data?.data ?? [];
        setJoinedCommunities(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error(e);
      }
    };

    const fetchUserPosts = async () => {
      setLoadingPosts(true);
      try {
        const res = await postAPI.getUserPosts(profileUser._id);
        const data = res.data?.data;
        const list = Array.isArray(data) ? data : (data?.posts || []);
        
        // If data is array (legacy/fallback), use length. If object with totalPosts, use that.
        // Also fallback to list.length if totalPosts is missing.
        const total = (typeof data === 'object' && !Array.isArray(data) && typeof data.totalPosts === 'number') 
                      ? data.totalPosts 
                      : list.length;

        setPosts(list);
        setTotalPostsCount(total);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingPosts(false);
      }
    };

    fetchConnections();
    fetchUserCommunities();
    fetchUserPosts();
  }, [profileUser?._id]);


  const handleFollowToggle = async () => {
    if (!profileUser || !currentUser) return;
    try {
      // Optimistic update
      const newStatus = !isFollowing;
      setIsFollowing(newStatus);
      
      if (newStatus) {
         setFollowers(prev => [...prev, { follower: currentUser } as any]);
      } else {
         setFollowers(prev => prev.filter(item => item.follower._id !== currentUser._id));
      }

      await userAPI.followUnfollow(profileUser._id);
      toast.success(newStatus ? 'Followed' : 'Unfollowed');
      
      // Refresh connections to be sure
      const followersRes = await userAPI.getFollowers(profileUser._id);
      setFollowers(followersRes.data?.data?.followers ?? []);

    } catch (e: any) {
      setIsFollowing(!isFollowing); // Revert
      toast.error(e.response?.data?.message || 'Action failed');
    }
  };

  const filteredPosts = posts.filter(post => {
      if (!searchQuery) return true;
      const lower = searchQuery.toLowerCase();
      return post.caption?.toLowerCase().includes(lower) || 
             post.user?.username?.toLowerCase().includes(lower) ||
             post.community?.name?.toLowerCase().includes(lower);
  });

  if (loadingProfile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--synapse-text-muted)]" />
      </div>
    );
  }

  if (!profileUser) return null;

  return (
    <div className="animate-in fade-in duration-300 h-full overflow-hidden flex flex-col">
      {/* Search - sharp, modern matching Personal.tsx */}
      <div className="mb-4 sm:mb-8 flex items-center gap-3 sm:gap-4">
        {!isOwnProfile && (
             <button onClick={() => navigate(-1)} className="p-2 hover:bg-[var(--synapse-surface-hover)] rounded-full text-[var(--synapse-text-muted)] transition-colors">
                 <ArrowLeft className="w-5 h-5" />
             </button>
        )}
        <div className="relative max-w-xl flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--synapse-text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search in ${profileUser.username}'s posts...`}
            className="w-full pl-11 pr-11 py-3.5 bg-[var(--synapse-surface)] border border-[var(--synapse-border)] rounded-md text-[var(--synapse-text)] placeholder:text-[var(--synapse-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--synapse-blue)]/40 focus:border-[var(--synapse-blue)] transition-all text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-[var(--synapse-surface-hover)] text-[var(--synapse-text-muted)] hover:text-[var(--synapse-text)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_390px] gap-4 sm:gap-6">
        {/* Posts - left panel */}
        <div className={`bg-[var(--synapse-surface)] h-[80vh] border border-[var(--synapse-border)] rounded-md overflow-hidden flex flex-col shadow-sm order-2 lg:order-1 ${activeTab === 'connections' ? 'hidden lg:flex' : ''}`}>
          <div className="px-5 py-4 border-b border-[var(--synapse-border)] bg-[var(--synapse-surface-hover)]/40">
            <h2 className="text-md font-semibold tracking-wide text-[var(--synapse-text)]">
              Posts {filteredPosts.length > 0 && <span className="text-sm text-[var(--synapse-text)]">({filteredPosts.length})</span>}
            </h2>
          </div>
          <div className="flex-1 max-h-[calc(100vh-250px)] overflow-y-auto scrollbar-hide p-4 space-y-4">
            {loadingPosts && posts.length === 0 ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--synapse-blue)]" />
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="flex justify-center py-72 text-center">
                <p className="text-lg font-semibold text-[var(--synapse-text)]">
                   {posts.length === 0 ? `@${profileUser.username} has no posts yet` : 'No posts match your search'}
                </p>
              </div>
            ) : (
              filteredPosts.map((post) => (
                <article
                  key={post._id}
                  className="p-3 rounded-md border border-gray-700 bg-[var(--synapse-bg)]/50 hover:border-[var(--synapse-text-muted)]/20 transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <Link
                      to={`/profile/${post.user?.username}`}
                      className="flex items-center gap-3 min-w-0 flex-1"
                    >
                      <img
                        src={post.user?.avatar || '/default-avatar.jpg'}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover border-2 border-[var(--synapse-border)] flex-shrink-0 ring-1 ring-[var(--synapse-surface)]"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-[var(--synapse-text)] truncate text-sm">
                          {/* post API might not populate community always, check structure */}
                          {post.community?.name ? `#${post.community.name.replace(/\s+/g, '')}` : post.user?.username}
                        </p>
                        <p className="text-xs text-[var(--synapse-text-muted)] font-medium">
                          {formatTimeAgo(new Date(post.createdAt))}
                        </p>
                      </div>
                    </Link>
                  </div>
                  {post.caption && (
                    <p className="text-sm text-[var(--synapse-text)] mb-2 line-clamp-2 leading-relaxed">{post.caption}</p>
                  )}
                  {post.mediaUrl && post.mediaType === 'image' && (
                    <Link
                      to={`/community/${post.community?._id}`}
                      className="block rounded-md overflow-hidden border mb-3"
                      style={{ borderColor: 'rgba(83, 81, 81, 0.93)' }}
                    >
                      <img
                        src={post.mediaUrl}
                        alt=""
                        className="w-full aspect-video object-cover"
                      />
                    </Link>
                  )}
                   {/* Actions (Like/Comment only, no Delete for visitor) */}
                  <div className="flex items-center gap-5 pt-1">
                    <button
                      className="flex items-center gap-1.5 transition-colors group"
                      style={{ color: 'var(--synapse-text-secondary)' }}
                    >
                      <Heart className="w-5 h-5 group-hover:text-red-500" />
                      <span className="text-sm font-medium">{post.likesCount ?? 0}</span>
                    </button>
                    <button
                      className="flex items-center gap-1.5 transition-colors hover:text-[var(--synapse-blue)]"
                      style={{ color: 'var(--synapse-text-secondary)' }}
                    >
                      <MessageSquare className="w-5 h-5" />
                      <span className="text-sm font-medium">{post.commentsCount ?? 0}</span>
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>

        {/* Profile Card - right side */}
        <div className={`order-1 lg:order-2 ${activeTab === 'posts' ? 'hidden lg:block' : ''}`}>
          <div className="relative bg-[var(--synapse-surface)]/80 backdrop-blur-sm border border-[var(--synapse-border)] rounded-md p-4 sm:p-6 h-fit sticky top-4">
            
            {/* Edit Profile Link or Follow Button */}
            {isOwnProfile ? (
              <Link 
                to="/settings" 
                className="absolute top-4 right-4 flex items-center gap-1.5 text-xs text-[var(--synapse-text-muted)] hover:text-[var(--synapse-blue)] transition-colors"
              >
                <Pencil className="w-5 h-5" />
              </Link>
            ) : (
                <button
                    onClick={handleFollowToggle}
                    className={`absolute top-4 right-4 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1 ${
                        isFollowing
                        ? 'bg-[var(--synapse-surface-hover)] border border-[var(--synapse-border)] text-[var(--synapse-text)] hover:border-red-500/50 hover:text-red-400'
                        : 'bg-[var(--synapse-blue)] text-white hover:opacity-90'
                    }`}
                >
                    {isFollowing ? 'Following' : 'Follow'}
                </button>
            )}

            {/* Avatar Section */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative mb-4">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border-2 border-[var(--synapse-border)] overflow-hidden shadow-lg">
                  <img 
                    src={profileUser.avatar || "/default-avatar.jpg"} 
                    alt={profileUser.username} 
                    className="w-full h-full object-cover"
                  />
                </div>
                 {/* Online Status - Only show if it matches some criteria or just remove for others if not realtime? 
                     Personal.tsx has it hardcoded roughly. I'll keep it for consistency visually. 
                  */}
                <div className="absolute bottom-1 right-1 flex items-center gap-1 bg-[var(--synapse-surface)] px-1.5 py-0.5 rounded-full border border-[var(--synapse-border)]">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-[10px] text-emerald-400 font-medium">Online</span>
                </div>
              </div>

              <h2 className="text-xl font-bold text-[var(--synapse-text)] mb-1">
                {profileUser.fullName || profileUser.username}
                 {profileUser.isVerified && (
                     <span className="ml-1 text-[var(--synapse-blue)] inline-block" title="Verified">
                        <Check className="w-4 h-4" /> 
                        {/* Or use the check icon if available */}
                     </span>
                 )}
              </h2>
              <p className="text-[var(--synapse-text-muted)] text-sm">@{profileUser.username}</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
              <button
                onClick={() => setModalType('followers')}
                className="text-center p-3 rounded-lg bg-[var(--synapse-surface-hover)]/50 hover:bg-[var(--synapse-surface-hover)] transition-colors cursor-pointer"
              >
                <p className="text-[var(--synapse-text)] text-md font-medium mb-1">Followers</p>
                <p className="text-2xl font-bold text-[var(--synapse-text)]">{followers.length}</p>
              </button>
              <button
                onClick={() => setModalType('following')}
                className="text-center p-3 rounded-lg bg-[var(--synapse-surface-hover)]/50 hover:bg-[var(--synapse-surface-hover)] transition-colors cursor-pointer"
              >
                <p className="text-[var(--synapse-text)] text-md font-medium mb-1">Following</p>
                <p className="text-2xl font-bold text-[var(--synapse-text)]">{following.length}</p>
              </button>
            </div>

            {/* Bio */}
            {profileUser.bio && (
              <div className="border-t border-[var(--synapse-border)] pt-4 mb-4">
                <p className="text-[var(--synapse-text)] text-md font-semibold mb-2">About</p>
                <p className="text-[var(--synapse-text-muted)] text-sm leading-relaxed">{profileUser.bio}</p>
              </div>
            )}

            {/* Stats */}
            <div className="border-t border-[var(--synapse-border)] pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[var(--synapse-text)] text-md font-semibold">Communities</span>
                <span className="text-[var(--synapse-text)] font-semibold">{joinedCommunities.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--synapse-text)] text-md font-semibold">Total Posts</span>
                <span className="text-[var(--synapse-text)] font-semibold">{totalPostsCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Followers/Following Modal */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setModalType(null)}
          />
          
          {/* Modal */}
          <div className="relative bg-[var(--synapse-surface)] border border-[var(--synapse-border)] rounded-md w-full max-w-md max-h-[70vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--synapse-border)] bg-[var(--synapse-surface-hover)]/40">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[var(--synapse-white)]" />
                <h3 className="text-lg font-semibold text-[var(--synapse-text)]">
                  {modalType === 'followers' ? 'Followers' : 'Following'}
                </h3>
                <span className="text-sm text-[var(--synapse-text-muted)]">
                  ({modalType === 'followers' ? followers.length : following.length})
                </span>
              </div>
              <button
                onClick={() => setModalType(null)}
                className="p-1.5 rounded-lg hover:bg-[var(--synapse-surface-hover)] text-[var(--synapse-text-muted)] hover:text-[var(--synapse-text)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* List */}
            <div className="overflow-y-auto max-h-[calc(70vh-60px)] scrollbar-hide">
              {(modalType === 'followers' ? followers : following).length === 0 ? (
                <p className="px-5 py-10 text-center text-[var(--synapse-text-muted)] text-sm">
                  {modalType === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
                </p>
              ) : (
                <ul className="divide-y divide-[var(--synapse-border)]">
                  {(modalType === 'followers' ? followers : following).map((item) => {
                    const user = modalType === 'followers' 
                      ? (item as FollowerItem).follower 
                      : (item as FollowingItem).following;
                    if (!user?._id) return null;
                    
                
                    return (
                      <li key={user._id} className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--synapse-surface-hover)]/50 transition-colors">
                        <Link 
                          to={`/profile/${user.username}`} 
                          className="flex items-center gap-3 flex-1 min-w-0"
                          onClick={() => setModalType(null)}
                        >
                          <img 
                            src={user.avatar || '/default-avatar.jpg'} 
                            alt={user.username} 
                            className="w-11 h-11 rounded-full object-cover border-2 border-[var(--synapse-border)] flex-shrink-0" 
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-[var(--synapse-text)] truncate">{user.fullName || user.username}</p>
                            <p className="text-sm text-[var(--synapse-text-muted)] truncate">@{user.username}</p>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
