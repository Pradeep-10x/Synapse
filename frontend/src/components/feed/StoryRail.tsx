import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/axios';
import { cn } from '@/components/ui/Button';

import CreateModal from './CreateModal';
import StoryViewer from './StoryViewer';

export default function StoryRail() {
    const { user } = useAuthStore();
    const [stories, setStories] = useState<any[]>([]);
    const [myStories, setMyStories] = useState<any[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [viewingStories, setViewingStories] = useState<any[] | null>(null);
    const [initialStoryIndex, setInitialStoryIndex] = useState(0);
    const [seenStoriesIds, setSeenStoriesIds] = useState<Set<string>>(() => {
        const saved = localStorage.getItem('seen_stories');
        return new Set(saved ? JSON.parse(saved) : []);
    });

    // ... (fetchStories effect remains)
    useEffect(() => {
        const fetchStories = async () => {
            try {
                // Fetch my stories
                if (user?._id) {
                    try {
                        const { data: myData } = await api.get(`/story/user/${user._id}`);
                        if (myData.data?.stories) {
                            setMyStories(myData.data.stories);
                        }
                    } catch (e) {
                        console.error("Failed to fetch my stories");
                    }
                }

                // Fetch others' stories
                const { data: feedData } = await api.get('/story/feed');

                if (feedData.data?.length === 0) {
                    // Use dummy data if no users found
                    setStories([
                        { id: 'd1', username: 'sarah_j', avatar: 'https://i.pravatar.cc/150?u=sarah', isSeen: false, stories: [] },
                        { id: 'd2', username: 'mike_ross', avatar: 'https://i.pravatar.cc/150?u=mike', isSeen: false, stories: [] },
                        { id: 'd3', username: 'elena_v', avatar: 'https://i.pravatar.cc/150?u=elena', isSeen: true, stories: [] },
                        { id: 'd4', username: 'chris_p', avatar: 'https://i.pravatar.cc/150?u=chris', isSeen: false, stories: [] },
                        { id: 'd5', username: 'anna_k', avatar: 'https://i.pravatar.cc/150?u=anna', isSeen: true, stories: [] },
                    ]);
                    return;
                }

                // Map the feed data to the frontend structure
                const mappedStories = feedData.data.map((userStory: any) => {
                    // Check if *any* of the user's stories are unseen according to local storage
                    // If all stories in this group are in seenStoriesIds, then the group is seen.
                    // Actually, usually if *any* new story exists, the ring is red.
                    // Let's assume if at least one story is NOT in our set, it's unseen.
                    const isSeen = userStory.stories.every((s: any) => seenStoriesIds.has(s._id));

                    return {
                        id: userStory._id,
                        user: userStory.user,
                        avatar: userStory.avatar,
                        username: userStory.username || 'User',
                        isSeen: isSeen,
                        stories: userStory.stories
                    };
                });

                setStories(mappedStories);

            } catch (error) {
                console.error("Failed to fetch stories", error);
                setStories([
                    { id: 'd1', username: 'sarah_j', avatar: 'https://i.pravatar.cc/150?u=sarah', isSeen: false, stories: [] },
                    { id: 'd2', username: 'mike_ross', avatar: 'https://i.pravatar.cc/150?u=mike', isSeen: false, stories: [] },
                ]);
            }
        };

        fetchStories();
    }, [user?._id]);

    const handleViewStory = (storyData: any) => {
        if (storyData.stories && storyData.stories.length > 0) {
            setViewingStories(storyData.stories);
            setInitialStoryIndex(0);
        } else if (storyData.length > 0) {
            // Handle case where we pass raw array (like myStories)
            setViewingStories(storyData);
            setInitialStoryIndex(0);
        }
    };

    const handleStorySeen = (storyId: string) => {
        if (!seenStoriesIds.has(storyId)) {
            const newSet = new Set(seenStoriesIds).add(storyId);
            setSeenStoriesIds(newSet);
            localStorage.setItem('seen_stories', JSON.stringify([...newSet]));

            // Update local state to reflect change
            setStories(prevStories => prevStories.map(s => {
                const isGroupFullySeen = s.stories.every((st: any) => newSet.has(st._id));
                return { ...s, isSeen: isGroupFullySeen };
            }));
        }
    };

    return (
        <div className="w-full relative py-4 mb-4">
            <div className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-2 px-1">
                {/* Your Story */}
                {/* Your Story */}
                <div className="flex flex-col items-center gap-1.5 flex-shrink-0 group relative">
                    <div className="relative p-[3px]">
                        <div
                            onClick={() => myStories.length > 0 ? handleViewStory(myStories) : setIsCreateModalOpen(true)}
                            className={cn(
                                "w-16 h-16 md:w-18 md:h-18 rounded-full overflow-hidden border-2 border-white ring-2 transition-all shadow-sm cursor-pointer",
                                myStories.length > 0
                                    ? "ring-blue-500 hover:scale-105"
                                    : "ring-gray-100 group-hover:ring-gray-300"
                            )}
                        >
                            <img
                                src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.username || 'Me'}`}
                                alt="Your Story"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsCreateModalOpen(true);
                            }}
                            className="absolute bottom-1 right-1 w-5 h-5 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center text-white border-2 border-white shadow-md z-10 transition-colors"
                        >
                            <Plus size={12} strokeWidth={4} />
                        </button>
                    </div>
                    <span className="text-[11px] font-medium text-gray-500 group-hover:text-black transition-colors">Your story</span>
                </div>

                {/* Other Stories */}
                {stories.map(story => (
                    <div
                        key={story.id}
                        onClick={() => handleViewStory(story)}
                        className="flex flex-col items-center gap-1.5 cursor-pointer flex-shrink-0 group"
                    >
                        <div className={cn(
                            "w-[70px] h-[70px] md:w-[78px] md:h-[78px] rounded-full p-[3px] transition-all duration-300 group-hover:scale-105 shadow-sm",
                            story.isSeen
                                ? 'border-2 border-gray-200 bg-transparent p-[2px]'
                                : 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600'
                        )}>
                            <div className="w-full h-full rounded-full border-2 border-white overflow-hidden bg-white">
                                <img src={story.avatar || `https://ui-avatars.com/api/?name=${story.username}`} alt={story.username} className="w-full h-full object-cover" />
                            </div>
                        </div>
                        <span className="text-[11px] font-medium truncate w-[70px] md:w-[78px] text-center text-gray-600 group-hover:text-black transition-colors">{story.username}</span>
                    </div>
                ))}
            </div>

            <CreateModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />

            {viewingStories && (
                <StoryViewer
                    stories={viewingStories}
                    initialStoryIndex={initialStoryIndex}
                    onClose={() => setViewingStories(null)}
                    onStorySeen={handleStorySeen}
                />
            )}
        </div>
    );
}

