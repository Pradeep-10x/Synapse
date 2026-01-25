import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useSocketStore, Notification } from '@/store/socketStore';
import { Users, MessageSquare, UserPlus, Bell, TrendingUp, Zap, Plus, Globe, Lock, Upload, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { notificationAPI, communityAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';

interface CommunityActivity {
  _id: string;
  type: 'new_post' | 'new_member' | 'comment' | 'trending' | 'announcement';
  community: {
    name: string;
    id: string;
  };
  user?: {
    username: string;
    avatar?: string;
  };
  message: string;
  createdAt: string;
}

const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
};

const getActivityIcon = (type: CommunityActivity['type']) => {
  switch (type) {
    case 'new_post':
      return <MessageSquare className="w-4 h-4 text-[#a855f7]" />;
    case 'new_member':
      return <UserPlus className="w-4 h-4 text-[#06b6d4]" />;
    case 'comment':
      return <MessageSquare className="w-4 h-4 text-[#22d3ee]" />;
    case 'trending':
      return <TrendingUp className="w-4 h-4 text-[#f59e0b]" />;
    case 'announcement':
      return <Bell className="w-4 h-4 text-[#ef4444]" />;
    default:
      return <Zap className="w-4 h-4 text-[#a855f7]" />;
  }
};

export default function CommunityLiveOrbitPanel() {
  const { user } = useAuthStore();
  const { socket } = useSocketStore();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<CommunityActivity[]>([]);
  const [joinedCommunities, setJoinedCommunities] = useState<any[]>([]);
  const [createdCommunities, setCreatedCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCommunities, setLoadingCommunities] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCommunity, setNewCommunity] = useState({
    name: '',
    description: '',
    isPublic: true,
  });
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Listen for real-time community notifications
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification: Notification) => {
      // Check if it's a community-related notification
      // For now, we'll add all notifications as community activities for demo
      // In production, you'd filter by notification.community
      const activityType = notification.type === 'comment' ? 'comment' 
        : notification.type === 'follow' ? 'new_member'
        : notification.type === 'post' ? 'new_post'
        : 'new_post';

      const getActivityMessage = () => {
        switch (notification.type) {
          case 'comment': return 'commented on a post';
          case 'follow': return 'joined the community';
          case 'post': return 'shared a new post';
          case 'like': return 'liked a post';
          default: return 'new activity';
        }
      };

      const newActivity: CommunityActivity = {
        _id: notification._id,
        type: activityType as CommunityActivity['type'],
        community: { name: 'Community', id: '' },
        user: notification.fromUser,
        message: getActivityMessage(),
        createdAt: notification.createdAt
      };

      setActivities(prev => [newActivity, ...prev].slice(0, 8));
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [socket]);

  // Fetch joined and created communities
  const fetchCommunities = async () => {
    if (!user) return;
    try {
      setLoadingCommunities(true);
      const [joinedRes, createdRes] = await Promise.all([
        communityAPI.getJoined(),
        communityAPI.getCreated()
      ]);
      
      // Handle response structure - ApiResponse wraps data in data field
      const joinedData = joinedRes.data?.data || joinedRes.data || [];
      const createdData = createdRes.data?.data || createdRes.data || [];
      
      setJoinedCommunities(Array.isArray(joinedData) ? joinedData : []);
      setCreatedCommunities(Array.isArray(createdData) ? createdData : []);
    } catch (error: any) {
      console.error('Failed to fetch communities:', error);
      toast.error(error.response?.data?.message || 'Failed to load communities');
      setJoinedCommunities([]);
      setCreatedCommunities([]);
    } finally {
      setLoadingCommunities(false);
    }
  };

  const userId = useMemo(() => user?._id, [user?._id]);

  useEffect(() => {
    if (userId) {
      fetchCommunities();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!user) return;
    
    const fetchCommunityActivities = async () => {
      try {
        setLoading(true);
        // Fetch notifications that are community-related
        const response = await notificationAPI.getNotifications();
        const notifications = response.data?.data || [];
        
        // Filter and transform community-related notifications
        const communityActivities = notifications
          .filter((n: any) => n.community || n.type === 'community')
          .slice(0, 8)
          .map((n: any) => ({
            _id: n._id,
            type: n.type || 'new_post',
            community: n.community || { name: 'Community', id: '' },
            user: n.fromUser,
            message: n.message || 'New activity',
            createdAt: n.createdAt,
          }));
        
        setActivities(communityActivities);
      } catch (error) {
        console.error('Failed to fetch community activities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCommunityActivities();
    // Refresh every 30 seconds
    const interval = setInterval(fetchCommunityActivities, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommunity.name.trim()) {
      toast.error('Community name is required');
      return;
    }

    try {
      setCreating(true);
      const formData = new FormData();
      formData.append('name', newCommunity.name);
      formData.append('description', newCommunity.description);
      formData.append('isPublic', String(newCommunity.isPublic));
      if (coverImage) {
        formData.append('coverImage', coverImage);
      }

      await communityAPI.create(formData);
      toast.success('Community created successfully!');
      setShowCreateModal(false);
      setNewCommunity({ name: '', description: '', isPublic: true });
      setCoverImage(null);
      setCoverPreview(null);
      fetchCommunities();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create community');
    } finally {
      setCreating(false);
    }
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImage(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  if (!user) return null;

  return (
    <aside className="h-full bg-[#0b0c10] border-l border-r border-[rgba(168,85,247,0.15)] overflow-y-auto sticky top-0">
      <div className="p-5 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2 pb-4 border-b border-[rgba(168,85,247,0.1)]">
          <Users className="w-6 h-6 text-[#a855f7] shrink-0" />
          <h2 className="text-lg font-bold text-[#e5e7eb] uppercase tracking-wider">COMMUNITY HUB</h2>
        </div>

        {/* Recent Activity */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
            <h3 className="text-base font-semibold text-[#9ca3af] uppercase tracking-wider">LIVE ACTIVITY</h3>
          </div>
          
          {loading ? (
            <div className="text-sm text-[#6b7280] py-2">Loading...</div>
          ) : activities.length > 0 ? (
            <div className="space-y-2">
              <AnimatePresence>
                {activities.map((activity) => (
                  <motion.div
                    key={activity._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="glass-card rounded-md p-3 hover:border-[rgba(168,85,247,0.3)] transition-all cursor-pointer group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-[#e5e7eb]">
                          {activity.user && (
                            <Link
                              to={`/profile/${activity.user.username}`}
                              className="font-medium hover:text-[#a855f7] transition-colors"
                            >
                              {activity.user.username}
                            </Link>
                          )}
                          {activity.user && ' '}
                          <span className="text-[#9ca3af]">{activity.message}</span>
                        </div>
                        <div className="text-xs text-[#6b7280] mt-1">
                          in <span className="text-[#a855f7]">{activity.community.name}</span>
                          {' · '}
                          {formatTimeAgo(new Date(activity.createdAt))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="text-sm text-[#6b7280] py-2 px-2">No recent activity</div>
          )}
        </div>

        {/* Created Communities */}
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#a855f7] shrink-0" />
              <h3 className="text-base font-semibold text-[#9ca3af] uppercase tracking-wider">CREATED</h3>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="p-1.5 glass-card rounded hover:border-[rgba(168,85,247,0.3)] transition-colors"
              title="Create Community"
            >
              <Plus className="w-4 h-4 text-[#a855f7]" />
            </button>
          </div>
          <div className="space-y-2">
            {loadingCommunities ? (
              <div className="text-sm text-[#6b7280] py-2 px-2">Loading...</div>
            ) : createdCommunities.length > 0 ? (
              createdCommunities.map((community) => (
                <Link
                  key={community._id}
                  to={`/community/${community._id}`}
                  className="block glass-card rounded-md p-3 hover:border-[rgba(168,85,247,0.3)] transition-all"
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
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-[#e5e7eb] font-medium truncate">{community.name}</p>
                        {community.isPublic ? (
                          <Globe className="w-3 h-3 text-[#9ca3af]" />
                        ) : (
                          <Lock className="w-3 h-3 text-[#9ca3af]" />
                        )}
                      </div>
                      <p className="text-xs text-[#6b7280] truncate">{community.description || 'No description'}</p>
                      <p className="text-xs text-[#6b7280] mt-1">{community.memberCount || 0} members</p>
                    </div>
                    <span className="px-2 py-0.5 bg-[#a855f7]/20 text-[#a855f7] text-xs font-medium rounded">Creator</span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-sm text-[#6b7280] py-2 px-2 text-center">
                <p className="mb-2">No created communities</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="text-xs text-[#a855f7] hover:underline"
                >
                  Create one
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Joined Communities */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-[#06b6d4] shrink-0" />
            <h3 className="text-base font-semibold text-[#9ca3af] uppercase tracking-wider">JOINED</h3>
          </div>
          <div className="space-y-2">
            {loadingCommunities ? (
              <div className="text-sm text-[#6b7280] py-2 px-2">Loading...</div>
            ) : joinedCommunities.length > 0 ? (
              joinedCommunities.map((community) => (
                <Link
                  key={community._id}
                  to={`/community/${community._id}`}
                  className="block glass-card rounded-md p-3 hover:border-[rgba(168,85,247,0.3)] transition-all"
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
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-[#e5e7eb] font-medium truncate">{community.name}</p>
                        {community.isPublic ? (
                          <Globe className="w-3 h-3 text-[#9ca3af]" />
                        ) : (
                          <Lock className="w-3 h-3 text-[#9ca3af]" />
                        )}
                      </div>
                      <p className="text-xs text-[#6b7280] truncate">{community.description || 'No description'}</p>
                      <p className="text-xs text-[#6b7280] mt-1">{community.memberCount || 0} members</p>
                    </div>
                    <span className="px-2 py-0.5 bg-[#22c55e]/20 text-[#22c55e] text-xs font-medium rounded">Joined</span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-sm text-[#6b7280] py-2 px-2 text-center">
                <p className="mb-2">Join communities to see them here</p>
                <Link
                  to="/discover-communities"
                  className="text-xs text-[#06b6d4] hover:underline"
                >
                  Discover
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-[#9ca3af] uppercase tracking-wider">QUICK ACTIONS</h3>
          <div className="space-y-2">
            <button 
              onClick={() => setShowCreateModal(true)}
              className="w-full glass-card rounded-md p-3 hover:border-[rgba(168,85,247,0.3)] transition-all text-left flex items-center gap-3"
            >
              <Plus className="w-5 h-5 text-[#a855f7]" />
              <span className="text-sm text-[#e5e7eb]">Create Community</span>
            </button>
            <Link 
              to="/discover-communities"
              className="w-full glass-card rounded-md p-3 hover:border-[rgba(168,85,247,0.3)] transition-all text-left flex items-center gap-3"
            >
              <Users className="w-5 h-5 text-[#06b6d4]" />
              <span className="text-sm text-[#e5e7eb]">Browse Communities</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Create Community Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0a0a12] border border-[rgba(168,85,247,0.3)] rounded-2xl p-6 w-full max-w-md shadow-xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[#e5e7eb]">Create Community</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-[#9ca3af] hover:text-[#e5e7eb]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateCommunity} className="space-y-4">
                {/* Cover Image */}
                <div>
                  <label className="block text-sm text-[#9ca3af] mb-2">Cover Image</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-video rounded-xl border-2 border-dashed border-[rgba(168,85,247,0.3)] flex items-center justify-center cursor-pointer hover:border-[rgba(168,85,247,0.5)] transition-colors overflow-hidden"
                  >
                    {coverPreview ? (
                      <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <Upload className="w-8 h-8 text-[#9ca3af] mx-auto mb-2" />
                        <p className="text-sm text-[#9ca3af]">Click to upload</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCoverImageChange}
                    className="hidden"
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm text-[#9ca3af] mb-2">Community Name</label>
                  <input
                    type="text"
                    value={newCommunity.name}
                    onChange={(e) => setNewCommunity({ ...newCommunity, name: e.target.value })}
                    placeholder="Enter community name"
                    className="w-full glass-card rounded-lg px-4 py-3 text-[#e5e7eb] placeholder-[#9ca3af] focus:outline-none focus:border-[rgba(168,85,247,0.4)]"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm text-[#9ca3af] mb-2">Description</label>
                  <textarea
                    value={newCommunity.description}
                    onChange={(e) => setNewCommunity({ ...newCommunity, description: e.target.value })}
                    placeholder="What's your community about?"
                    rows={3}
                    className="w-full glass-card rounded-lg px-4 py-3 text-[#e5e7eb] placeholder-[#9ca3af] focus:outline-none focus:border-[rgba(168,85,247,0.4)] resize-none"
                  />
                </div>

                {/* Privacy */}
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setNewCommunity({ ...newCommunity, isPublic: true })}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                      newCommunity.isPublic
                        ? 'bg-[#7c3aed] text-white'
                        : 'glass-card text-[#9ca3af]'
                    }`}
                  >
                    <Globe className="w-4 h-4" />
                    Public
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCommunity({ ...newCommunity, isPublic: false })}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                      !newCommunity.isPublic
                        ? 'bg-[#7c3aed] text-white'
                        : 'glass-card text-[#9ca3af]'
                    }`}
                  >
                    <Lock className="w-4 h-4" />
                    Private
                  </button>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={creating || !newCommunity.name.trim()}
                  className="w-full py-3 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg text-white font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Community'
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </aside>
  );
}
