import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Shield, Users, LogOut, User, CheckCircle2, Search, Loader2, X, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { userAPI, communityAPI } from '@/lib/api';

interface SearchUser {
  _id: string;
  username: string;
  fullName?: string;
  avatar?: string;
  isVerified?: boolean;
}

interface Community {
  _id: string;
  name: string;
  description: string;
  membersCount: number;
  isPublic: boolean;
  coverImage?: string;
}

export default function RightPanel() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [friendQuery, setFriendQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [suggestedCommunities, setSuggestedCommunities] = useState<Community[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const isCommunityPage = location.pathname === '/community' || location.pathname.startsWith('/community/') || location.pathname === '/discover-communities';

  if (!user) return null;

  // Fetch community suggestions when on community page
  useEffect(() => {
    if (isCommunityPage) {
      const fetchSuggestions = async () => {
        try {
          setLoadingSuggestions(true);
          const response = await communityAPI.getAll();
          const allCommunities = response.data.data?.communities || [];
          // Get joined communities to exclude
          const joinedRes = await communityAPI.getJoined();
          const joinedIds = (joinedRes.data.data || []).map((c: Community) => c._id);
          // Filter: only public, not joined, limit to 5
          const suggestions = allCommunities
            .filter((c: Community) => c.isPublic && !joinedIds.includes(c._id))
            .slice(0, 5);
          setSuggestedCommunities(suggestions);
        } catch (error) {
          console.error('Failed to fetch community suggestions:', error);
        } finally {
          setLoadingSuggestions(false);
        }
      };
      fetchSuggestions();
    }
  }, [isCommunityPage]);

  // Debounced search as user types
  useEffect(() => {
    const query = friendQuery.trim();

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Don't search if query is too short
    if (query.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    // Set loading state
    setSearching(true);
    setShowResults(true);

    // Debounce search by 300ms
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const { data } = await userAPI.searchUsers(query);
        const users = Array.isArray(data.data) ? data.data : [];
        // Filter out current user from results
        const filteredUsers = users.filter((u: SearchUser) => u._id !== user._id);
        setSearchResults(filteredUsers);
      } catch (error: any) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [friendQuery, user._id]);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUserClick = (username: string) => {
    setFriendQuery('');
    setSearchResults([]);
    setShowResults(false);
    navigate(`/profile/${username}`);
  };

  const handleClearSearch = () => {
    setFriendQuery('');
    setSearchResults([]);
    setShowResults(false);
  };


  return (
    <aside className="hidden xl:block w-80 fixed right-0 top-0 h-full border-l border-[rgba(168,85,247,0.15)] glass-panel z-30">
      <div className="p-6 space-y-6">
        {/* User Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="glass-card rounded-xl p-6"
        >
          <Link
            to={`/profile/${user.username}`}
            className="flex items-center gap-4 mb-4 hover:opacity-80 transition-opacity"
          >
            <div className="w-16 h-16 rounded-full bg-[#a855f7] flex items-center justify-center overflow-hidden">
              <img src={user.avatar || "/default-avatar.jpg"} alt={user.username} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-[#e5e7eb] truncate">{user.username}</span>
                {user.isVerified && (
                  <span className="text-[#06b6d4] text-sm font-medium">✓</span>
                )}
              </div>
              <span className="text-base text-[#9ca3af] truncate block">{user.fullName}</span>
            </div>
          </Link>

          {/* Quick actions */}
          <div className="mb-4 flex items-center gap-3">
            <Link
              to={`/profile/${user.username}`}
              className="flex-1 flex items-center justify-center gap-2 glass-card rounded-lg px-3 py-2 hover:border-[rgba(168,85,247,0.3)] transition-colors"
            >
              <User className="w-5 h-5 text-[#e5e7eb]" />
              <span className="text-base font-semibold text-[#e5e7eb]">Profile</span>
            </Link>
            <button
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
              className="flex-1 flex items-center justify-center gap-2 glass-card rounded-lg px-3 py-2 hover:border-[rgba(239,68,68,0.4)] hover:text-red-400 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-base font-semibold">Logout</span>
            </button>
          </div>

          {/* Verification Status */}
          <div className="pt-4 border-t border-[rgba(168,85,247,0.1)]">
            {user.isVerified ? (
              <div className="glass-card rounded-lg px-4 py-3 flex items-center gap-3 border border-[rgba(168,85,247,0.2)]">
                <CheckCircle2 className="w-6 h-6 text-[#06b6d4]" />
                <div className="flex-1">
                  <p className="text-[#e5e7eb] text-base font-semibold">Verified</p>
                  <p className="text-sm text-[#9ca3af]">
                    Badge: {user.VerificationBadge || 'Standard'}
                  </p>
                </div>
                <Link
                  to="/settings"
                  className="text-base text-[#a855f7] hover:text-[#c084fc] font-semibold"
                >
                  Manage
                </Link>
              </div>
            ) : (
              <Link
                to="/settings"
                className="flex items-center gap-2 px-4 py-3 glass-card rounded-lg hover:border-[rgba(168,85,247,0.3)] transition-colors group"
              >
                <Shield className="w-5 h-5 text-[#a855f7] group-hover:text-[#c084fc] transition-colors" />
                <div className="flex-1">
                  <p className="text-[#e5e7eb] font-semibold text-base">Get Verified</p>
                  <p className="text-sm text-[#9ca3af]">Boost trust and reduce spam.</p>
                </div>
              </Link>
            )}
          </div>
        </motion.div>

        {/* Add friend / Community suggestions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="glass-card rounded-xl p-6 space-y-4"
        >
          {!isCommunityPage ? (
            <>
              <div className="relative" ref={searchContainerRef}>
                <div className="flex items-center gap-2 mb-3">
                  <Search className="w-5 h-5 text-[#9ca3af]" />
                  <h3 className="text-base font-semibold text-[#e5e7eb]">Add a friend</h3>
                </div>
                <div className="relative">
                  <div className="relative flex items-center">
                    <Search className="absolute left-3 w-4 h-4 text-[#9ca3af] pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search by username..."
                      value={friendQuery}
                      onChange={(e) => setFriendQuery(e.target.value)}
                      onFocus={() => {
                        if (searchResults.length > 0 || friendQuery.trim().length >= 2) {
                          setShowResults(true);
                        }
                      }}
                      className="w-full pl-10 pr-10 py-2.5 glass-card rounded-lg text-[#e5e7eb] placeholder-[#9ca3af] focus:outline-none focus:border-[rgba(168,85,247,0.4)] focus:ring-2 focus:ring-[rgba(168,85,247,0.2)] transition-all"
                    />
                    {searching ? (
                      <div className="absolute right-3">
                        <Loader2 className="w-4 h-4 text-[#a855f7] animate-spin" />
                      </div>
                    ) : friendQuery && (
                      <button
                        onClick={handleClearSearch}
                        className="absolute right-3 p-1 hover:bg-[rgba(168,85,247,0.1)] rounded transition-colors"
                      >
                        <X className="w-4 h-4 text-[#9ca3af]" />
                      </button>
                    )}
                  </div>

                  {/* Search Results Dropdown */}
                  <AnimatePresence>
                    {showResults && friendQuery.trim().length >= 2 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute z-50 w-full mt-2 bg-[#0a0a12] rounded-lg border border-[rgba(168,85,247,0.3)] shadow-xl max-h-64 overflow-y-auto no-scrollbar"
                      >
                        {searching ? (
                          <div className="p-4 flex items-center justify-center gap-2 text-[#9ca3af]">
                            <Loader2 className="w-4 h-4 animate-spin text-[#a855f7]" />
                            <span className="text-sm">Searching...</span>
                          </div>
                        ) : searchResults.length > 0 ? (
                          <div className="py-2">
                            {searchResults.map((result) => (
                              <motion.button
                                key={result._id}
                                onClick={() => handleUserClick(result.username)}
                                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[rgba(168,85,247,0.1)] transition-colors text-left group"
                                whileHover={{ x: 2 }}
                              >
                                <div className="w-10 h-10 rounded-full bg-[#a855f7] flex items-center justify-center overflow-hidden flex-shrink-0">
                                  <img
                                    src={result.avatar || "/default-avatar.jpg"}
                                    alt={result.username}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-[#e5e7eb] group-hover:text-[#a855f7] transition-colors">
                                      {result.username}
                                    </span>
                                    {result.isVerified && (
                                      <span className="text-[#06b6d4] text-xs">✓</span>
                                    )}
                                  </div>
                                  {result.fullName && (
                                    <span className="text-sm text-[#9ca3af] truncate block">
                                      {result.fullName}
                                    </span>
                                  )}
                                </div>
                                <User className="w-4 h-4 text-[#9ca3af] group-hover:text-[#a855f7] transition-colors opacity-0 group-hover:opacity-100" />
                              </motion.button>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 text-center text-[#9ca3af] text-sm">
                            No users found
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="pt-2">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-6 h-6 text-[#9ca3af]" />
                  <h3 className="text-base font-semibold text-[#e5e7eb]">Suggestions</h3>
                </div>
                <p className="text-base text-[#9ca3af]">Suggestions will appear here</p>
              </div>
            </>
          ) : (
            <div>
              <button
                onClick={() => navigate('/messages')}
                className="w-full mb-6 glass-card rounded-lg p-3 hover:border-[rgba(6,182,212,0.4)] transition-all flex items-center gap-2 text-[#e5e7eb] group"
              >
                <div className="w-8 h-8 rounded-full bg-[#06b6d4]/10 flex items-center justify-center group-hover:bg-[#06b6d4]/20 transition-colors">
                  <MessageSquare className="w-4 h-4 text-[#06b6d4]" />
                </div>
                <span className="text-sm font-semibold uppercase tracking-wider">Community Chat</span>
              </button>

              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-[#9ca3af]" />
                <h3 className="text-base font-semibold text-[#e5e7eb] uppercase tracking-wider">Suggestions</h3>
              </div>

              {loadingSuggestions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-[#a855f7]" />
                </div>
              ) : suggestedCommunities.length > 0 ? (
                <div className="space-y-2">
                  {suggestedCommunities.map((community) => (
                    <motion.div
                      key={community._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-card rounded-lg p-3 hover:border-[rgba(168,85,247,0.3)] transition-all cursor-pointer group"
                      onClick={() => navigate(`/discover-communities`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#7c3aed]/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {community.coverImage ? (
                            <img src={community.coverImage} alt={community.name} className="w-full h-full object-cover" />
                          ) : (
                            <Users className="w-5 h-5 text-[#a855f7]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#e5e7eb] font-semibold truncate group-hover:text-[#a855f7] transition-colors">o/{community.name}</p>
                          <p className="text-[10px] text-[#9ca3af]">{(community.membersCount || 0).toLocaleString()} members</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#9ca3af] py-4 italic">No community suggestions available</p>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </aside>
  );
}

