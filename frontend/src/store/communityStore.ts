import { create } from 'zustand';

interface CommunityStore {
    refreshSidebar: number;
    triggerRefresh: () => void;
}

export const useCommunityStore = create<CommunityStore>((set) => ({
    refreshSidebar: 0,
    triggerRefresh: () => set((state) => ({ refreshSidebar: state.refreshSidebar + 1 })),
}));
