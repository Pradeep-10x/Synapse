import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, ArrowLeft, Image as ImageIcon, X, Send, Settings, Trash2, MessageSquare, LogOut, ChevronDown, ChevronUp, Heart, Users, Info, Crown, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { communityAPI, communityPostAPI, communityCommentAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { useCommunityStore } from '@/store/communityStore';
import { useAuthStore } from '@/store/authStore';
import { useSocketStore } from '@/store/socketStore';
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

interface Comment {
    _id: string;
    user: {
        _id: string;
        username: string;
        avatar?: string;
    };
    content: string;
    createdAt: string;
}

const formatTimeAgo = (date: string): string => {
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hour ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
};

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
    const [showPostModal, setShowPostModal] = useState(false);
    const [showMembersModal, setShowMembersModal] = useState(false);

    // Post creation
    const [postCaption, setPostCaption] = useState('');
    const [postMedia, setPostMedia] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [creatingPost, setCreatingPost] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Pagination
    const [page, setPage] = useState(1);
    const [hasNext, setHasNext] = useState(true);
    const observerTarget = useRef<HTMLDivElement>(null);

    // Comments state per post
    const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
    const [postComments, setPostComments] = useState<Record<string, Comment[]>>({});
    const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
    const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
    const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});

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

        const handleNewPost = (data: any) => {
            if (data?.post && data?.post?.community?._id === id) {
                setPosts(prev => {
                    const exists = prev.some(p => p._id === data.post._id);
                    if (exists) return prev;
                    return [data.post, ...prev];
                });
            }
        };

        const handlePostLiked = (data: any) => {
            if (data?.postId) {
                setPosts(prev => prev.map(post => {
                    if (post._id === data.postId) {
                        return {
                            ...post,
                            likesCount: data.likesCount ?? post.likesCount,
                            isLiked: data.isLiked ?? post.isLiked
                        };
                    }
                    return post;
                }));
            }
        };

        socket.on('community:newPost', handleNewPost);
        socket.on('community:postLiked', handlePostLiked);

        return () => {
            socket.off('community:newPost', handleNewPost);
            socket.off('community:postLiked', handlePostLiked);
        };
    }, [socket, id]);

    const fetchCommunityData = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const [communityRes] = await Promise.all([
                communityAPI.getCommunity(id)
            ]);

            const communityData = communityRes.data.data;
            setCommunity(communityData);

            const isCreator = currentUser?._id === communityData.creator._id;
            const isAdmin = communityData.admins?.some((a: any) => a._id === currentUser?._id);
            const isMember = communityData.members?.some((m: any) => m._id === currentUser?._id);
            setIsJoined(isCreator || isAdmin || isMember);

            await fetchPosts(1, false);
        } catch (error) {
            console.error('Error fetching community:', error);
            toast.error('Failed to load community');
            navigate('/communities');
        } finally {
            setLoading(false);
        }
    };

    const fetchPosts = async (pageNum: number, append: boolean) => {
        if (!id) return;
        setLoadingPosts(true);
        try {
            const res = await communityPostAPI.getFeed(id, pageNum, 10);
            const data = res.data.data;

            if (append) {
                setPosts(prev => [...prev, ...(data.posts || [])]);
            } else {
                setPosts(data.posts || []);
            }
            setHasNext(data.hasNext ?? false);
        } catch (error) {
            console.error('Error fetching posts:', error);
        } finally {
            setLoadingPosts(false);
        }
    };

    const handleJoinLeave = async () => {
        if (!community) return;
        setJoining(true);
        try {
            if (isJoined) {
                await communityAPI.leaveCommunity(community._id);
                setIsJoined(false);
                setCommunity(prev => prev ? { ...prev, membersCount: prev.membersCount - 1 } : null);
                toast.success('Left community');
            } else {
                await communityAPI.joinCommunity(community._id);
                setIsJoined(true);
                setCommunity(prev => prev ? { ...prev, membersCount: prev.membersCount + 1 } : null);
                toast.success('Joined community!');
            }
            triggerRefresh();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Action failed');
        } finally {
            setJoining(false);
        }
    };

    const handleCreatePost = async () => {
        if (!community || (!postCaption.trim() && !postMedia)) {
            toast.error('Please add some content');
            return;
        }

        setCreatingPost(true);
        try {
            const formData = new FormData();
            if (postCaption.trim()) {
                formData.append('caption', postCaption.trim());
            }
            if (postMedia) {
                formData.append('media', postMedia);
            }

            const res = await communityPostAPI.create(community._id, formData);
            const newPost = res.data.data;
            setPosts(prev => [newPost, ...prev]);
            setPostCaption('');
            setPostMedia(null);
            setMediaPreview(null);
            toast.success('Post created!');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to create post');
        } finally {
            setCreatingPost(false);
        }
    };

    const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPostMedia(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setMediaPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleLikePost = async (postId: string) => {
        try {
            const res = await communityPostAPI.like(postId);
            const { isLiked, likesCount } = res.data.data;

            setPosts(prev => prev.map(post => {
                if (post._id === postId) {
                    return { ...post, isLiked, likesCount };
                }
                return post;
            }));
        } catch (error) {
            console.error('Error liking post:', error);
        }
    };

    const handleDeletePost = async (postId: string) => {
        try {
            await communityPostAPI.delete(postId);
            setPosts(prev => prev.filter(p => p._id !== postId));
            toast.success('Post deleted');
        } catch (error) {
            toast.error('Failed to delete post');
        }
    };

    const toggleComments = async (postId: string) => {
        const isExpanded = expandedComments.has(postId);

        if (isExpanded) {
            setExpandedComments(prev => {
                const newSet = new Set(prev);
                newSet.delete(postId);
                return newSet;
            });
        } else {
            setExpandedComments(prev => new Set(prev).add(postId));

            if (!postComments[postId]) {
                setLoadingComments(prev => ({ ...prev, [postId]: true }));
                try {
                    const res = await communityCommentAPI.getComments(postId);
                    setPostComments(prev => ({ ...prev, [postId]: res.data.data || [] }));
                } catch (error) {
                    console.error('Error fetching comments:', error);
                } finally {
                    setLoadingComments(prev => ({ ...prev, [postId]: false }));
                }
            }
        }
    };

    const handleSubmitComment = async (postId: string) => {
        const content = commentInputs[postId]?.trim();
        if (!content) return;

        setSubmittingComment(prev => ({ ...prev, [postId]: true }));
        try {
            const res = await communityCommentAPI.addComment(postId, content);
            const newComment = res.data.data;

            setPostComments(prev => ({
                ...prev,
                [postId]: [...(prev[postId] || []), newComment]
            }));

            setPosts(prev => prev.map(post => {
                if (post._id === postId) {
                    return { ...post, commentsCount: post.commentsCount + 1 };
                }
                return post;
            }));

            setCommentInputs(prev => ({ ...prev, [postId]: '' }));
        } catch (error) {
            toast.error('Failed to add comment');
        } finally {
            setSubmittingComment(prev => ({ ...prev, [postId]: false }));
        }
    };

    const handleDeleteComment = async (postId: string, commentId: string) => {
        try {
            await communityCommentAPI.deleteComment(commentId);
            setPostComments(prev => ({
                ...prev,
                [postId]: (prev[postId] || []).filter(c => c._id !== commentId)
            }));
            setPosts(prev => prev.map(post => {
                if (post._id === postId) {
                    return { ...post, commentsCount: Math.max(0, post.commentsCount - 1) };
                }
                return post;
            }));
            toast.success('Comment deleted');
        } catch (error) {
            toast.error('Failed to delete comment');
        }
    };

    const isCreator = currentUser?._id === community?.creator._id;
    const isAdmin = community?.admins?.some((a: any) => a._id === currentUser?._id) || isCreator;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--synapse-bg)' }}>
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--synapse-primary)' }} />
            </div>
        );
    }

    if (!community) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--synapse-bg)' }}>
                <p style={{ color: 'var(--synapse-text-secondary)' }}>Community not found</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen" style={{ background: 'var(--synapse-bg)' }}>
            {/* Banner */}
            <div className="relative h-32 md:h-35 overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                {community.coverImage ? (
                    <img
                        src={community.coverImage}
                        alt={community.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div
                        className="w-full h-full"
                        style={{
                            background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)',
                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                        }}
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--synapse-bg)] via-transparent to-transparent" />

                {/* Back button */}
                <button
                    onClick={() => navigate('/communities')}
                    className="absolute top-4 left-4 p-2 rounded-full bg-black/60 backdrop-blur-sm hover:bg-black/40 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-white" />
                </button>

                {/* Settings button for admins */}
                {isAdmin && (
                    <div className="absolute top-4 right-4 flex gap-2">
                        <button
                            onClick={() => setShowEditModal(true)}
                            className="p-2 rounded-full bg-black/60 backdrop-blur-sm hover:bg-black/40 transition-colors"
                        >
                            <Settings className="w-5 h-5 text-white" />
                        </button>
                        {/* {isCreator && (
                            <button
                                onClick={handleDeleteCommunity}
                                className="p-2 rounded-full bg-red-500/20 backdrop-blur-sm hover:bg-red-500/30 transition-colors"
                            >
                                <Trash2 className="w-5 h-5 text-red-400" />
                            </button>
                        )} */}
                    </div>
                )}
            </div>

            {/* Community Avatar and Name */}
            <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--synapse-border)' }}>
                <div className="flex items-center gap-4">
                    <div className="relative -mt-12">
                        <img
                            src={community.avatar || community.coverImage || '/default-community.jpg'}
                            alt={community.name}
                            className="w-25 h-25 rounded-full object-cover border-4"
                            style={{ borderColor: 'var(--synapse-bg)', boxShadow: '0 0 0 2px rgba(255,255,255,0.15)' }}
                        />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--synapse-text)' }}>
                            {community.name}
                        </h1>
                        <p className="text-sm" style={{ color: 'var(--synapse-text-secondary)' }}>
                            {community.membersCount} members • {community.isPublic ? 'Public' : 'Private'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 py-5">
                <div className="flex gap-6">
                    {/* Left Content */}
                    <div className="flex-1 min-w-0">
                        <div className="space-y-6">
                            {/* Posts */}
                            <div className="space-y-4">
                                {posts.map((post) => (
                                    <PostCard
                                        key={post._id}
                                        post={post}
                                        isAdmin={isAdmin}
                                        currentUserId={currentUser?._id}
                                        onLike={handleLikePost}
                                        onDelete={handleDeletePost}
                                        onDeleteComment={(commentId) => handleDeleteComment(post._id, commentId)}
                                        expanded={expandedComments.has(post._id)}
                                        onToggleComments={() => toggleComments(post._id)}
                                        comments={postComments[post._id] || []}
                                        loadingComments={loadingComments[post._id] || false}
                                        commentInput={commentInputs[post._id] || ''}
                                        onCommentInputChange={(value) => setCommentInputs(prev => ({ ...prev, [post._id]: value }))}
                                        onSubmitComment={() => handleSubmitComment(post._id)}
                                        submittingComment={submittingComment[post._id] || false}
                                    />
                                ))}

                                {loadingPosts && (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--synapse-primary)' }} />
                                    </div>
                                )}

                                {!loadingPosts && posts.length === 0 && (
                                    <div className="text-center py-12">
                                        <p style={{ color: 'var(--synapse-text-secondary)' }}>No posts yet. Be the first to share!</p>
                                    </div>
                                )}

                                <div ref={observerTarget} className="h-4" />
                            </div>
                        </div>
                    </div>

                    {/* Right Sidebar - Actions */}
                    <div className="hidden lg:block w-80 flex-shrink-0">
                        <div className="sticky top-6 space-y-4">
                            {/* Action Buttons */}
                            {isJoined && (
                                <div
                                    className="rounded-md p-4 space-y-3"
                                    style={{
                                        background: 'var(--synapse-surface)',
                                        border: '1px solid var(--synapse-border)'
                                    }}
                                >
                                    <button
                                        onClick={() => navigate(`/messages?communityId=${community._id}`)}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-sm text-sm font-medium transition-all hover:bg-white/5"
                                        style={{
                                            color: 'var(--synapse-text)',
                                            border: '1px solid var(--synapse-border)'
                                        }}
                                    >
                                        <MessageSquare className="w-5 h-5" style={{ color: 'var(--synapse-primary)' }} />
                                        Discussion
                                    </button>
                                    <button
                                        onClick={() => setShowPostModal(true)}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-sm text-sm font-medium transition-all hover:bg-white/5"
                                        style={{
                                            color: 'var(--synapse-text)',
                                            border: '1px solid var(--synapse-border)'
                                        }}
                                    >
                                        <ImageIcon className="w-5 h-5" style={{ color: 'var(--synapse-primary)' }} />
                                        Post media
                                    </button>
                                </div>
                            )}

                            {/* Join/Leave Button */}
                            {!isCreator && (
                                <button
                                    onClick={handleJoinLeave}
                                    disabled={joining}
                                    className={`w-full py-3 rounded-md font-medium transition-all ${isJoined
                                        ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                        : 'text-black'
                                        }`}
                                    style={!isJoined ? { background: 'var(--synapse-primary)' } : {}}
                                >
                                    {joining ? (
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                    ) : isJoined ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <LogOut className="w-4 h-4" />
                                            Leave Community
                                        </span>
                                    ) : (
                                        'Join Community'
                                    )}
                                </button>
                            )}

                            {/* Members Box */}
                            <div
                                className="rounded-md p-4"
                                style={{
                                    background: 'var(--synapse-surface)',
                                    border: '1px solid var(--synapse-border)'
                                }}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--synapse-text)' }}>
                                        <Users className="w-4 h-4" style={{ color: 'var(--synapse-primary)' }} />
                                        Members
                                    </h3>
                                    <span className="text-xs" style={{ color: 'var(--synapse-text-secondary)' }}>
                                        {community.membersCount}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {/* Sort: Owner first, then admins, then regular members */}
                                    {(() => {
                                        const allMembers = [
                                            { ...community.creator, role: 'owner' as const },
                                            ...(community.admins || []).filter((a: any) => a._id !== community.creator._id).map((a: any) => ({ ...a, role: 'admin' as const })),
                                            ...(community.members || []).filter((m: any) =>
                                                m._id !== community.creator._id &&
                                                !(community.admins || []).some((a: any) => a._id === m._id)
                                            ).map((m: any) => ({ ...m, role: 'member' as const }))
                                        ];
                                        return allMembers.map((member: any) => (
                                            <Link
                                                key={member._id}
                                                to={`/profile/${member.username}`}
                                                className="flex items-center gap-2 p-2 rounded-md hover:bg-white/5 transition-colors"
                                            >
                                                <div className="relative">
                                                    <img
                                                        src={member.avatar || '/default-avatar.jpg'}
                                                        alt={member.username}
                                                        className="w-8 h-8 rounded-full object-cover"
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate" style={{ color: 'var(--synapse-text)' }}>
                                                        {member.username}
                                                    </p>
                                                </div>
                                                {member.role === 'owner' && (
                                                    <Crown className="w-4 h-4 text-yellow-500" />
                                                )}
                                                {member.role === 'admin' && (
                                                    <Shield className="w-4 h-4 text-blue-400" />
                                                )}
                                            </Link>
                                        ));
                                    })()}
                                </div>
                                {community.membersCount > 5 && (
                                    <button
                                        onClick={() => setShowMembersModal(true)}
                                        className="w-full mt-3 py-2 text-sm font-medium rounded-md hover:bg-white/5 transition-colors"
                                        style={{ color: 'var(--synapse-primary)' }}
                                    >
                                        View all {community.membersCount} members
                                    </button>
                                )}
                            </div>

                            {/* About Box */}
                            <div
                                className="rounded-md p-4"
                                style={{
                                    background: 'var(--synapse-surface)',
                                    border: '1px solid var(--synapse-border)'
                                }}
                            >
                                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3" style={{ color: 'var(--synapse-text)' }}>
                                    <Info className="w-4 h-4" style={{ color: 'var(--synapse-primary)' }} />
                                    About
                                </h3>
                                <p className="text-sm leading-relaxed" style={{ color: 'var(--synapse-text-secondary)' }}>
                                    {community.description || 'No description available.'}
                                </p>
                                <div className="mt-3 pt-3 space-y-2" style={{ borderTop: '1px solid var(--synapse-border)' }}>
                                    <div className="flex items-center justify-between text-xs">
                                        <span style={{ color: 'var(--synapse-text-secondary)' }}>Visibility</span>
                                        <span style={{ color: 'var(--synapse-text)' }}>{community.isPublic ? 'Public' : 'Private'}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span style={{ color: 'var(--synapse-text-secondary)' }}>Created by</span>
                                        <Link to={`/profile/${community.creator.username}`} className="hover:underline" style={{ color: 'var(--synapse-primary)' }}>
                                            {community.creator.username}
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            <EditCommunityModal
                isOpen={showEditModal}
                community={community}
                onClose={() => setShowEditModal(false)}
                onSuccess={(updated) => {
                    setCommunity(prev => prev ? { ...prev, ...updated } : null);
                    setShowEditModal(false);
                }}
            />

            {/* Create Post Modal */}
            <AnimatePresence>
                {showPostModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        style={{ background: 'rgba(0,0,0,0.8)' }}
                        onClick={() => setShowPostModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-lg rounded-md overflow-hidden"
                            style={{
                                background: 'var(--synapse-surface)',
                                border: '1px solid var(--synapse-border)'
                            }}
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--synapse-border)' }}>
                                <h3 className="text-lg font-semibold" style={{ color: 'var(--synapse-text)' }}>Create Post</h3>
                                <button
                                    onClick={() => {
                                        setShowPostModal(false);
                                        setPostMedia(null);
                                        setMediaPreview(null);
                                        setPostCaption('');
                                    }}
                                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                                >
                                    <X className="w-5 h-5" style={{ color: 'var(--synapse-text-secondary)' }} />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-4 space-y-4">
                                {/* Media Upload Area */}
                                <div
                                    className="relative aspect-square rounded-md overflow-hidden cursor-pointer group"
                                    style={{
                                        background: 'var(--synapse-bg)',
                                        border: '2px dashed var(--synapse-border)'
                                    }}
                                    onClick={() => !mediaPreview && fileInputRef.current?.click()}
                                >
                                    {mediaPreview ? (
                                        <>
                                            {postMedia?.type.startsWith('video/') ? (
                                                <video
                                                    src={mediaPreview}
                                                    className="w-full h-full object-cover"
                                                    controls
                                                />
                                            ) : (
                                                <img
                                                    src={mediaPreview}
                                                    alt="Preview"
                                                    className="w-full h-full object-cover"
                                                />
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPostMedia(null);
                                                    setMediaPreview(null);
                                                }}
                                                className="absolute top-3 right-3 p-2 rounded-full bg-black/60 hover:bg-black/80 transition-colors"
                                            >
                                                <X className="w-4 h-4 text-white" />
                                            </button>
                                        </>
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                                            <div
                                                className="p-4 rounded-full"
                                                style={{ background: 'var(--synapse-surface)' }}
                                            >
                                                <ImageIcon className="w-8 h-8" style={{ color: 'var(--synapse-primary)' }} />
                                            </div>
                                            <div className="text-center">
                                                <p className="font-medium" style={{ color: 'var(--synapse-text)' }}>
                                                    Click to upload
                                                </p>
                                                <p className="text-sm mt-1" style={{ color: 'var(--synapse-text-secondary)' }}>
                                                    Photo or Video (1:1 ratio recommended)
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*,video/*"
                                    className="hidden"
                                    onChange={handleMediaSelect}
                                />

                                {/* Caption Input */}
                                <div>
                                    <textarea
                                        value={postCaption}
                                        onChange={(e) => setPostCaption(e.target.value)}
                                        placeholder="Write a caption..."
                                        className="w-full bg-transparent resize-none outline-none text-sm p-3 rounded-md"
                                        style={{
                                            color: 'var(--synapse-text)',
                                            background: 'var(--synapse-bg)',
                                            border: '1px solid var(--synapse-border)'
                                        }}
                                        rows={3}
                                    />
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 border-t" style={{ borderColor: 'var(--synapse-border)' }}>
                                <button
                                    onClick={async () => {
                                        await handleCreatePost();
                                        setShowPostModal(false);
                                    }}
                                    disabled={creatingPost || (!postCaption.trim() && !postMedia)}
                                    className="w-full py-3 rounded-md text-sm font-semibold transition-all disabled:opacity-50"
                                    style={{
                                        background: '#3b82f6',
                                        color: '#fff'
                                    }}
                                >
                                    {creatingPost ? (
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                    ) : (
                                        'Share Post'
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Members Modal */}
            <AnimatePresence>
                {showMembersModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        style={{ background: 'rgba(0,0,0,0.8)' }}
                        onClick={() => setShowMembersModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md rounded-md overflow-hidden"
                            style={{
                                background: 'var(--synapse-surface)',
                                border: '1px solid var(--synapse-border)'
                            }}
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--synapse-border)' }}>
                                <h3 className="text-lg font-semibold" style={{ color: 'var(--synapse-text)' }}>
                                    Members ({community.membersCount})
                                </h3>
                                <button
                                    onClick={() => setShowMembersModal(false)}
                                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                                >
                                    <X className="w-5 h-5" style={{ color: 'var(--synapse-text-secondary)' }} />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-4 max-h-96 overflow-y-auto">
                                <div className="space-y-2">
                                    {/* Owner */}
                                    <div className="mb-4">
                                        <p className="text-xs font-medium mb-2 px-2" style={{ color: 'var(--synapse-text-secondary)' }}>
                                            OWNER
                                        </p>
                                        <Link
                                            to={`/profile/${community.creator.username}`}
                                            onClick={() => setShowMembersModal(false)}
                                            className="flex items-center gap-3 p-2 rounded-md hover:bg-white/5 transition-colors"
                                        >
                                            <img
                                                src={community.creator.avatar || '/default-avatar.jpg'}
                                                alt={community.creator.username}
                                                className="w-10 h-10 rounded-full object-cover"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate" style={{ color: 'var(--synapse-text)' }}>
                                                    {community.creator.username}
                                                </p>
                                            </div>
                                            <Crown className="w-4 h-4 text-yellow-500" />
                                        </Link>
                                    </div>

                                    {/* Admins */}
                                    {(community.admins || []).filter((a: any) => a._id !== community.creator._id).length > 0 && (
                                        <div className="mb-4">
                                            <p className="text-xs font-medium mb-2 px-2" style={{ color: 'var(--synapse-text-secondary)' }}>
                                                ADMINS
                                            </p>
                                            {(community.admins || [])
                                                .filter((a: any) => a._id !== community.creator._id)
                                                .map((admin: any) => (
                                                    <Link
                                                        key={admin._id}
                                                        to={`/profile/${admin.username}`}
                                                        onClick={() => setShowMembersModal(false)}
                                                        className="flex items-center gap-3 p-2 rounded-md hover:bg-white/5 transition-colors"
                                                    >
                                                        <img
                                                            src={admin.avatar || '/default-avatar.jpg'}
                                                            alt={admin.username}
                                                            className="w-10 h-10 rounded-full object-cover"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium truncate" style={{ color: 'var(--synapse-text)' }}>
                                                                {admin.username}
                                                            </p>
                                                        </div>
                                                        <Shield className="w-4 h-4 text-blue-400" />
                                                    </Link>
                                                ))}
                                        </div>
                                    )}

                                    {/* Members */}
                                    {(community.members || []).filter((m: any) =>
                                        m._id !== community.creator._id &&
                                        !(community.admins || []).some((a: any) => a._id === m._id)
                                    ).length > 0 && (
                                            <div>
                                                <p className="text-xs font-medium mb-2 px-2" style={{ color: 'var(--synapse-text-secondary)' }}>
                                                    MEMBERS
                                                </p>
                                                {(community.members || [])
                                                    .filter((m: any) =>
                                                        m._id !== community.creator._id &&
                                                        !(community.admins || []).some((a: any) => a._id === m._id)
                                                    )
                                                    .map((member: any) => (
                                                        <Link
                                                            key={member._id}
                                                            to={`/profile/${member.username}`}
                                                            onClick={() => setShowMembersModal(false)}
                                                            className="flex items-center gap-3 p-2 rounded-md hover:bg-white/5 transition-colors"
                                                        >
                                                            <img
                                                                src={member.avatar || '/default-avatar.jpg'}
                                                                alt={member.username}
                                                                className="w-10 h-10 rounded-full object-cover"
                                                            />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium truncate" style={{ color: 'var(--synapse-text)' }}>
                                                                    {member.username}
                                                                </p>
                                                            </div>
                                                        </Link>
                                                    ))}
                                            </div>
                                        )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Post Card Component
interface PostCardProps {
    post: CommunityPost;
    isAdmin: boolean;
    currentUserId?: string;
    onLike: (postId: string) => void;
    onDelete: (postId: string) => void;
    onDeleteComment: (commentId: string) => void;
    expanded: boolean;
    onToggleComments: () => void;
    comments: Comment[];
    loadingComments: boolean;
    commentInput: string;
    onCommentInputChange: (value: string) => void;
    onSubmitComment: () => void;
    submittingComment: boolean;
}

function PostCard({
    post,
    isAdmin,
    currentUserId,
    onLike,
    onDelete,
    onDeleteComment,
    expanded,
    onToggleComments,
    comments,
    loadingComments,
    commentInput,
    onCommentInputChange,
    onSubmitComment,
    submittingComment
}: PostCardProps) {
    const isOwner = currentUserId === post.user._id;
    const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

    const canDeleteComment = (comment: Comment) => {
        if (!currentUserId) return false;
        // Owner of comment, post creator, or admin can delete
        return comment.user._id === currentUserId || post.user._id === currentUserId || isAdmin;
    };

    const handleDeleteCommentClick = async (commentId: string) => {
        setDeletingCommentId(commentId);
        await onDeleteComment(commentId);
        setDeletingCommentId(null);
    };

    return (
        <div
            className="rounded-md overflow-hidden"
            style={{
                background: 'var(--synapse-surface)',
                border: '1px solid var(--synapse-border)'
            }}
        >
            {/* Post Header */}
            <div className="p-4">
                <div className="flex items-start justify-between">
                    <Link to={`/profile/${post.user.username}`} className="flex items-center gap-3">
                        <img
                            src={post.user.avatar || '/default-avatar.jpg'}
                            alt={post.user.username}
                            className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                            <p className="font-medium" style={{ color: 'var(--synapse-text)' }}>
                                {post.user.username}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--synapse-text-secondary)' }}>
                                {formatTimeAgo(post.createdAt)}
                            </p>
                        </div>
                    </Link>

                    {(isOwner || isAdmin) && (
                        <button
                            onClick={() => onDelete(post._id)}
                            className="p-2 rounded-md hover:bg-red-500/10 text-red-400 transition-colors"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Caption */}
                {post.caption && (
                    <p className="mt-3" style={{ color: 'var(--synapse-text)' }}>
                        {post.caption}
                    </p>
                )}
            </div>

            {/* Media */}
            {post.mediaUrl && (
                <div className="relative">
                    {post.mediaType === 'video' ? (
                        <video
                            src={post.mediaUrl}
                            controls
                            className="w-full max-h-96 object-contain bg-black"
                        />
                    ) : (
                        <img
                            src={post.mediaUrl}
                            alt=""
                            className="w-full max-h-96 object-contain bg-black"
                        />
                    )}
                    {post.mediaType === 'image' && (
                        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-xs bg-black/60 text-white">
                            JPG
                        </div>
                    )}
                </div>
            )}

            {/* Engagement */}
            <div className="p-4 pt-2">
                {/* Like and Comment buttons */}
                <div className="flex items-center gap-4 mb-3">
                    <button
                        onClick={() => onLike(post._id)}
                        className="flex items-center gap-1.5 transition-colors"
                        style={{ color: post.isLiked ? '#ef4444' : 'var(--synapse-text-secondary)' }}
                    >
                        <Heart className={`w-5 h-5 ${post.isLiked ? 'fill-red-500' : ''}`} />
                        <span className="text-sm">{post.likesCount}</span>
                    </button>
                    <button
                        onClick={onToggleComments}
                        className="flex items-center gap-1.5 transition-colors"
                        style={{ color: 'var(--synapse-text-secondary)' }}
                    >
                        <MessageSquare className="w-5 h-5" />
                        <span className="text-sm">{post.commentsCount}</span>
                    </button>
                </div>

                <p className="text-xs mb-3" style={{ color: 'var(--synapse-text-secondary)' }}>
                    {formatTimeAgo(post.createdAt)}
                </p>

                {/* Comment Input */}
                <div className="flex items-center gap-3 pt-3" style={{ borderTop: '1px solid var(--synapse-border)' }}>
                    <img
                        src={currentUserId ? '/default-avatar.jpg' : '/default-avatar.jpg'}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover"
                    />
                    <div
                        className="flex-1 flex items-center rounded-md px-4 py-2"
                        style={{ background: 'var(--synapse-bg)' }}
                    >
                        <input
                            type="text"
                            value={commentInput}
                            onChange={(e) => onCommentInputChange(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && onSubmitComment()}
                            placeholder="Write a comment..."
                            className="flex-1 bg-transparent outline-none text-sm"
                            style={{ color: 'var(--synapse-text)' }}
                        />
                        <button
                            onClick={onSubmitComment}
                            disabled={submittingComment || !commentInput.trim()}
                            className="ml-2 disabled:opacity-50"
                            style={{ color: 'var(--synapse-primary)' }}
                        >
                            {submittingComment ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Toggle Comments */}
                {post.commentsCount > 0 && (
                    <button
                        onClick={onToggleComments}
                        className="flex items-center gap-1 mt-3 text-sm"
                        style={{ color: 'var(--synapse-text-secondary)' }}
                    >
                        {expanded ? (
                            <>
                                <ChevronUp className="w-4 h-4" />
                                Hide comments
                            </>
                        ) : (
                            <>
                                <ChevronDown className="w-4 h-4" />
                                View all {post.commentsCount} comments
                            </>
                        )}
                    </button>
                )}

                {/* Expanded Comments - Below input */}
                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden mt-3"
                        >
                            <div className="max-h-80 overflow-y-auto">
                                {loadingComments ? (
                                    <div className="flex justify-center py-4">
                                        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--synapse-primary)' }} />
                                    </div>
                                ) : comments.length > 0 ? (
                                    <div>
                                        {comments.map((comment, index) => (
                                            <div
                                                key={comment._id}
                                                className="py-3"
                                                style={{
                                                    borderTop: index === 0 ? '1px solid var(--synapse-border)' : 'none',
                                                    borderBottom: '1px solid var(--synapse-border)'
                                                }}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <Link to={`/profile/${comment.user.username}`}>
                                                        <img
                                                            src={comment.user.avatar || '/default-avatar.jpg'}
                                                            alt=""
                                                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                                        />
                                                    </Link>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="flex items-center gap-2">
                                                                <Link
                                                                    to={`/profile/${comment.user.username}`}
                                                                    className="text-sm font-medium hover:underline"
                                                                    style={{ color: 'var(--synapse-text)' }}
                                                                >
                                                                    {comment.user.username}
                                                                </Link>
                                                                <span className="text-xs" style={{ color: 'var(--synapse-text-secondary)' }}>
                                                                    {formatTimeAgo(comment.createdAt)}
                                                                </span>
                                                            </div>
                                                            {canDeleteComment(comment) && (
                                                                <button
                                                                    onClick={() => handleDeleteCommentClick(comment._id)}
                                                                    disabled={deletingCommentId === comment._id}
                                                                    className="p-1 rounded hover:bg-red-500/10 text-red-400 transition-colors"
                                                                    title="Delete comment"
                                                                >
                                                                    {deletingCommentId === comment._id ? (
                                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                    ) : (
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    )}
                                                                </button>
                                                            )}
                                                        </div>
                                                        <p className="text-sm mt-1 break-words" style={{ color: 'var(--synapse-text-secondary)' }}>
                                                            {comment.content}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-center py-4" style={{ color: 'var(--synapse-text-secondary)' }}>
                                        No comments yet. Be the first to comment!
                                    </p>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
