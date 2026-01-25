import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Users, Globe, Lock, Loader2, ArrowLeft, Plus, Image as ImageIcon, X, Send, Shield, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
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
    creator: {
        _id: string;
        username: string;
        avatar?: string;
    };
    admins: any[];
    members: any[];
    membersCount: number;
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
    const { user: currentUser } = useAuthStore();
    const navigate = useNavigate();
    const [community, setCommunity] = useState<Community | null>(null);
    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingPosts, setLoadingPosts] = useState(false);
    const [isJoined, setIsJoined] = useState(false);
    const [joining, setJoining] = useState(false);

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
            } else {
                await communityAPI.joinCommunity(id);
                toast.success(`Joined ${community.name}!`);
                setIsJoined(true);
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
            if (postCaption) formData.append('caption', postCaption);
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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-[#a855f7]" />
            </div>
        );
    }

    if (!community) return null;

    const communityCreatorId = community.creator?._id || (typeof community.creator === 'string' ? community.creator : '');
    const isAdmin = communityCreatorId === currentUser?._id ||
        community.admins?.some((admin: any) => (admin._id || admin) === currentUser?._id);

    return (
        <div className="min-h-screen bg-[#0a0a12]">
            {/* Header Banner */}
            <div className="relative h-48 sm:h-64 w-full bg-[#1a1a2e] overflow-hidden">
                {community.coverImage ? (
                    <img src={community.coverImage} alt={community.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#1a1a2e] to-[#0a0a12] opacity-50" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a12] via-transparent to-transparent" />

                <button
                    onClick={() => navigate('/community')}
                    className="absolute top-6 left-6 p-2 glass-card rounded-full text-white hover:bg-white/10 transition-colors z-10"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
                {/* Community Info Card */}
                <div className="glass-panel rounded-2xl p-6 mb-8 border-[rgba(168,85,247,0.2)]">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                        <div className="flex items-end gap-5">
                            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-[#7c3aed]/20 border-4 border-[#0a0a12] shadow-2xl flex items-center justify-center overflow-hidden shrink-0">
                                {community.coverImage ? (
                                    <img src={community.coverImage} alt={community.name} className="w-full h-full object-cover" />
                                ) : (
                                    <Users className="w-12 h-12 text-[#a855f7]" />
                                )}
                            </div>
                            <div className="pb-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h1 className="text-2xl sm:text-3xl font-bold text-[#e5e7eb] tracking-tight">{community.name}</h1>
                                    {community.isPublic ? (
                                        <Globe className="w-5 h-5 text-[#9ca3af]" />
                                    ) : (
                                        <Lock className="w-5 h-5 text-[#9ca3af]" />
                                    )}
                                </div>
                                <div className="flex items-center gap-4 text-sm text-[#9ca3af]">
                                    <span className="flex items-center gap-1.5 font-medium">
                                        <Users className="w-4 h-4" />
                                        {(community.membersCount || 0).toLocaleString()} members
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1.5">
                                        Created by <Link to={`/profile/${community.creator?.username}`} className="text-[#a855f7] hover:underline font-medium">{community.creator?.username}</Link>
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleJoinLeave}
                                disabled={joining}
                                className={`flex-1 sm:flex-none px-8 py-2.5 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 ${isJoined
                                    ? 'glass-card text-[#e5e7eb] hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30'
                                    : 'bg-gradient-to-r from-[#7c3aed] to-[#a855f7] text-white shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)]'
                                    }`}
                            >
                                {joining ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : isJoined ? (
                                    <>
                                        <LogOut className="w-4 h-4" />
                                        Joined
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-5 h-5" />
                                        Join Community
                                    </>
                                )}
                            </button>
                            {isAdmin && (
                                <button className="p-2.5 glass-card rounded-xl text-[#9ca3af] hover:text-[#e5e7eb] transition-colors">
                                    <Shield className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="mt-6">
                        <p className="text-[#9ca3af] leading-relaxed max-w-2xl">{community.description}</p>
                    </div>
                </div>

                {/* Content Tabs / Split */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Feed */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Create Post Area */}
                        {isJoined && (
                            <div className="glass-card rounded-2xl p-4 sm:p-5 border-[rgba(168,85,247,0.15)]">
                                {!showCreatePost ? (
                                    <div
                                        onClick={() => setShowCreatePost(true)}
                                        className="flex items-center gap-4 cursor-pointer group"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#a855f7] to-[#06b6d4] p-[2px]">
                                            <div className="w-full h-full rounded-full bg-[#0a0a12] flex items-center justify-center overflow-hidden">
                                                <img src={currentUser?.avatar || "/default-avatar.jpg"} alt="You" className="w-full h-full object-cover" />
                                            </div>
                                        </div>
                                        <div className="flex-1 bg-[rgba(168,85,247,0.05)] border border-[rgba(168,85,247,0.1)] rounded-xl px-4 py-2.5 text-[#9ca3af] group-hover:border-[rgba(168,85,247,0.3)] transition-all">
                                            Share something with the community...
                                        </div>
                                    </div>
                                ) : (
                                    <motion.form
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        onSubmit={handleCreatePost}
                                        className="space-y-4"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 mt-1">
                                                <img src={currentUser?.avatar || "/default-avatar.jpg"} alt="You" className="w-full h-full object-cover" />
                                            </div>
                                            <textarea
                                                value={postCaption}
                                                onChange={(e) => setPostCaption(e.target.value)}
                                                placeholder="What's on your mind?"
                                                className="flex-1 bg-transparent border-none focus:ring-0 text-[#e5e7eb] placeholder-[#6b7280] resize-none min-h-[100px] text-lg"
                                                autoFocus
                                            />
                                        </div>

                                        {mediaPreview && (
                                            <div className="relative rounded-xl overflow-hidden bg-[#0a0a12] aspect-video">
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
                                                    onClick={() => setShowCreatePost(false)}
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
                                    </motion.form>
                                )}
                            </div>
                        )}

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

                    {/* Sidebar Info */}
                    <div className="space-y-8">
                        {/* Rules / About Sidebar */}
                        <div className="glass-panel rounded-2xl p-6 border-[rgba(168,85,247,0.1)]">
                            <h3 className="text-[#e5e7eb] font-bold uppercase tracking-wider text-sm mb-4">About Community</h3>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-sm text-[#9ca3af]">
                                    <Globe className="w-4 h-4" />
                                    <span>Public - Anyone can see and join</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-[#9ca3af]">
                                    <Users className="w-4 h-4" />
                                    <span>{(community.membersCount || 0).toLocaleString()} members in orbit</span>
                                </div>
                                <div className="pt-4 border-t border-[rgba(168,85,247,0.1)]">
                                    <label className="text-xs font-bold text-[#6b7280] uppercase tracking-widest block mb-2">ADHERENCE</label>
                                    <p className="text-xs text-[#9ca3af] italic">By joining this community, you agree to respect the shared space and follow the Creator's transmissions.</p>
                                </div>
                            </div>
                        </div>

                        {/* Trending / Members Preview */}
                        <div className="glass-panel rounded-2xl p-6 border-[rgba(168,85,247,0.1)]">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[#e5e7eb] font-bold uppercase tracking-wider text-sm">Members</h3>
                                <Link to="#" className="text-xs text-[#a855f7] hover:underline">View All</Link>
                            </div>
                            <div className="grid grid-cols-5 gap-2">
                                {[...Array(10)].map((_, i) => (
                                    <div key={i} className="aspect-square bg-[#1a1a2e] rounded-lg border border-[rgba(168,85,247,0.1)] flex items-center justify-center">
                                        <Users className="w-4 h-4 text-[#374151]" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
