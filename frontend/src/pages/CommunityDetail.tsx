import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Users, Globe, Lock, Loader2, ArrowLeft, Plus, Image as ImageIcon, X, Send, Settings, Trash2, MessageSquare, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { communityAPI, communityPostAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { useCommunityStore } from '@/store/communityStore';
import { useAuthStore } from '@/store/authStore';
import { useSocketStore } from '@/store/socketStore';
import CommunityPostCard from '@/components/feed/CommunityPostCard';
import EditCommunityModal from '@/components/community/EditCommunityModal';

interface Community {
    _id: string;
    name: string;
    description: string;
    membersCount: number;
    isPublic: boolean;
    coverImage?: string;
    avatar?: string;
    creator: {
        _id: string;
        username: string;
        avatar?: string;
    };
    admins: any[];
    members: any[];
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

export default function CommunityDetail() {
    const { id } = useParams<{ id: string }>();
    const { triggerRefresh } = useCommunityStore();
    const { user: currentUser } = useAuthStore();
    const { socket } = useSocketStore();
    const navigate = useNavigate();
    const [community, setCommunity] = useState<Community | null>(null);
    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingPosts, setLoadingPosts] = useState(false);
    const [isJoined, setIsJoined] = useState(false);
    const [joining, setJoining] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showMembersModal, setShowMembersModal] = useState(false);
    const [removingUserId, setRemovingUserId] = useState<string | null>(null);

    // New Post State
    const [showCreatePost, setShowCreatePost] = useState(false);
    const [postCaption, setPostCaption] = useState('');
    const [postMedia, setPostMedia] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [creatingPost, setCreatingPost] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [page, setPage] = useState(1);
    const [hasNext, setHasNext] = useState(true);
    const observerTarget = useRef<HTMLDivElement>(null);

    // Infinite scroll
    useEffect(() => {
        if (!hasNext || loadingPosts || !id) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasNext && !loadingPosts) {
                    const nextPage = page + 1;
                    setPage(nextPage);
                    fetchPosts(nextPage, true);
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
    }, [hasNext, loadingPosts, page, id]);


    useEffect(() => {
        if (id) {
            fetchCommunityData();
        }
    }, [id]);

    // Listen for real-time community events
    useEffect(() => {
        if (!socket || !id) return;

        // Handle new post in this community
        const handleNewPost = (data: any) => {
            if (data?.post && data?.post?.community?._id === id) {
                // Add new post to the beginning of the list
                setPosts(prev => {
                    // Check if post already exists to avoid duplicates
                    const exists = prev.some(p => p._id === data.post._id);
                    if (exists) return prev;
                    return [data.post, ...prev];
                });
            }
        };

        // Handle post liked
        const handlePostLiked = (data: any) => {
            if (data?.postId) {
                setPosts(prev => prev.map(post => {
                    if (post._id === data.postId) {
                        return {
                            ...post,
                            likesCount: data.likesCount || post.likesCount
                        };
                    }
                    return post;
                }));
            }
        };

        // Handle member joined - refresh community data
        const handleMemberJoined = (data: any) => {
            if (data?.community?._id === id) {
                fetchCommunityData();
            }
        };

        socket.on('community:post:new', handleNewPost);
        socket.on('community:post:liked', handlePostLiked);
        socket.on('community:member:joined', handleMemberJoined);

        return () => {
            socket.off('community:post:new', handleNewPost);
            socket.off('community:post:liked', handlePostLiked);
            socket.off('community:member:joined', handleMemberJoined);
        };
    }, [socket, id]);

    const fetchCommunityData = async () => {
        if (!id) return;
        try {
            setLoading(true);
            const response = await communityAPI.getCommunity(id);
            const data = response.data.data;
            setCommunity(data);
            const isMem = data?.members?.some((m: any) => (m._id || m) === currentUser?._id);
            const isCreator = (data?.creator?._id || data?.creator) === currentUser?._id;
            setIsJoined(isMem || isCreator);

            // Fetch posts
            fetchPosts(1, false);
        } catch (error: any) {
            console.error('Failed to fetch community:', error);
            toast.error('Community not found');
            navigate('/community');
        } finally {
            setLoading(false);
        }
    };

    const fetchPosts = async (pageNum: number, append = false) => {
        if (!id) return;
        try {
            setLoadingPosts(true);
            const response = await communityPostAPI.getFeed(id, pageNum, 10);
            const { posts: newPosts, hasNext: more } = response.data.data || { posts: [], hasNext: false };

            if (append) {
                setPosts(prev => [...prev, ...newPosts]);
            } else {
                setPosts(newPosts);
            }
            setHasNext(more);
        } catch (error) {
            console.error('Failed to fetch posts:', error);
        } finally {
            setLoadingPosts(false);
        }
    };

    const handleJoinLeave = async () => {
        if (!community || !id) return;
        try {
            setJoining(true);
            if (isJoined) {
                const isCreator = (community.creator?._id || community.creator) === currentUser?._id;
                if (isCreator) {
                    toast.error("Creators cannot leave their community");
                    return;
                }
                await communityAPI.leaveCommunity(id);
                toast.success(`Left ${community.name}`);
                setIsJoined(false);
                triggerRefresh();
            } else {
                await communityAPI.joinCommunity(id);
                toast.success(`Joined ${community.name}!`);
                setIsJoined(true);
                triggerRefresh();
                fetchPosts(1, false);
            }
            const updated = await communityAPI.getCommunity(id);
            setCommunity(updated.data.data);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Action failed');
        } finally {
            setJoining(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPostMedia(file);
            setMediaPreview(URL.createObjectURL(file));
        }
    };

    const handleCreatePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || (!postCaption.trim() && !postMedia)) return;

        try {
            setCreatingPost(true);
            const formData = new FormData();
            if (postCaption) formData.append('text', postCaption);
            if (postMedia) formData.append('media', postMedia);

            await communityPostAPI.create(id, formData);
            toast.success('Post shared to community!');

            setPostCaption('');
            setPostMedia(null);
            setMediaPreview(null);
            setShowCreatePost(false);
            fetchPosts(1, false);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to post');
        } finally {
            setCreatingPost(false);
        }
    };

    const handleCommunityUpdate = (updatedData: any) => {
        setCommunity(updatedData);
        setIsJoined(true); // If they updated it, they are definitely in it
    };

    const handleRemoveUser = async (userId: string) => {
        if (!id || !confirm('Are you sure you want to remove this user from the community?')) return;
        
        try {
            setRemovingUserId(userId);
            await communityAPI.removeUser(id, userId);
            toast.success('User removed from community');
            
            // Refresh community data
            const updated = await communityAPI.getCommunity(id);
            setCommunity(updated.data.data);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to remove user');
        } finally {
            setRemovingUserId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-[#a855f7]" />
            </div>
        );
    }

    if (!community) return null;

    const communityCreatorId = community.creator?._id || (typeof community.creator === 'string' ? community.creator : '');
    const isOwner = communityCreatorId === currentUser?._id;
    const isAdmin = isOwner ||
        community.admins?.some((admin: any) => (admin._id || admin) === currentUser?._id);

    return (
        <div className="min-h-screen bg-[#0a0a12]">
            {/* Header Banner */}
            <div className=" h-24 sm:h-40 pt-0 mt-6 bg-[#1a1a2e] overflow-hidden">
                {community.coverImage ? (
                    <img src={community.coverImage} alt={community.name} className="w-full h-full object-cover" />
                ) : community.avatar ? (
                    <img src={community.avatar} alt={community.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full" />
                )}

                <button
                    onClick={() => navigate('/community')}
                    className="absolute top-6 left-6 p-2 glass-card rounded-full text-white hover:bg-white/10 transition-colors z-10"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
                {/* Community Info Card */}
                <div className="p-6 mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                        <div className="flex items-end gap-5">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#1a1a2e] border-4 border-[#0a0a12] shadow-2xl flex items-center justify-center overflow-hidden shrink-0">
                                {community.avatar ? (
                                    <img src={community.avatar} alt={community.name} className="w-full h-full object-cover" />
                                ) : community.coverImage ? (
                                    <img src={community.coverImage} alt={community.name} className="w-full h-full object-cover opacity-50" />
                                ) : (
                                    <Users className="w-12 h-12 text-[#a855f7]" />
                                )}
                            </div>
                            <div className="pb-1 flex flex-col gap-1">
                                <h1 className="text-xl sm:text-2xl font-bold text-[#e5e7eb] tracking-tight">o/{community.name}</h1>

                                <div className="flex items-center gap-2 text-xs font-medium text-[#9ca3af]">
                                    {community.isPublic ? (
                                        <>
                                            <Globe className="w-4 h-4" />
                                            <span>Public</span>
                                        </>
                                    ) : (
                                        <>
                                            <Lock className="w-4 h-4" />
                                            <span>Private</span>
                                        </>
                                    )}
                                </div>

                                <div
                                    onClick={() => setShowMembersModal(true)}
                                    className="flex items-center gap-2 text-sm text-[#9ca3af] cursor-pointer hover:text-[#a855f7] transition-colors"
                                >
                                    <span className="flex items-center gap-1.5 font-medium">
                                        <Users className="w-4 h-4" />
                                        {(community.membersCount || 0).toLocaleString()} members
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={isOwner || isJoined ? () => setShowCreatePost(true) : handleJoinLeave}
                                disabled={joining}
                                className={`flex-1 sm:flex-none px-8 py-2.5 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 ${isOwner || isJoined
                                    ? 'bg-[#7c3aed] text-white'
                                    : 'bg-[#a855f7] text-white'
                                    }`}
                            >
                                {joining ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : isOwner || isJoined ? (
                                    <>
                                        <Plus className="w-4 h-4" />
                                        Create Post
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-5 h-5" />
                                        Join Community
                                    </>
                                )}
                            </button>
                            {isOwner || isJoined ? (
                                <button
                                    onClick={() => navigate(`/messages?communityId=${id}`)}
                                    className="p-2.5 glass-card rounded-xl text-[#9ca3af] hover:text-[#06b6d4] hover:border-[#06b6d4]/30 transition-all group"
                                    title="Open Community Chat"
                                >
                                    <MessageSquare className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                </button>
                            ) : null}
                            {isAdmin && (
                                <button
                                    onClick={() => setShowEditModal(true)}
                                    className="p-2.5 glass-card rounded-xl text-[#9ca3af] hover:text-[#a855f7] hover:border-[#a855f7]/30 transition-all group"
                                    title="Community Settings"
                                >
                                    <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
                                </button>
                            )}
                            {isJoined && !isOwner && (
                                <button
                                    onClick={handleJoinLeave}
                                    disabled={joining}
                                    className="p-2.5 glass-card rounded-xl text-red-400 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/30 transition-all group border border-red-400/20"
                                    title="Leave Community"
                                >
                                    {joining ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    )}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="mt-2 sm:pl-6 flex flex-col gap-4">
                        <p className="text-[#9ca3af] leading-relaxed max-w-2xl text-sm">{community.description}</p>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="space-y-6">
                    {/* Posts Feed */}
                    <div className="space-y-6">
                        {loadingPosts && posts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                <Loader2 className="w-10 h-10 animate-spin text-[#a855f7]" />
                                <p className="text-[#9ca3af] animate-pulse">Scanning the orbit for signals...</p>
                            </div>
                        ) : posts.length > 0 ? (
                            <>
                                {posts.map((post) => (
                                    <CommunityPostCard
                                        key={post._id}
                                        post={post}
                                        isAdmin={isAdmin}
                                        onDelete={(id) => setPosts(prev => prev.filter(p => p._id !== id))}
                                    />
                                ))}
                                {hasNext && (
                                    <div ref={observerTarget} className="flex justify-center py-8">
                                        <Loader2 className="w-6 h-6 animate-spin text-[#a855f7]" />
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="glass-panel rounded-2xl p-12 text-center">
                                <div className="w-16 h-16 rounded-full bg-[#1a1a2e] flex items-center justify-center mx-auto mb-4 border border-[rgba(168,85,247,0.1)]">
                                    <Users className="w-8 h-8 text-[#6b7280]" />
                                </div>
                                <h3 className="text-[#e5e7eb] font-bold text-lg mb-2">No transmissions yet</h3>
                                <p className="text-[#9ca3af] max-w-xs mx-auto mb-6">Be the first to share something with this community or invite others to join the conversation.</p>
                                {isJoined && (
                                    <button
                                        onClick={() => setShowCreatePost(true)}
                                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#7c3aed]/10 text-[#a855f7] border border-[#7c3aed]/30 rounded-xl font-bold hover:bg-[#7c3aed]/20 transition-all"
                                    >
                                        <Plus className="w-5 h-5" />
                                        Create First Post
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <EditCommunityModal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                onSuccess={handleCommunityUpdate}
                community={community}
            />

            {/* Create Post Modal */}
            <AnimatePresence>
                {showCreatePost && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => {
                                setShowCreatePost(false);
                                setPostCaption('');
                                setPostMedia(null);
                                setMediaPreview(null);
                            }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#0a0a12] border border-[rgba(168,85,247,0.2)] w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl relative z-10"
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-[rgba(168,85,247,0.1)] flex items-center justify-between bg-[rgba(168,85,247,0.02)]">
                                <h2 className="text-xl font-bold text-white">Create Post</h2>
                                <button
                                    onClick={() => {
                                        setShowCreatePost(false);
                                        setPostCaption('');
                                        setPostMedia(null);
                                        setMediaPreview(null);
                                    }}
                                    className="p-2 hover:bg-white/5 rounded-full text-[#9ca3af] hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <form onSubmit={handleCreatePost} className="p-6 space-y-4">
                                {mediaPreview && (
                                    <div className="relative rounded-xl overflow-hidden bg-[#0a0a12] aspect-video mb-4">
                                        <img src={mediaPreview} alt="Preview" className="w-full h-full object-contain" />
                                        <button
                                            type="button"
                                            onClick={() => { setPostMedia(null); setMediaPreview(null); }}
                                            className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}

                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 mt-1">
                                        <img src={currentUser?.avatar || "/default-avatar.jpg"} alt="You" className="w-full h-full object-cover" />
                                    </div>
                                    <textarea
                                        value={postCaption}
                                        onChange={(e) => setPostCaption(e.target.value)}
                                        placeholder="Share something with the community..."
                                        className="flex-1 bg-transparent border-none focus:ring-0 text-[#e5e7eb] placeholder-[#6b7280] resize-none min-h-[120px] text-lg"
                                        autoFocus
                                    />
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-[rgba(168,85,247,0.1)]">
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="p-2 text-[#9ca3af] hover:text-[#a855f7] hover:bg-[#a855f7]/10 rounded-lg transition-all flex items-center gap-2 text-sm font-medium"
                                        >
                                            <ImageIcon className="w-5 h-5" />
                                            <span>Photo/Video</span>
                                        </button>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*,video/*"
                                            onChange={handleFileSelect}
                                            className="hidden"
                                        />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowCreatePost(false);
                                                setPostCaption('');
                                                setPostMedia(null);
                                                setMediaPreview(null);
                                            }}
                                            className="px-4 py-2 text-sm font-medium text-[#9ca3af] hover:text-[#e5e7eb] transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={creatingPost || (!postCaption.trim() && !postMedia)}
                                            className="px-6 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-xl text-white font-bold text-sm transition-all disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {creatingPost ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                            Post
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Members Modal */}
            <AnimatePresence>
                {showMembersModal && (
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
                            className="bg-[#0a0a12] border border-[rgba(168,85,247,0.2)] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[80vh]"
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
                                {/* Owner Section */}
                                <div className="px-4 py-2 text-[10px] font-bold text-[#6b7280] uppercase tracking-widest">Creator</div>
                                <Link
                                    to={`/profile/${community.creator.username}`}
                                    className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full border-2 border-[#a855f7] p-0.5 overflow-hidden">
                                            <img
                                                src={community.creator.avatar || "/default-avatar.jpg"}
                                                alt={community.creator.username}
                                                className="w-full h-full rounded-full object-cover"
                                            />
                                        </div>
                                        <div>
                                            <div className="font-bold text-white group-hover:text-[#a855f7] transition-colors">
                                                u/{community.creator.username}
                                            </div>
                                            <div className="text-xs text-[#9ca3af]">Main Transmission</div>
                                        </div>
                                    </div>
                                    <div className="px-2 py-0.5 rounded-md bg-[#a855f7]/10 border border-[#a855f7]/30 text-[10px] font-bold text-[#a855f7] uppercase tracking-wider">
                                        Owner
                                    </div>
                                </Link>

                                {/* Admins Section */}
                                {community.admins?.filter(a => a._id !== community.creator._id).length > 0 && (
                                    <>
                                        <div className="px-4 py-2 mt-4 text-[10px] font-bold text-[#6b7280] uppercase tracking-widest">Admins</div>
                                        {community.admins
                                            .filter(a => a._id !== community.creator._id)
                                            .map((admin: any) => (
                                                <div
                                                    key={admin._id}
                                                    className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group"
                                                >
                                                    <Link
                                                        to={`/profile/${admin.username}`}
                                                        className="flex items-center gap-3 flex-1"
                                                    >
                                                        <div className="w-10 h-10 rounded-full border-2 border-[rgba(168,85,247,0.3)] p-0.5 overflow-hidden">
                                                            <img
                                                                src={admin.avatar || "/default-avatar.jpg"}
                                                                alt={admin.username}
                                                                className="w-full h-full rounded-full object-cover"
                                                            />
                                                        </div>
                                                        <div className="font-bold text-white group-hover:text-[#a855f7] transition-colors">
                                                            u/{admin.username}
                                                        </div>
                                                    </Link>
                                                    <div className="flex items-center gap-2">
                                                        <div className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">
                                                            Admin
                                                        </div>
                                                        {isAdmin && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleRemoveUser(admin._id);
                                                                }}
                                                                disabled={removingUserId === admin._id}
                                                                className="p-2 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                                title="Remove from community"
                                                            >
                                                                {removingUserId === admin._id ? (
                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                ) : (
                                                                    <Trash2 className="w-4 h-4" />
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        }
                                    </>
                                )}

                                {/* Members Section */}
                                <div className="px-4 py-2 mt-4 text-[10px] font-bold text-[#6b7280] uppercase tracking-widest">Members</div>
                                {community.members
                                    ?.filter(m => m._id !== community.creator._id && !community.admins.some(a => a._id === m._id))
                                    .map((member: any) => (
                                        <div
                                            key={member._id}
                                            className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group"
                                        >
                                            <Link
                                                to={`/profile/${member.username}`}
                                                className="flex items-center gap-3 flex-1"
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
                                            {isAdmin && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRemoveUser(member._id);
                                                    }}
                                                    disabled={removingUserId === member._id}
                                                    className="p-2 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    title="Remove from community"
                                                >
                                                    {removingUserId === member._id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4" />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    ))
                                }
                            </div>

                            <div className="p-4 bg-[rgba(168,85,247,0.02)] border-t border-[rgba(168,85,247,0.05)] text-center">
                                <p className="text-xs text-[#6b7280]">
                                    Showing all {community.membersCount} participants in orbit
                                </p>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

