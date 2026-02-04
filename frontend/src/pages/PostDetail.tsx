import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { postAPI } from '@/lib/api';
import PostCard from '@/components/feed/PostCard';
import AuthorSidebar from '@/components/feed/AuthorSidebar';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function PostDetail() {
    const { postId } = useParams<{ postId: string }>();
    const navigate = useNavigate();
    const [post, setPost] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPost = async () => {
            try {
                if (!postId) return;
                setLoading(true);
                const response = await postAPI.getSinglePost(postId);
                setPost(response.data.data);
            } catch (error) {
                console.error('Failed to fetch post:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPost();
    }, [postId]);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--synapse-text-muted)]" />
            </div>
        );
    }

    if (!post) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-[var(--synapse-text-muted)]">
                <p>Post not found</p>
                <button
                    onClick={() => navigate(-1)}
                    className="mt-4 text-[var(--synapse-blue)] hover:underline"
                >
                    Go back
                </button>
            </div>
        );
    }

    return (

        <div className="animate-in fade-in duration-500 max-w-7xl mx-auto py-1">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between border-b border-[var(--synapse-border)] pb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2.5 -ml-2 rounded-[var(--radius-sm)] hover:bg-[var(--synapse-surface)] text-[var(--synapse-text-muted)] hover:text-[var(--synapse-text)] transition-all border border-transparent hover:border-[var(--synapse-border)]"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--synapse-text)] tracking-tight">Post ID: <span className="font-mono text-[var(--synapse-blue)] text-xl font-normal">#{post._id.slice(-6)}</span></h1>

                    </div>
                </div>
            </div>

            {/* Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* Left Column: Post */}
                <div className="lg:col-span-8 ">
                    <PostCard post={post} initialCommentsOpen={false} />
                </div>

                {/* Right Column: Author Sidebar */}
                <div className="hidden lg:block lg:col-span-3 sticky top-24">
                    <AuthorSidebar
                        user={post.user}
                        currentPostId={post._id}
                        createdAt={post.createdAt}
                    />
                </div>
            </div>
        </div>
    );
}
