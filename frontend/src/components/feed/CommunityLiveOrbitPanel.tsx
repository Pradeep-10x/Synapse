import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useSocketStore } from '@/store/socketStore';
import { useCommunityStore } from '@/store/communityStore';
import {
  Users,
  MessageSquare,
  UserPlus,
  Bell,
  TrendingUp,
  Zap,
  Globe,
  Lock,
  Shield,
  Info,
  Calendar,
  X,
  Plus,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { notificationAPI, communityAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import CreateCommunityModal from '@/components/community/CreateCommunityModal';

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
  const { id: communityId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { socket } = useSocketStore();
  const { refreshSidebar } = useCommunityStore();

  const [activities, setActivities] = useState<CommunityActivity[]>([]);
  const [joinedCommunities, setJoinedCommunities] = useState<any[]>([]);
  const [createdCommunities, setCreatedCommunities] = useState<any[]>([]);
  const [currentCommunity, setCurrentCommunity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingCommunities, setLoadingCommunities] = useState(false);
  const [loadingSpecific, setLoadingSpecific] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);

  // Listen for real-time community notifications
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification: any) => {
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
  }, [userId, refreshSidebar]);

  // Fetch specific community details if communityId is present
  useEffect(() => {
    const fetchSpecificCommunity = async () => {
      if (!communityId) {
        setCurrentCommunity(null);
        return;
      }
      try {
        setLoadingSpecific(true);
        const response = await communityAPI.getCommunity(communityId);
        setCurrentCommunity(response.data?.data || null);
      } catch (error) {
        console.error('Failed to fetch specific community:', error);
      } finally {
        setLoadingSpecific(false);
      }
    };

    fetchSpecificCommunity();
  }, [communityId]);

  useEffect(() => {
    if (!user) return;

    const fetchCommunityActivities = async () => {
      try {
        setLoading(true);
        const response = await notificationAPI.getNotifications();
        const notifications = response.data?.data || [];

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
    const interval = setInterval(fetchCommunityActivities, 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user) return null;

  return (
    <aside className="h-full bg-[#0b0c10] border-l border-r border-[rgba(168,85,247,0.15)] overflow-y-auto sticky top-0">
      <div className="p-5 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[rgba(168,85,247,0.1)]">
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-[#a855f7] shrink-0" />
            <h2 className="text-lg font-bold text-[#e5e7eb] uppercase tracking-wider">COMMUNITY HUB</h2>
          </div>
          {!communityId && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="p-1.5 glass-card rounded-md text-[#a855f7] hover:border-[rgba(168,85,247,0.4)] transition-colors"
                title="Create Community"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/discover-communities')}
                className="p-1.5 glass-card rounded-md text-[#06b6d4] hover:border-[rgba(6,182,212,0.4)] transition-colors"
                title="Discover Communities"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Dynamic Content based on route */}
        {!communityId ? (
          <>
            {/* Created Communities */}
            <div className="space-y-3">
              <div className="flex items-center mb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#a855f7] shrink-0" />
                  <h3 className="text-base font-semibold text-[#9ca3af] uppercase tracking-wider">CREATED</h3>
                </div>
              </div>
              <div className="space-y-2 max-h-[260px] overflow-y-auto no-scrollbar">
                {loadingCommunities ? (
                  <div className="text-sm text-[#6b7280] py-2 px-2">Loading...</div>
                ) : createdCommunities.length > 0 ? (
                  createdCommunities.map((community: any) => (
                    <Link
                      key={community._id}
                      to={`/community/${community._id}`}
                      className="block glass-card rounded-md p-3 hover:border-[rgba(168,85,247,0.3)] transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#1a1a2e] border border-[rgba(168,85,247,0.1)] flex items-center justify-center overflow-hidden flex-shrink-0">
                          {community.avatar ? (
                            <img src={community.avatar} alt={community.name} className="w-full h-full object-cover" />
                          ) : community.coverImage ? (
                            <img src={community.coverImage} alt={community.name} className="w-full h-full object-cover" />
                          ) : (
                            <Users className="w-5 h-5 text-[#a855f7]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-[#e5e7eb] font-medium truncate">o/{community.name}</p>
                            {community.isPublic ? (
                              <Globe className="w-3 h-3 text-[#9ca3af]" />
                            ) : (
                              <Lock className="w-3 h-3 text-[#9ca3af]" />
                            )}
                          </div>
                          <p className="text-xs text-[#6b7280] truncate">{community.description || 'No description'}</p>
                          <p className="text-xs text-[#6b7280] mt-1">{community.membersCount || 0} members</p>
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
              <div className="space-y-2 max-h-[260px] overflow-y-auto no-scrollbar">
                {loadingCommunities ? (
                  <div className="text-sm text-[#6b7280] py-2 px-2">Loading...</div>
                ) : joinedCommunities.length > 0 ? (
                  joinedCommunities.map((community: any) => (
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
                            <p className="text-sm text-[#e5e7eb] font-medium truncate">o/{community.name}</p>
                            {community.isPublic ? (
                              <Globe className="w-3 h-3 text-[#9ca3af]" />
                            ) : (
                              <Lock className="w-3 h-3 text-[#9ca3af]" />
                            )}
                          </div>
                          <p className="text-xs text-[#6b7280] truncate">{community.description || 'No description'}</p>
                          <p className="text-xs text-[#6b7280] mt-1">{community.membersCount || 0} members</p>
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

            {/* Live Activity - Always at bottom in global view */}
            <div className="space-y-3 pt-4 border-t border-[rgba(168,85,247,0.1)]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                <h3 className="text-base font-semibold text-[#9ca3af] uppercase tracking-wider">LIVE ACTIVITY</h3>
              </div>

              {loading ? (
                <div className="text-sm text-[#6b7280] py-2">Loading...</div>
              ) : activities.length > 0 ? (
                <div className="space-y-2 max-h-[260px] overflow-y-auto no-scrollbar">
                  <AnimatePresence>
                    {activities.map((activity: any) => (
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
                              in <span className="text-[#a855f7]">o/{activity.community.name}</span>
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
          </>
        ) : (
          <>
            {/* Specific Community Info: Rules & Members */}
            {loadingSpecific ? (
              <div className="text-center py-10">
                <div className="w-8 h-8 border-t-2 border-[#a855f7] border-solid rounded-full animate-spin mx-auto pb-4"></div>
                <p className="text-[#6b7280] text-sm font-mono tracking-widest">TRANSMITTING...</p>
              </div>
            ) : currentCommunity ? (
              <>
                {/* About Community Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-base font-semibold text-[#9ca3af] uppercase tracking-wider">ABOUT</h3>
                  </div>
                  <div className="glass-card rounded-md p-4 space-y-4">
                    <p className="text-sm text-[#e5e7eb] leading-relaxed">
                      {currentCommunity.description || "No mission objective set for this orbit."}
                    </p>

                    <div className="pt-3 border-t border-[rgba(168,85,247,0.1)] flex items-center gap-3 text-xs text-[#9ca3af]">
                      <span>
                        Owner:{' '}
                        <Link
                          to={`/profile/${currentCommunity.creator?.username}`}
                          className="text-[#a855f7] hover:text-[#c084fc] font-medium transition-colors"
                        >
                          u/{currentCommunity.creator?.username}
                        </Link>
                      </span>
                    </div>
                  </div>
                </div>

                {/*  Rules Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-base font-semibold text-[#9ca3af] uppercase tracking-wider">RULES</h3>
                  </div>
                  <div className="glass-card rounded-md p-4 space-y-3">
                    {currentCommunity.rules && currentCommunity.rules.length > 0 ? (
                      currentCommunity.rules.map((rule: string, i: number) => (
                        <div key={i} className="flex gap-3 text-sm">
                          <span className="text-[#a855f7] font-bold">{i + 1}.</span>
                          <span className="text-[#e5e7eb] leading-relaxed">{rule}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-[#6b7280] italic">No specific rules set for this orbit.</p>
                    )}
                  </div>
                </div>

                {/* Members Preview Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-[#a855f7] shrink-0" />
                      <h3 className="text-base font-semibold text-[#9ca3af] uppercase tracking-wider">MEMBERS</h3>
                    </div>
                    <span className="text-xs text-[#a855f7] font-mono">{currentCommunity.membersCount || 0}</span>
                  </div>
                  <div className="space-y-2 max-h-[260px] overflow-y-auto no-scrollbar">
                    {currentCommunity.members?.map((member: any) => (
                      <Link
                        key={member._id}
                        to={`/profile/${member.username}`}
                        className="flex items-center gap-3 glass-card rounded-md p-2.5 hover:border-[rgba(168,85,247,0.3)] transition-all group"
                      >
                        <div className="w-9 h-9 rounded-full bg-[#1a1a2e] border border-[rgba(168,85,247,0.1)] overflow-hidden shrink-0">
                          {member.avatar ? (
                            <img src={member.avatar} alt={member.username} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-[#a855f7] font-bold bg-[#a855f7]/10 uppercase">
                              {member.username.slice(0, 2)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#e5e7eb] font-medium truncate group-hover:text-[#a855f7] transition-colors">
                            u/{member.username}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                  {currentCommunity.membersCount > 5 && (
                    <button
                      onClick={() => setShowMembersModal(true)}
                      className="block w-full text-center text-xs text-[#6b7280] hover:text-[#a855f7] transition-colors py-1"
                    >
                      View complete roster →
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-10 glass-card">
                <p className="text-[#6b7280] text-sm">Orbit data not found.</p>
              </div>
            )}
          </>
        )}
      </div>

      <CreateCommunityModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchCommunities}
      />

      {/* Members Modal */}
      <AnimatePresence>
        {showMembersModal && currentCommunity && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMembersModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#0b0c10] border border-[rgba(168,85,247,0.2)] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-[rgba(168,85,247,0.1)] flex items-center justify-between bg-[rgba(168,85,247,0.02)]">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#a855f7]" />
                  Orbit Members
                </h2>
                <button
                  onClick={() => setShowMembersModal(false)}
                  className="p-2 hover:bg-white/5 rounded-full text-[#9ca3af] hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {/* Creator */}
                <div className="px-4 py-2 text-[10px] font-bold text-[#6b7280] uppercase tracking-widest">Creator</div>
                {currentCommunity.creator && (
                  <Link
                    to={`/profile/${currentCommunity.creator.username}`}
                    onClick={() => setShowMembersModal(false)}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full border-2 border-[#a855f7] p-0.5 overflow-hidden">
                        <img
                          src={currentCommunity.creator.avatar || "/default-avatar.jpg"}
                          alt={currentCommunity.creator.username}
                          className="w-full h-full rounded-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="font-bold text-white group-hover:text-[#a855f7] transition-colors">
                          u/{currentCommunity.creator.username}
                        </div>
                        <div className="text-xs text-[#9ca3af]">Community Founder</div>
                      </div>
                    </div>
                  </Link>
                )}

                {/* Other Members */}
                <div className="px-4 py-2 mt-4 text-[10px] font-bold text-[#6b7280] uppercase tracking-widest">Members</div>
                {currentCommunity.members?.map((member: any) => (
                  <Link
                    key={member._id}
                    to={`/profile/${member.username}`}
                    onClick={() => setShowMembersModal(false)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden">
                      <img
                        src={member.avatar || "/default-avatar.jpg"}
                        alt={member.username}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="font-bold text-white group-hover:text-[#a855f7] transition-colors">
                      u/{member.username}
                    </div>
                  </Link>
                ))}
              </div>

              <div className="p-4 bg-[rgba(168,85,247,0.02)] border-t border-[rgba(168,85,247,0.05)] text-center">
                <p className="text-xs text-[#6b7280]">
                  {currentCommunity.membersCount} participants in orbit
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </aside>
  );
}
