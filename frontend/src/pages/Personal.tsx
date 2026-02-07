import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  X,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Users,
  Trash2,
} from 'lucide-react';
import { userAPI, communityPostAPI } from '@/lib/api';
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
  const [activeTab, setActiveTab] = useState<Tab>('connections');

  const [followers, setFollowers] = useState<FollowerItem[]>([]);
  const [following, setFollowing] = useState<FollowingItem[]>([]);
  const [followersPage, setFollowersPage] = useState(1);
  const [followingPage, setFollowingPage] = useState(1);
  const [hasMoreFollowers, setHasMoreFollowers] = useState(true);
  const [hasMoreFollowing, setHasMoreFollowing] = useState(true);
  const [loadingConnections, setLoadingConnections] = useState(true);

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [postsPage, setPostsPage] = useState(1);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);

  const [searchResults, setSearchResults] = useState<ConnectionUser[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [followState, setFollowState] = useState<Record<string, boolean>>({});
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const userId = currentUser?._id;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuPostId(null);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allConnections = useMemo(() => {
    const map = new Map<string, { user: ConnectionUser; isFollowing: boolean }>();
    following.forEach((item) => {
      const u = item.following;
      if (u?._id) map.set(u._id, { user: u, isFollowing: true });
    });
    followers.forEach((item) => {
      const u = item.follower;
      if (u?._id && !map.has(u._id)) map.set(u._id, { user: u, isFollowing: false });
    });
    return Array.from(map.values());
  }, [followers, following]);

  const filteredConnections = useMemo(() => {
    if (!searchQuery.trim()) return allConnections;
    const q = searchQuery.toLowerCase().trim();
    return allConnections.filter(
      (c) =>
        c.user.username?.toLowerCase().includes(q) ||
        (c.user.fullName && c.user.fullName.toLowerCase().includes(q))
    );
  }, [allConnections, searchQuery]);

  const displayConnections = searchQuery.trim().length >= 2 && searchResults !== null
    ? searchResults.map((u) => ({
        user: u,
        isFollowing: followState[u._id] ?? false,
      }))
    : filteredConnections.map((c) => ({
        user: c.user,
        isFollowing: followState[c.user._id] ?? c.isFollowing,
      }));

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      setLoadingConnections(true);
      try {
        const [followersRes, followingRes] = await Promise.all([
          userAPI.getFollowers(userId),
          userAPI.getFollowing(userId),
        ]);
        const f = followersRes.data?.data?.followers ?? [];
        const g = followingRes.data?.data?.following ?? [];
        setFollowers(Array.isArray(f) ? f : []);
        setFollowing(Array.isArray(g) ? g : []);
        setHasMoreFollowers(followersRes.data?.data?.hasNext === true);
        setHasMoreFollowing(followingRes.data?.data?.hasNext === true);
        const nextState: Record<string, boolean> = {};
        (Array.isArray(f) ? f : []).forEach((item: FollowerItem) => {
          if (item.follower?._id) nextState[item.follower._id] = false;
        });
        (Array.isArray(g) ? g : []).forEach((item: FollowingItem) => {
          if (item.following?._id) nextState[item.following._id] = true;
        });
        setFollowState((s) => ({ ...s, ...nextState }));
      } catch (e) {
        console.error(e);
        toast.error('Failed to load connections');
      } finally {
        setLoadingConnections(false);
      }
    };
    load();
  }, [userId]);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await userAPI.searchUsers(searchQuery.trim());
        const list = data?.data;
        setSearchResults(Array.isArray(list) ? list : list ? [list] : []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const loadMoreConnections = async () => {
    if (!userId || (!hasMoreFollowers && !hasMoreFollowing) || loadingConnections) return;
    setLoadingConnections(true);
    try {
      if (hasMoreFollowing) {
        const res = await userAPI.getFollowing(userId);
        const list = res.data?.data?.following ?? [];
        if (list.length) {
          setFollowing((prev) => [...prev, ...list]);
          setFollowingPage((p) => p + 1);
          list.forEach((item: FollowingItem) => {
            if (item.following?._id) setFollowState((s) => ({ ...s, [item.following._id]: true }));
          });
        }
        setHasMoreFollowing(!!res.data?.data?.hasNext);
      }
      if (hasMoreFollowers && !hasMoreFollowing) {
        const res = await userAPI.getFollowers(userId);
        const list = res.data?.data?.followers ?? [];
        if (list.length) {
          setFollowers((prev) => [...prev, ...list]);
          setFollowersPage((p) => p + 1);
          list.forEach((item: FollowerItem) => {
            if (item.follower?._id) setFollowState((s) => ({ ...s, [item.follower._id]: false }));
          });
        }
        setHasMoreFollowers(!!res.data?.data?.hasNext);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingConnections(false);
    }
  };

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

  const handleFollowToggle = async (targetUserId: string, currentlyFollowing: boolean) => {
    if (!currentUser || targetUserId === currentUser._id) return;
    const prev = followState[targetUserId];
    setFollowState((s) => ({ ...s, [targetUserId]: !currentlyFollowing }));
    try {
      await userAPI.followUnfollow(targetUserId);
      toast.success(!currentlyFollowing ? 'Following' : 'Unfollowed');
    } catch (e: any) {
      setFollowState((s) => ({ ...s, [targetUserId]: prev }));
      toast.error(e.response?.data?.message || 'Action failed');
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

  const followersCount = currentUser.followersCount ?? 0;
  const followingCount = currentUser.followingCount ?? 0;

  return (
    <div className="animate-in fade-in duration-300">
      {/* Search - sharp, modern */}
      <div className="mb-8">
        <div className="relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--synapse-text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by usernames..."
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

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_400px] gap-6">
        {/* Posts - left panel */}
        <div className={`bg-[var(--synapse-surface)] border border-[var(--synapse-border)] rounded-md overflow-hidden flex flex-col shadow-sm ${activeTab === 'connections' ? 'hidden lg:flex' : ''}`}>
          <div className="px-5 py-4 border-b border-[var(--synapse-border)] bg-[var(--synapse-surface-hover)]/40">
            <h2 className="text-md font-semibold tracking-wide text-[var(--synapse-text)]">
              Your Posts
            </h2>
          </div>
          <div className="flex-1 max-h-[calc(100vh-250px)] overflow-y-auto p-4 space-y-4">
            {loadingPosts && posts.length === 0 ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--synapse-blue)]" />
              </div>
            ) : posts.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-[var(--synapse-text-muted)] text-sm font-medium">No posts from your communities yet</p>
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
                  <div className="flex items-center gap-5 text-sm text-[var(--synapse-text-muted)] pt-1">
                    <span className="flex items-center gap-1.5 font-medium">
                      <MessageCircle className="w-4 h-4" />
                      {post.commentsCount ?? 0}
                    </span>
                    <span className="font-medium">♥ {post.likesCount ?? 0}</span>
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

        {/* Followers & Following - two separate boxes like post cards */}
        <div className={`flex flex-col gap-6 ${activeTab === 'posts' ? 'hidden lg:flex' : ''}`}>
          {loadingConnections ? (
            <div className="flex justify-center py-16 rounded-xl border border-[var(--synapse-border)] bg-[var(--synapse-surface)] p-8">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--synapse-blue)]" />
            </div>
          ) : (
            <>
              {/* Followers box - card style, ~5 visible */}
              <div className="rounded-md border border-[var(--synapse-border)] bg-[var(--synapse-bg)]/50 overflow-hidden shadow-sm flex flex-col">
                <div className="px-4 py-3.5 flex items-center gap-2 border-b border-[var(--synapse-border)] bg-[var(--synapse-surface-hover)]/40">
                  <Users className="w-4 h-4 text-[var(--synapse-blue)]" />
                  <h3 className="text-sm font-semibold tracking-wide text-[var(--synapse-text)]">
                    Followers {followers.length > 0 && <span className="text-[var(--synapse-text-muted)] font-medium">({followers.length})</span>}
                  </h3>
                </div>
                <div className="max-h-[320px] overflow-y-auto scrollbar-hide min-h-[250px]">
                  {followers.length === 0 ? (
                    <p className="px-4 py-8 text-center text-[var(--synapse-text-muted)] text-sm font-medium">No followers yet</p>
                  ) : (
                    <ul className="divide-y divide-[var(--synapse-border)]">
                      {followers.map((item) => {
                        const user = item.follower;
                        if (!user?._id) return null;
                        const isFollowing = followState[user._id] ?? false;
                        return (
                          <li key={user._id} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--synapse-surface-hover)]/50 transition-colors">
                            <Link to={`/profile/${user.username}`} className="flex items-center gap-3 flex-1 min-w-0">
                              <img src={user.avatar || '/default-avatar.jpg'} alt={user.username} className="w-10 h-10 rounded-full object-cover border-2 border-[var(--synapse-border)] flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-[var(--synapse-text)] truncate text-sm">{user.fullName || user.username}</p>
                                <p className="text-xs text-[var(--synapse-text-muted)] truncate font-medium">@{user.username}</p>
                              </div>
                            </Link>
                            {user._id !== currentUser._id && (
                              <button onClick={() => handleFollowToggle(user._id, isFollowing)} className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${isFollowing ? 'bg-[var(--synapse-surface-hover)] border border-[var(--synapse-border)] text-[var(--synapse-text)] cursor-pointer' : 'bg-[var(--synapse-blue)] text-white hover:opacity-90'}`}>
                                {isFollowing ? 'Following' : 'Follow'}
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>

              {/* Following box - card style, ~5 visible */}
              <div className="rounded-md border border-[var(--synapse-border)] bg-[var(--synapse-bg)]/50 overflow-hidden shadow-sm flex flex-col">
                <div className="px-4 py-3.5 flex items-center gap-2 border-b border-[var(--synapse-border)] bg-[var(--synapse-surface-hover)]/40">
                  <Users className="w-4 h-4 text-[var(--synapse-blue)]" />
                  <h3 className="text-sm font-semibold tracking-wide text-[var(--synapse-text)]">
                    Following {following.length > 0 && <span className="text-[var(--synapse-text-muted)] font-medium">({following.length})</span>}
                  </h3>
                </div>
                <div className="max-h-[320px] overflow-y-auto scrollbar-hide min-h-[250px]">
                  {following.length === 0 ? (
                    <p className="px-4 py-8 text-center text-[var(--synapse-text-muted)] text-sm font-medium">Not following anyone yet</p>
                  ) : (
                    <ul className="divide-y divide-[var(--synapse-border)]">
                      {following.map((item) => {
                        const user = item.following;
                        if (!user?._id) return null;
                        const isFollowing = followState[user._id] ?? true;
                        return (
                          <li key={user._id} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--synapse-surface-hover)]/50 transition-colors">
                            <Link to={`/profile/${user.username}`} className="flex items-center gap-3 flex-1 min-w-0">
                              <img src={user.avatar || '/default-avatar.jpg'} alt={user.username} className="w-10 h-10 rounded-full object-cover border-2 border-[var(--synapse-border)] flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-[var(--synapse-text)] truncate text-sm">{user.fullName || user.username}</p>
                                <p className="text-xs text-[var(--synapse-text-muted)] truncate font-medium">@{user.username}</p>
                              </div>
                            </Link>
                            {user._id !== currentUser._id && (
                              <button onClick={() => handleFollowToggle(user._id, isFollowing)} className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${isFollowing ? 'bg-[var(--synapse-surface-hover)] border border-[var(--synapse-border)] text-[var(--synapse-text)] cursor-pointer' : 'bg-[var(--synapse-blue)] text-white hover:opacity-90'}`}>
                                {isFollowing ? 'Following' : 'Follow'}
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
