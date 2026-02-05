import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, User, FileText, Users, Loader2, X, Image } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { userAPI, postAPI, communityAPI } from '@/lib/api';

type SearchType = 'users' | 'posts' | 'communities';

interface SearchResult {
  _id: string;
  username?: string;
  fullName?: string;
  avatar?: string;
  isVerified?: boolean;
  caption?: string;
  mediaUrl?: string;
  mediaType?: string;
  user?: {
    _id: string;
    username: string;
    avatar?: string;
    isVerified?: boolean;
  };
  name?: string;
  description?: string;
  membersCount?: number;
  coverImage?: string;
}

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('users');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search as user types
  useEffect(() => {
    const trimmedQuery = query.trim();

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Don't search if query is too short
    if (trimmedQuery.length < 2) {
      setResults([]);
      setLoading(false);
      if (trimmedQuery.length === 0) {
        setHasSearched(false);
      }
      return;
    }

    // Set loading state
    setLoading(true);

    // Debounce search by 300ms
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setHasSearched(true);

        if (searchType === 'users') {
          const { data } = await userAPI.searchUsers(trimmedQuery);
          if (data?.data) {
            const users = Array.isArray(data.data) ? data.data : [data.data];
            setResults(users);
          } else {
            setResults([]);
          }
        } else if (searchType === 'posts') {
          const { data } = await postAPI.searchPosts(trimmedQuery);
          if (data?.data?.posts) {
            setResults(data.data.posts);
          } else {
            setResults([]);
          }
        } else if (searchType === 'communities') {
          const { data } = await communityAPI.searchCommunities(trimmedQuery);
          if (data?.data?.communities) {
            setResults(data.data.communities);
          } else {
            setResults([]);
          }
        }
      } catch (error: any) {
        console.error('Search failed:', error);
        if (error?.response?.status === 404 || error?.response?.status === 400) {
          setResults([]);
        } else if (error?.response?.status === 401) {
          toast.error('Please login to search');
          setResults([]);
        } else {
          toast.error('Search failed. Please try again.');
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, searchType]);

  const handleClearSearch = () => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-10 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#e5e7eb] mb-2">Search</h1>
          <p className="text-[#9ca3af]">Find users, posts, and communities</p>
        </div>

        {/* Search Input */}
        <div className="mb-6">
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9ca3af]" />
            <input
              type="text"
              placeholder="Start typing to search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-12 pr-12 py-4 glass-card rounded-xl text-[#e5e7eb] placeholder-[#9ca3af] focus:outline-none focus:border-[rgba(168,85,247,0.4)] text-lg"
            />
            {query && (
              <button
                onClick={handleClearSearch}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#e5e7eb] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            {loading && (
              <Loader2 className="absolute right-12 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-[#a855f7]" />
            )}
          </div>
        </div>

        {/* Search Type Tabs */}
        <div className="flex gap-2 mb-6 p-1 glass-card rounded-lg w-fit">
          <button
            onClick={() => setSearchType('users')}
            className={`py-2 px-4 rounded-md text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${searchType === 'users'
              ? 'bg-[#7c3aed] text-white'
              : 'text-[#9ca3af] hover:text-[#e5e7eb]'
              }`}
          >
            <User className="w-4 h-4" />
            Users
          </button>
          <button
            onClick={() => setSearchType('posts')}
            className={`py-2 px-4 rounded-md text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${searchType === 'posts'
              ? 'bg-[#7c3aed] text-white'
              : 'text-[#9ca3af] hover:text-[#e5e7eb]'
              }`}
          >
            <FileText className="w-4 h-4" />
            Posts
          </button>
          <button
            onClick={() => setSearchType('communities')}
            className={`py-2 px-4 rounded-md text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${searchType === 'communities'
              ? 'bg-[#7c3aed] text-white'
              : 'text-[#9ca3af] hover:text-[#e5e7eb]'
              }`}
          >
            <Users className="w-4 h-4" />
            Communities
          </button>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#a855f7] mx-auto mb-4" />
              <p className="text-[#9ca3af]">Searching...</p>
            </div>
          ) : hasSearched && results.length === 0 ? (
            <div className="text-center py-12">
              <SearchIcon className="w-12 h-12 text-[#9ca3af] mx-auto mb-4" />
              <p className="text-[#9ca3af]">No results found for "{query}"</p>
            </div>
          ) : results.length > 0 ? (
            results.map((result, index) => (
              <motion.div
                key={result._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                onClick={() => {
                  if (searchType === 'users' && result.username) {
                    navigate(`/profile/${result.username}`);
                  } else if (searchType === 'posts') {
                    navigate(`/post/${result._id}`);
                  } else if (searchType === 'communities') {
                    navigate(`/community/${result._id}`);
                  }
                }}
                className="glass-card rounded-xl p-5 hover:border-[rgba(168,85,247,0.3)] transition-all cursor-pointer"
              >
                {/* Users Result */}
                {searchType === 'users' && (
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-[#7c3aed]/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {result.avatar ? (
                        <img src={result.avatar || "/default-avatar.jpg"} alt={result.username} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-7 h-7 text-[#a855f7]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-[#e5e7eb] text-lg">{result.username}</h3>
                        {result.isVerified && (
                          <span className="text-[#06b6d4] text-sm">✓</span>
                        )}
                      </div>
                      {result.fullName && (
                        <p className="text-[#9ca3af] text-sm">{result.fullName}</p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/profile/${result.username}`);
                      }}
                      className="px-4 py-1.5 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg text-white text-sm font-semibold transition-colors"
                    >
                      View Profile
                    </button>
                  </div>
                )}

                {/* Posts Result */}
                {searchType === 'posts' && (
                  <div className="flex items-start gap-4">
                    <div className="w-20 h-20 rounded-lg bg-[#7c3aed]/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {result.mediaUrl ? (
                        result.mediaType === 'video' ? (
                          <video src={result.mediaUrl} className="w-full h-full object-cover" muted />
                        ) : (
                          <img src={result.mediaUrl} alt="Post" className="w-full h-full object-cover" />
                        )
                      ) : (
                        <Image className="w-8 h-8 text-[#a855f7]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {result.user && (
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full overflow-hidden">
                            <img
                              src={result.user.avatar || "/default-avatar.jpg"}
                              alt={result.user.username}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="text-sm font-medium text-[#e5e7eb]">{result.user.username}</span>
                          {result.user.isVerified && (
                            <span className="text-[#06b6d4] text-xs">✓</span>
                          )}
                        </div>
                      )}
                      <p className="text-[#e5e7eb] text-sm line-clamp-2">
                        {result.caption || 'No caption'}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/post/${result._id}`);
                      }}
                      className="px-4 py-1.5 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg text-white text-sm font-semibold transition-colors flex-shrink-0"
                    >
                      View Post
                    </button>
                  </div>
                )}

                {/* Communities Result */}
                {searchType === 'communities' && (
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-lg bg-[#7c3aed]/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {result.coverImage ? (
                        <img src={result.coverImage} alt={result.name} className="w-full h-full object-cover" />
                      ) : (
                        <Users className="w-7 h-7 text-[#a855f7]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[#e5e7eb] text-lg mb-1">{result.name}</h3>
                      {result.description && (
                        <p className="text-[#9ca3af] text-sm line-clamp-1">{result.description}</p>
                      )}
                      <p className="text-[#9ca3af] text-xs mt-1">
                        {result.membersCount || 0} members
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/community/${result._id}`);
                      }}
                      className="px-4 py-1.5 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg text-white text-sm font-semibold transition-colors"
                    >
                      View
                    </button>
                  </div>
                )}
              </motion.div>
            ))
          ) : !hasSearched ? (
            <div className="text-center py-12">
              <SearchIcon className="w-12 h-12 text-[#9ca3af] mx-auto mb-4" />
              <p className="text-[#9ca3af]">Enter a search term to find {searchType}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
