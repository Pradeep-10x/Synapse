import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users, Globe, Lock, Search, Loader2, X, ArrowLeft, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { communityAPI, communityPostAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import CommunityPostCard from '@/components/feed/CommunityPostCard';

interface Community {
  _id: string;
  name: string;
  description: string;
  memberCount: number;
  isPublic: boolean;
  coverImage?: string;
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
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
      setJoinedCommunityIds(prev => [...prev, communityId]);
      setCommunities(prev => prev.filter(c => c._id !== communityId));
      // Refresh joined communities list
      await fetchJoinedCommunities();
      if (selectedCommunity?._id === communityId) {
        setSelectedCommunity(null);
        setCommunityPosts([]);
      }
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
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-8">
        {!selectedCommunity ? (
          <>
            {/* Header */}
            <div className="mb-6 pb-4 border-b border-[rgba(168,85,247,0.2)]">
              <div className="flex items-center gap-4 mb-2">
                <button
                  onClick={() => navigate('/community')}
                  className="text-[#9ca3af] hover:text-[#e5e7eb] transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-3xl font-bold text-[#e5e7eb]">Discover Communities</h1>
              </div>
              <p className="text-[#9ca3af]">Explore public communities and find your interests</p>
            </div>

            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#9ca3af]" />
                <input
                  type="text"
                  placeholder="Search communities..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchCommunities(e.target.value);
                  }}
                  className="w-full pl-10 pr-4 py-3 glass-card rounded-lg text-[#e5e7eb] placeholder-[#9ca3af] focus:outline-none focus:border-[rgba(168,85,247,0.4)] focus:ring-2 focus:ring-[rgba(168,85,247,0.2)] transition-all"
                />
              </div>
            </div>

            {/* Communities List */}
            {loadingCommunities ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#a855f7]" />
              </div>
            ) : filteredCommunities.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCommunities.map((community, index) => (
                  <motion.div
                    key={community._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="glass-card rounded-xl p-5 hover:border-[rgba(168,85,247,0.3)] transition-all"
                  >
                    <div className="flex flex-col h-full">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-14 h-14 rounded-xl bg-[#7c3aed]/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {community.coverImage ? (
                            <img src={community.coverImage} alt={community.name} className="w-full h-full object-cover" />
                          ) : (
                            <Users className="w-7 h-7 text-[#a855f7]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-[#e5e7eb] text-lg">{community.name}</h3>
                            <Globe className="w-4 h-4 text-[#9ca3af]" />
                          </div>
                          <p className="text-[#9ca3af] text-sm line-clamp-2">{community.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-auto">
                        <span className="text-sm text-[#9ca3af]">
                          {(community.memberCount || 0).toLocaleString()} members
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewPosts(community)}
                            className="px-3 py-1.5 glass-card rounded-lg text-[#e5e7eb] text-sm font-medium hover:border-[rgba(168,85,247,0.3)] transition-colors flex items-center gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                          <button
                            onClick={() => handleJoinCommunity(community._id)}
                            disabled={joining === community._id}
                            className="px-3 py-1.5 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            {joining === community._id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              'Join'
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-[#9ca3af] mx-auto mb-4" />
                <p className="text-[#9ca3af] mb-2">No communities found</p>
                <p className="text-sm text-[#6b7280]">Try adjusting your search or create your own!</p>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Community Posts View */}
            <div className="mb-6 pb-4 border-b border-[rgba(168,85,247,0.2)]">
              <div className="flex items-center gap-4 mb-2">
                <button
                  onClick={handleBackToDiscover}
                  className="text-[#9ca3af] hover:text-[#e5e7eb] transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                  {selectedCommunity.coverImage ? (
                    <img src={selectedCommunity.coverImage} alt={selectedCommunity.name} className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-[#7c3aed]/20 flex items-center justify-center">
                      <Users className="w-5 h-5 text-[#a855f7]" />
                    </div>
                  )}
                  <div>
                    <h1 className="text-2xl font-bold text-[#e5e7eb]">{selectedCommunity.name}</h1>
                    <p className="text-sm text-[#9ca3af]">{(selectedCommunity.memberCount || 0).toLocaleString()} members</p>
                  </div>
                </div>
                {!joinedCommunityIds.includes(selectedCommunity._id) && (
                  <button
                    onClick={() => handleJoinCommunity(selectedCommunity._id)}
                    disabled={joining === selectedCommunity._id}
                    className="ml-auto px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg text-white font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
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
              <p className="text-[#9ca3af] mt-2">{selectedCommunity.description}</p>
            </div>

            {/* Posts */}
            <div className="max-w-2xl mx-auto">
              {loadingPosts && communityPosts.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#a855f7]" />
                </div>
              ) : communityPosts.length > 0 ? (
                <>
                  {communityPosts.map((post) => (
                    <CommunityPostCard
                      key={post._id}
                      post={post}
                    />
                  ))}
                  {hasNext && (
                    <div ref={observerTarget} className="flex items-center justify-center py-8">
                      {loadingPosts && <Loader2 className="w-6 h-6 animate-spin text-[#a855f7]" />}
                    </div>
                  )}
                  {!hasNext && communityPosts.length > 0 && (
                    <div className="text-center py-8">
                      <p className="text-[#9ca3af] text-sm">No more posts</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-[#9ca3af] mx-auto mb-4" />
                  <p className="text-[#9ca3af]">No posts in this community yet</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
