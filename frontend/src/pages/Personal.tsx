import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  X,
  Loader2,
  MessageSquare,
  Heart,
  MoreHorizontal,
  Trash2,
  Users,
  Pencil,
} from 'lucide-react';
import { userAPI, communityPostAPI, communityAPI } from '@/lib/api';
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

interface CommunityPost {
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

export default function PersonalPage() {
  const { user: currentUser } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab] = useState<Tab>('connections'); // Fixed: Removed unused setActiveTab

  /* Search State */
  const [searchResults, setSearchResults] = useState<ConnectionUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Debounced search
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim()) {
        setIsSearching(true);
        try {
          const response = await userAPI.searchUsers(searchQuery);
          const results = response.data.data || [];
          setSearchResults(Array.isArray(results) ? results : []);
          setShowSearchResults(true);
        } catch (error) {
          console.error("Search failed:", error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Handle follow from search results
  const handleSearchFollow = async (user: ConnectionUser) => {
       if (!currentUser || user._id === currentUser._id) return;
       
       const isAlreadyFollowing = following.some(f => f.following && f.following._id === user._id);
       const currentStatus = followState[user._id] ?? isAlreadyFollowing;
       const newStatus = !currentStatus;
       
       setFollowState(prev => ({ ...prev, [user._id]: newStatus }));
       
       try {
           await userAPI.followUnfollow(user._id);
           toast.success(newStatus ? 'Following' : 'Unfollowed');
           fetchConnections();
       } catch (error: any) {
           setFollowState(prev => ({ ...prev, [user._id]: currentStatus })); // Revert
           toast.error(error.response?.data?.message || 'Action failed');
       }
  };



  const [followers, setFollowers] = useState<FollowerItem[]>([]);
  const [following, setFollowing] = useState<FollowingItem[]>([]);
  const [joinedCommunities, setJoinedCommunities] = useState<any[]>([]);





  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [postsPage, setPostsPage] = useState(1);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [modalType, setModalType] = useState<'followers' | 'following' | null>(null);



  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [followState, setFollowState] = useState<Record<string, boolean>>({});
  const menuRef = useRef<HTMLDivElement>(null);

  const userId = currentUser?._id;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuPostId(null);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);



  const fetchConnections = async () => {
    if (!userId) return;
    try {
      const [followersRes, followingRes] = await Promise.all([
        userAPI.getFollowers(userId),
        userAPI.getFollowing(userId),
      ]);
      const f = followersRes.data?.data?.followers ?? [];
      const g = followingRes.data?.data?.following ?? [];
      setFollowers(Array.isArray(f) ? f : []);
      setFollowing(Array.isArray(g) ? g : []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load connections');
    }
  };

  useEffect(() => {
    fetchConnections();
  }, [userId]);

  const fetchJoinedCommunities = async () => {
    if (!userId) return;
    try {
      const res = await communityAPI.getJoined();
      setJoinedCommunities(res.data?.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchJoinedCommunities();
  }, [userId]);







  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      setLoadingPosts(true);
      try {
        const res = await communityPostAPI.getJoinedFeed(1, 15);
        const list = res.data?.data?.posts ?? res.data?.data ?? [];
        setPosts(Array.isArray(list) ? list : []);
        setHasMorePosts(!!res.data?.data?.hasNext);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load posts');
      } finally {
        setLoadingPosts(false);
      }
    };
    load();
  }, [userId]);

  const loadMorePosts = async () => {
    if (!userId || !hasMorePosts || loadingPosts) return;
    setLoadingPosts(true);
    try {
      const res = await communityPostAPI.getJoinedFeed(postsPage + 1, 15);
      const list = res.data?.data?.posts ?? res.data?.data ?? [];
      if (Array.isArray(list) && list.length) {
        setPosts((prev) => [...prev, ...list]);
        setPostsPage((p) => p + 1);
      }
      setHasMorePosts(!!res.data?.data?.hasNext);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPosts(false);
    }
  };



  const handleDeletePost = async (postId: string) => {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    setOpenMenuPostId(null);
    setDeletingPostId(postId);
    try {
      await communityPostAPI.delete(postId);
      setPosts((prev) => prev.filter((p) => p._id !== postId));
      toast.success('Post deleted');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to delete post');
    } finally {
      setDeletingPostId(null);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--synapse-text-muted)]" />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300 h-full overflow-hidden flex flex-col">
      {/* Search - sharp, modern */}
      <div className="mb-8 relative z-50">
        <div className="relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--synapse-text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery && setShowSearchResults(true)}
            placeholder="Search communities or users..." // Updated placeholder logic if needed, but keeping simple
            className="w-full pl-11 pr-11 py-3.5 bg-[var(--synapse-surface)] border border-[var(--synapse-border)] rounded-md text-[var(--synapse-text)] placeholder:text-[var(--synapse-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--synapse-blue)]/40 focus:border-[var(--synapse-blue)] transition-all text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setShowSearchResults(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-[var(--synapse-surface-hover)] text-[var(--synapse-text-muted)] hover:text-[var(--synapse-text)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Search Results Dropdown */}
          {showSearchResults && searchQuery && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--synapse-surface)] border border-[var(--synapse-border)] rounded-lg shadow-xl overflow-hidden max-h-[400px] overflow-y-auto">
                  {isSearching ? (
                      <div className="p-4 flex justify-center">
                          <Loader2 className="w-6 h-6 animate-spin text-[var(--synapse-blue)]" />
                      </div>
                  ) : searchResults.length > 0 ? (
                      <ul>
                          {searchResults.map(user => {
                              const isMe = user._id === currentUser?._id;
                              // Check follow status
                              // We verify against the 'following' list we fetched
                              const isFollowingThisUser = followState[user._id] ?? following.some(f => f.following._id === user._id);
                              
                              return (
                                  <li key={user._id} className="flex items-center justify-between p-3 hover:bg-[var(--synapse-surface-hover)] transition-colors border-b border-[var(--synapse-border)] last:border-0">
                                      <Link 
                                        to={`/profile/${user.username}`}
                                        className="flex items-center gap-3 flex-1 min-w-0"
                                        onClick={() => setShowSearchResults(false)}
                                      >
                                          <img 
                                            src={user.avatar || "/default-avatar.jpg"} 
                                            alt={user.username}
                                            className="w-10 h-10 rounded-full object-cover border border-[var(--synapse-border)]"
                                          />
                                          <div className="min-w-0">
                                              <p className="text-sm font-semibold text-[var(--synapse-text)] truncate">{user.fullName || user.username}</p>
                                              <p className="text-xs text-[var(--synapse-text-muted)] truncate">@{user.username}</p>
                                          </div>
                                      </Link>
                                      
                                      {!isMe && (
                                          <button
                                              onClick={(e) => {
                                                  e.preventDefault();
                                                  e.stopPropagation();
                                                  handleSearchFollow(user);
                                              }}
                                              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                                                  isFollowingThisUser
                                                  ? 'bg-[var(--synapse-surface-hover)] border border-[var(--synapse-border)] text-[var(--synapse-text)] hover:border-red-500/50 hover:text-red-400'
                                                  : 'bg-[var(--synapse-blue)] text-white hover:opacity-90'
                                              }`}
                                          >
                                              {isFollowingThisUser ? 'Following' : 'Follow'}
                                          </button>
                                      )}
                                  </li>
                              );
                          })}
                      </ul>
                  ) : (
                      <div className="p-4 text-center text-sm text-[var(--synapse-text-muted)]">
                          No users found.
                      </div>
                  )}
              </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_390px] gap-6">
        {/* Posts - left panel */}
        <div className={`bg-[var(--synapse-surface)] h-[80vh] border border-[var(--synapse-border)] rounded-md overflow-hidden flex flex-col shadow-sm ${activeTab === 'connections' ? 'hidden lg:flex' : ''}`}>
          <div className="px-5 py-4 border-b border-[var(--synapse-border)] bg-[var(--synapse-surface-hover)]/40">
            <h2 className="text-md font-semibold tracking-wide text-[var(--synapse-text)]">
              Your Posts  {posts.length}
            </h2>
          </div>
          <div className="flex-1 max-h-[calc(100vh-250px)] overflow-y-auto scrollbar-hide p-4 space-y-4">
            {loadingPosts && posts.length === 0 ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--synapse-blue)]" />
              </div>
            ) : posts.length === 0 ? (
              <div className="flex justify-center py-72 text-center">
                <p className="  text-lg font-semibold">You have no Posts </p>
              </div>
            ) : (
              posts.map((post) => (
                <article
                  key={post._id}
                  className="p-4 rounded-xl border border-[var(--synapse-border)] bg-[var(--synapse-bg)]/50 hover:border-[var(--synapse-text-muted)]/20 transition-all duration-200"
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
                          {post.community?.name ? `#${post.community.name.replace(/\s+/g, '')}` : post.user?.username}
                        </p>
                        <p className="text-xs text-[var(--synapse-text-muted)] font-medium">
                          {formatTimeAgo(new Date(post.createdAt))}
                        </p>
                      </div>
                    </Link>
                    {post.user?._id === currentUser?._id && (
                      <div className="relative flex-shrink-0" ref={openMenuPostId === post._id ? menuRef : null}>
                        <button
                          type="button"
                          onClick={() => setOpenMenuPostId((id) => (id === post._id ? null : post._id))}
                          disabled={deletingPostId === post._id}
                          className="p-2 rounded-lg hover:bg-[var(--synapse-surface-hover)] text-[var(--synapse-text-muted)] hover:text-[var(--synapse-text)] transition-colors disabled:opacity-50"
                        >
                          {deletingPostId === post._id ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <MoreHorizontal className="w-5 h-5" />
                          )}
                        </button>
                        {openMenuPostId === post._id && (
                          <div className="absolute right-0 top-full mt-1 w-40 py-1 bg-[var(--synapse-surface)] border border-[var(--synapse-border)] rounded-lg shadow-lg z-10">
                            <button
                              type="button"
                              onClick={() => handleDeletePost(post._id)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors rounded-md"
                            >
                              <Trash2 className="w-4 h-4 flex-shrink-0" />
                              Delete post
                            </button>
                          </div>
                        )}
                      </div>
                    )}
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
            {hasMorePosts && posts.length > 0 && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={loadMorePosts}
                  disabled={loadingPosts}
                  className="text-sm font-medium text-[var(--synapse-blue)] hover:underline disabled:opacity-50 transition-opacity"
                >
                  {loadingPosts ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Profile Card - right side */}
        <div className={`${activeTab === 'posts' ? 'hidden lg:block' : ''}`}>
          <div className="relative bg-[var(--synapse-surface)]/80 backdrop-blur-sm border border-[var(--synapse-border)] rounded-md p-6 h-fit sticky top-4">
            {/* Edit Profile Link - Top Right */}
            <Link 
              to="/settings" 
              className="absolute top-4 right-4 flex items-center gap-1.5 text-xs text-[var(--synapse-text-muted)] hover:text-[var(--synapse-blue)] transition-colors"
            >
              <Pencil className="w-5 h-5" />
            </Link>
            {/* Avatar Section */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative mb-4">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border-2 border-[var(--synapse-border)] overflow-hidden shadow-lg">
                  <img 
                    src={currentUser?.avatar || "/default-avatar.jpg"} 
                    alt={currentUser?.username} 
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Active Status */}
                <div className="absolute bottom-1 right-1 flex items-center gap-1 bg-[var(--synapse-surface)] px-1.5 py-0.5 rounded-full border border-[var(--synapse-border)]">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-[10px] text-emerald-400 font-medium">Online</span>
                </div>
              </div>

              <h2 className="text-xl font-bold text-[var(--synapse-text)] mb-1">
                {currentUser?.fullName || currentUser?.username}
              </h2>
              <p className="text-[var(--synapse-text-muted)] text-sm">@{currentUser?.username}</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
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
            {currentUser?.bio && (
              <div className="border-t border-[var(--synapse-border)] pt-4 mb-4">
                <p className="text-[var(--synapse-text)] text-md font-semibold mb-2">About</p>
                <p className="text-[var(--synapse-text-muted)] text-sm leading-relaxed">-{currentUser.bio}</p>
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
                <span className="text-[var(--synapse-text)] font-semibold">{posts.length}</span>
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
                    
                    // For followers tab, check if we're following them back (check if they're in our following list)
                    // For following tab, they are always "following" by default (user IS following them)
                    const followingIds = following.map(f => f.following?._id);
                    const defaultFollowState = modalType === 'following' ? true : followingIds.includes(user._id);
                    const isFollowingUser = followState[user._id] ?? defaultFollowState;
                    const isCurrentUser = user._id === currentUser?._id;
                    
                    const handleFollowClick = async () => {
                      if (!currentUser || isCurrentUser) return;
                      const prevState = followState[user._id];
                      setFollowState(s => ({ ...s, [user._id]: !isFollowingUser }));
                      try {
                        await userAPI.followUnfollow(user._id);
                        toast.success(!isFollowingUser ? 'Following' : 'Unfollowed');
                        // Refresh connections
                        fetchConnections();
                      } catch (e: any) {
                        setFollowState(s => ({ ...s, [user._id]: prevState }));
                        toast.error(e.response?.data?.message || 'Action failed');
                      }
                    };
                    
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
                        {!isCurrentUser && (
                          <button
                            onClick={handleFollowClick}
                            className={`flex-shrink-0 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                              isFollowingUser 
                                ? 'bg-[var(--synapse-surface-hover)] border border-[var(--synapse-border)] text-[var(--synapse-text)] hover:border-red-500/50 hover:text-red-400'
                                : 'bg-[var(--synapse-blue)] text-white hover:opacity-90' 
                            }`}
                          >
                            {isFollowingUser ? 'Following' : 'Follow'}
                          </button>
                        )}
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
