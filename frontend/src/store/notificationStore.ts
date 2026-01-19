import { create } from 'zustand';
import { api } from '@/lib/axios';

interface NotificationState {
    unreadCount: number;
    isLoading: boolean;
    fetchUnreadCount: () => Promise<void>;
    incrementCount: () => void;
    decrementCount: () => void;
    resetCount: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
    unreadCount: 0,
    isLoading: false,

    fetchUnreadCount: async () => {
        try {
            set({ isLoading: true });
            const { data } = await api.get('/notification');
            const notifications = data.data || [];
            const unread = notifications.filter((n: any) => !n.isRead).length;
            set({ unreadCount: unread, isLoading: false });
        } catch (error) {
            console.error('Failed to fetch unread notifications', error);
            set({ isLoading: false });
        }
    },

    incrementCount: () => {
        set((state) => ({ unreadCount: state.unreadCount + 1 }));
    },

    decrementCount: () => {
        set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) }));
    },

    resetCount: () => {
        set({ unreadCount: 0 });
    },
}));

