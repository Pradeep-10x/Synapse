import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, ArrowLeft, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { communityAPI, communityPostAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { useCommunityStore } from '@/store/communityStore';
import CommunityPostCard from '@/components/feed/CommunityPostCard';
import { DiscoverCommunityCard } from '@/components/community/DiscoverCommunityCard';
import CreateCommunityModal from '@/components/community/CreateCommunityModal';

interface Community {
  _id: string;
  name: string;
  description: string;
  membersCount: number;
  isPublic: boolean;
  coverImage?: string;
  avatar?: string;
  creator?: {
    _id: string;
    username: string;
    avatar?: string;
  };
}

interface CommunityPost {
  _id: string;
  user: {
    _id: string;
    username: string;
    avatar?: string;
    isVerified?: boolean;
  };
  caption?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  isLiked?: boolean;
  community?: {
    _id: string;
    name: string;
    coverImage?: string;
  };
}

export default function DiscoverCommunities() {
  const { triggerRefresh } = useCommunityStore();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [communities, setCommunities] = useState<Community[]>([]);
  const [joinedCommunityIds, setJoinedCommunityIds] = useState<string[]>([]);
  const [joinedCommunitiesLoaded, setJoinedCommunitiesLoaded] = useState(false);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [loadingCommunities, setLoadingCommunities] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchJoinedCommunities();
  }, []);

  // Fetch communities after joined communities are loaded
  useEffect(() => {
    if (joinedCommunitiesLoaded) {
      fetchCommunities();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinedCommunitiesLoaded]);

  useEffect(() => {
    if (selectedCommunity) {
      fetchCommunityPosts(selectedCommunity._id, 1, false);
    }
  }, [selectedCommunity]);

  // Infinite scroll for posts
  useEffect(() => {
    if (!selectedCommunity || !hasNext || loadingPosts) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNext) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchCommunityPosts(selectedCommunity._id, nextPage, true);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasNext, loadingPosts, page, selectedCommunity]);

  const fetchJoinedCommunities = async () => {
    try {
      const response = await communityAPI.getJoined();
      const joined = response.data.data || [];
      setJoinedCommunityIds(joined.map((c: Community) => c._id));
      setJoinedCommunitiesLoaded(true);
    } catch (error) {
      console.error('Failed to fetch joined communities:', error);
      setJoinedCommunitiesLoaded(true); // Set to true even on error to allow fetching
    }
  };

  const fetchCommunities = async () => {
    try {
      setLoadingCommunities(true);
      const response = await communityAPI.getAll();
      const allCommunities = response.data.data?.communities || [];

      // Filter out joined communities and only show public ones
      // Use the current state of joinedCommunityIds
      const filtered = allCommunities.filter((c: Community) => {
        const isPublic = c.isPublic === true || c.isPublic === undefined;
        const isNotJoined = !joinedCommunityIds.includes(c._id);
        return isPublic && isNotJoined;
      });

      setCommunities(filtered);
    } catch (error: any) {
      console.error('Failed to fetch communities:', error);
      toast.error('Failed to load communities');
    } finally {
      setLoadingCommunities(false);
    }
  };

  const searchCommunities = async (query: string) => {
    if (query.trim().length < 2) {
      await fetchCommunities();
      return;
    }

    try {
      setLoadingCommunities(true);
      const response = await communityAPI.search(query);
      const allCommunities = response.data.data?.communities || [];

      // Filter out joined communities and only show public ones
      const filtered = allCommunities.filter((c: Community) => {
        const isPublic = c.isPublic === true || c.isPublic === undefined;
        const isNotJoined = !joinedCommunityIds.includes(c._id);
        return isPublic && isNotJoined;
      });

      setCommunities(filtered);
    } catch (error: any) {
      console.error('Failed to search communities:', error);
      toast.error('Failed to search communities');
    } finally {
      setLoadingCommunities(false);
    }
  };

  const fetchCommunityPosts = async (communityId: string, pageNum: number, append = false) => {
    try {
      if (append) {
        setLoadingPosts(true);
      } else {
        setLoadingPosts(true);
        setPage(1);
      }

      const response = await communityPostAPI.getPublicPosts(communityId, pageNum, 10);
      const { posts, hasNext: hasMore } = response.data.data || { posts: [], hasNext: false };

      if (append) {
        setCommunityPosts((prev) => [...prev, ...posts]);
      } else {
        setCommunityPosts(posts);
      }

      setHasNext(hasMore);
    } catch (error: any) {
      console.error('Failed to fetch community posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleJoinCommunity = async (communityId: string) => {
    try {
      setJoining(communityId);
      await communityAPI.joinCommunity(communityId);
      toast.success('Successfully joined community!');
      triggerRefresh();
      setJoinedCommunityIds(prev => [...prev, communityId]);
      setCommunities(prev => prev.filter(c => c._id !== communityId));
      // Refresh joined communities list
      await fetchJoinedCommunities();
      if (selectedCommunity?._id === communityId) {
        setSelectedCommunity(null);
        setCommunityPosts([]);
      }
      navigate(`/community/${communityId}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to join community');
    } finally {
      setJoining(null);
    }
  };

  const handleViewPosts = (community: Community) => {
    setSelectedCommunity(community);
    setPage(1);
  };

  const handleBackToDiscover = () => {
    setSelectedCommunity(null);
    setCommunityPosts([]);
    setPage(1);
    setHasNext(true);
  };

  const filteredCommunities = communities.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="animate-in fade-in duration-500 min-h-screen">
       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!selectedCommunity ? (
          <>
            {/* Header Section matching Community.tsx */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 pb-6 border-b border-[var(--synapse-border)]">
                <div>
                   <div className="flex items-center gap-4 mb-1">
                        <button
                        onClick={() => navigate('/communities')}
                        className="text-[var(--synapse-text-muted)] hover:text-[var(--synapse-text)] transition-colors p-1 -ml-1 hover:bg-[var(--synapse-surface-hover)] rounded-full"
                        >
                        <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-2xl font-bold text-[var(--synapse-text)] tracking-tight uppercase">Discover Communities</h1>
                   </div>
                    <p className="text-[var(--synapse-text-muted)] text-sm ml-9">
                        Explore <span className="text-[var(--synapse-text)] font-semibold">{filteredCommunities.length}</span> public communities and find your interests.
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--synapse-text-muted)]" />
                        <input
                        type="text"
                        placeholder="Search community..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            searchCommunities(e.target.value);
                        }}
                        className="w-full pl-9 pr-4 py-2 bg-[var(--synapse-surface)] hover:bg-[var(--synapse-surface-hover)] border border-[var(--synapse-border)] rounded-[var(--radius-md)] text-[var(--synapse-text)] text-sm placeholder-[var(--synapse-text-muted)] focus:outline-none focus:border-[var(--synapse-focus-ring)] transition-all"
                        />
                    </div>
                    {/* Create Button (Optional here, but kept for consistency if user wants to create from search) */}
                     <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--synapse-blue)] hover:bg-[var(--synapse-blue)]/90 text-white rounded-[var(--radius-md)] text-sm font-medium transition-all shadow-lg shadow-purple-900/20 whitespace-nowrap"
                    >
                        Create Community
                    </button>
                </div>
            </div>

            {/* Communities Grid */}
            {loadingCommunities ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--synapse-text-muted)]" />
              </div>
            ) : filteredCommunities.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                {filteredCommunities.map((community, index) => (
                  <motion.div
                    key={community._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                      <DiscoverCommunityCard 
                        community={community}
                        onJoin={handleJoinCommunity}
                        isJoining={joining === community._id}
                        onView={handleViewPosts}
                      />
                  </motion.div>
                ))}
              </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-[var(--synapse-border)] rounded-[var(--radius-lg)] bg-[var(--synapse-surface)]/30">
                <Users className="w-12 h-12 text-[var(--synapse-text-muted)] mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-[var(--synapse-text)] mb-2">No communities found</h3>
                <p className="text-[var(--synapse-text-muted)] max-w-sm mb-6">
                    Try adjusting your search terms or be the first to start a new domain.
                </p>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-6 py-2 bg-[var(--synapse-blue)] text-white font-medium rounded-[var(--radius-md)] hover:bg-[var(--synapse-blue)]/90 transition-colors shadow-lg shadow-purple-900/20"
                >
                    Create New Domain
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Community Posts View - Keeping consistent with original but themed */}
             <div className="mb-6 pb-4 border-b border-[var(--synapse-border)]">
              <div className="flex items-center gap-4 mb-4">
                <button
                  onClick={handleBackToDiscover}
                  className="text-[var(--synapse-text-muted)] hover:text-[var(--synapse-text)] transition-colors p-2 hover:bg-[var(--synapse-surface)] rounded-full"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-[var(--radius-md)] bg-[var(--synapse-bg)] border border-[var(--synapse-border)] overflow-hidden flex items-center justify-center">
                    {selectedCommunity.avatar ? (
                      <img src={selectedCommunity.avatar || "/default-avatar.jpg"} alt={selectedCommunity.name} className="w-full h-full object-cover" />
                    ) : selectedCommunity.coverImage ? (
                      <img src={selectedCommunity.coverImage} alt={selectedCommunity.name} className="w-full h-full object-cover opacity-50" />
                    ) : (
                      <Users className="w-6 h-6 text-[var(--synapse-blue)]" />
                    )}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-[var(--synapse-text)]">o/{selectedCommunity.name}</h1>
                    <p className="text-sm text-[var(--synapse-text-muted)]">{(selectedCommunity.membersCount || 0).toLocaleString()} members</p>
                  </div>
                </div>
                {!joinedCommunityIds.includes(selectedCommunity._id) && (
                  <button
                    onClick={() => handleJoinCommunity(selectedCommunity._id)}
                    disabled={joining === selectedCommunity._id}
                    className="ml-auto px-6 py-2.5 bg-[var(--synapse-blue)] hover:bg-[var(--synapse-blue)]/90 rounded-[var(--radius-md)] text-white font-semibold transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-purple-900/20"
                  >
                    {joining === selectedCommunity._id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Joining...
                      </>
                    ) : (
                      'Join Community'
                    )}
                  </button>
                )}
              </div>
              <div className="bg-[var(--synapse-surface)] border border-[var(--synapse-border)] rounded-[var(--radius-md)] p-4">
                <p className="text-[var(--synapse-text-muted)]">{selectedCommunity.description}</p>
              </div>
            </div>

            {/* Posts */}
            <div className="max-w-2xl mx-auto">
              {loadingPosts && communityPosts.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[var(--synapse-blue)]" />
                </div>
              ) : communityPosts.length > 0 ? (
                <div className="space-y-6">
                  {communityPosts.map((post) => (
                    <CommunityPostCard
                      key={post._id}
                      post={post}
                    />
                  ))}
                  {hasNext && (
                    <div ref={observerTarget} className="flex items-center justify-center py-8">
                      {loadingPosts && <Loader2 className="w-6 h-6 animate-spin text-[var(--synapse-blue)]" />}
                    </div>
                  )}
                  {!hasNext && communityPosts.length > 0 && (
                    <div className="text-center py-8 border-t border-[var(--synapse-border)] mt-8">
                      <p className="text-[var(--synapse-text-muted)] text-sm">No more posts to load</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-20 border border-dashed border-[var(--synapse-border)] rounded-[var(--radius-lg)] bg-[var(--synapse-surface)]/30">
                  <Users className="w-12 h-12 text-[var(--synapse-text-muted)] mx-auto mb-4 opacity-50" />
                  <p className="text-[var(--synapse-text)] font-medium mb-1">No posts yet</p>
                  <p className="text-[var(--synapse-text-muted)] text-sm">Be the first to post in this community!</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

       <CreateCommunityModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
             fetchCommunities();
             fetchJoinedCommunities();
        }}
      />
    </div>
  );
}
