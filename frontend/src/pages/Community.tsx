import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Layers, Loader2 } from 'lucide-react';
import { communityAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { CommunityDomainCard } from '@/components/community/CommunityDomainCard';
import CreateCommunityModal from '@/components/community/CreateCommunityModal';
import { useSocketStore } from '@/store/socketStore';

interface Community {
  _id: string;
  name: string;
  description: string;
  membersCount: number;
  coverImage?: string;
  userRole?: 'owner' | 'admin' | 'member';
}

export default function CommunityPage() {
  const navigate = useNavigate();
  const [joinedCommunities, setJoinedCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { communityActiveCounts, communityEventsCounts, requestCommunityActiveCounts, isConnected } = useSocketStore();

  useEffect(() => {
    fetchJoinedCommunities();
  }, []);
  
  // Request active counts when communities are loaded and socket is connected
  useEffect(() => {
    if (joinedCommunities.length > 0 && isConnected) {
      const communityIds = joinedCommunities.map(c => c._id);
      requestCommunityActiveCounts(communityIds);
    }
  }, [joinedCommunities, isConnected, requestCommunityActiveCounts]);

  const fetchJoinedCommunities = async () => {
    try {
      setLoading(true);
      const response = await communityAPI.getJoined();
      const joined = response.data.data || [];
      setJoinedCommunities(joined);
      // setLoading(true);
      // const response = await communityAPI.getJoined();
      // const joined = response.data.data || [];
      // setJoinedCommunities(joined);
    } catch (error) {
      console.error('Failed to fetch joined communities:', error);
      toast.error('Failed to load your domains');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-10 pb-4 sm:pb-6 border-b border-[var(--synapse-border)]">
        <div>
          <h1 className="text-2xl font-bold text-[var(--synapse-text)] tracking-tight mb-2 uppercase">Communities</h1>
          <p className="text-[var(--synapse-text-muted)] text-sm">
            You are part of <span className="text-[var(--synapse-text)] font-semibold">{joinedCommunities.length}</span> active Communities.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--synapse-surface)] hover:bg-[var(--synapse-surface-hover)] border border-[var(--synapse-border)] text-[var(--synapse-text)] rounded-[var(--radius-md)] text-sm font-medium transition-all"
          >
            <Plus className="w-4 h-4 text-[var(--synapse-text-muted)]" />
            Create Community
          </button>
          <button
            onClick={() => navigate('/discover-communities')}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--synapse-surface)] hover:bg-[var(--synapse-surface-hover)] border border-[var(--synapse-border)] text-[var(--synapse-text)] rounded-[var(--radius-md)] text-sm font-medium transition-all"
          >
            <Search className="w-4 h-4 text-[var(--synapse-text-muted)]" />
            Discover Communities
          </button>
        </div>
      </div>

      {/* Grid Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--synapse-text-muted)]" />
        </div>
      ) : joinedCommunities.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {joinedCommunities.map((community) => (
            <CommunityDomainCard
              key={community._id}
              {...community}
              activeNow={communityActiveCounts.get(community._id) || 0}
              eventsCount={communityEventsCounts.get(community._id) || 0}
              userRole={community.userRole}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-[var(--synapse-border)] rounded-[var(--radius-lg)] bg-[var(--synapse-surface)]/30">
          <Layers className="w-12 h-12 text-[var(--synapse-text-muted)] mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-[var(--synapse-text)] mb-2">No active communities</h3>
          <p className="text-[var(--synapse-text-muted)] max-w-sm mb-6">
            You haven't joined any communities yet. Discover existing communities or initialize a new one.
          </p>
          <button
            onClick={() => navigate('/discover-communities')}
            className="px-6 py-2 bg-[var(--synapse-blue)] text-white font-medium rounded-[var(--radius-md)] hover:bg-blue-600 transition-colors shadow-lg shadow-blue-900/20"
          >
            Browse Community
          </button>
        </div>
      )}

      <CreateCommunityModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchJoinedCommunities}
      />
    </div>
  );
}

