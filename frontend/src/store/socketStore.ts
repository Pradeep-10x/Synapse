import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

export interface Notification {
  _id: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'post' | 'reel' | 'story';
  fromUser: {
    _id: string;
    username: string;
    avatar?: string;
  };
  post?: string;
  reel?: string;
  story?: string;
  message?: string;
  isRead: boolean;
  createdAt: string;
}

export interface RecentlyActiveUser {
  _id: string;
  username: string;
  avatar?: string;
  lastActive?: string;
}

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: Map<string, { username: string; avatar?: string }>;
  notifications: Notification[];
  unreadCount: number;
  unreadMessagesCount: number;
  recentlyActive: Map<string, RecentlyActiveUser>;
  communityActiveCounts: Map<string, number>;
  communityEventsCounts: Map<string, number>;

  // Actions
  connect: (user: { _id: string; username: string; avatar?: string }) => void;
  disconnect: () => void;
  addNotification: (notification: Notification) => void;
  setNotifications: (notifications: Notification[]) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  clearMessagesCount: () => void;
  setRecentlyActive: (users: RecentlyActiveUser[]) => void;
  requestCommunityActiveCounts: (communityIds: string[]) => void;
  joinCommunityRoom: (communityId: string) => void;
  leaveCommunityRoom: (communityId: string) => void;
}

const getSocketUrl = () => {
  const baseURL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000';
  return baseURL.replace('/api/v1', '');
};

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  onlineUsers: new Map(),
  notifications: [],
  unreadCount: 0,
  unreadMessagesCount: 0,
  recentlyActive: new Map(),
  communityActiveCounts: new Map(),
  communityEventsCounts: new Map(),

  connect: (user) => {
    const { socket: existingSocket } = get();

    // Don't create duplicate connections
    if (existingSocket?.connected) {
      return;
    }

    const socketUrl = getSocketUrl();
    const socket = io(socketUrl, {
      query: {
        userId: user._id,
        username: user.username,
        avatar: user.avatar
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      set({ isConnected: true });

      // Register user as online
      socket.emit('user:online', {
        userId: user._id,
        username: user.username,
        avatar: user.avatar
      });
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      set({ isConnected: false });
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      set({ isConnected: false });
    });

    // Handle real-time notifications
    socket.on('notification:new', (notification: Notification) => {
      console.log('New notification received:', notification);
      const { notifications } = get();
      set({
        notifications: [notification, ...notifications],
        unreadCount: get().unreadCount + 1
      });
    });

    // Handle real-time messages
    socket.on('message:new', () => {
      // Only increment if not on messages page or not in that conversation (advanced: checking active route is hard in store)
      // For now, always increment, clearing is handled by View.
      // Filter out own messages? Logic usually handled by component, but for badge, self-message shouldn't increment?
      // Backend usually emits to receiver only. So valid.
      set({ unreadMessagesCount: get().unreadMessagesCount + 1 });
    });

    // Handle initial list of online users
    socket.on('online:users', (users: Array<{ userId: string; username: string; avatar?: string }>) => {
      const onlineMap = new Map();
      users.forEach(u => {
        onlineMap.set(u.userId, { username: u.username, avatar: u.avatar });
      });
      set({ onlineUsers: onlineMap });
    });

    // Handle user online/offline status
    socket.on('user:status', (data: { userId: string; status: 'online' | 'offline'; username?: string; avatar?: string; lastActive?: string }) => {
      const { onlineUsers } = get();
      const newOnlineUsers = new Map(onlineUsers);

      if (data.status === 'online') {
        newOnlineUsers.set(data.userId, {
          username: data.username || 'User',
          avatar: data.avatar
        });
      } else {
        newOnlineUsers.delete(data.userId);

        // Add to recently active if we have info (passed from backend on disconnect)
        if (data.username || data.lastActive) {
          const { recentlyActive } = get();
          const newRecentlyActive = new Map(recentlyActive);
          newRecentlyActive.set(data.userId, {
            _id: data.userId,
            username: data.username || 'User',
            avatar: data.avatar,
            lastActive: data.lastActive || new Date().toISOString()
          });
          set({ recentlyActive: newRecentlyActive });
        }
      }

      set({ onlineUsers: newOnlineUsers });
    });

    // Handle community active count updates
    socket.on('community:activeCount', (data: { communityId: string; activeCount: number }) => {
      const { communityActiveCounts } = get();
      const newCounts = new Map(communityActiveCounts);
      newCounts.set(data.communityId, data.activeCount);
      set({ communityActiveCounts: newCounts });
    });

    // Handle bulk active counts response
    socket.on('community:activeCounts', (counts: Record<string, number>) => {
      const { communityActiveCounts } = get();
      const newCounts = new Map(communityActiveCounts);
      Object.entries(counts).forEach(([id, count]) => {
        newCounts.set(id, count);
      });
      set({ communityActiveCounts: newCounts });
    });

    // Handle community events count updates
    socket.on('community:eventsCount', (data: { communityId: string; eventsCount: number }) => {
      const { communityEventsCounts } = get();
      const newCounts = new Map(communityEventsCounts);
      newCounts.set(data.communityId, data.eventsCount);
      set({ communityEventsCounts: newCounts });
    });

    // Handle bulk events counts response
    socket.on('community:eventsCounts', (counts: Record<string, number>) => {
      const { communityEventsCounts } = get();
      const newCounts = new Map(communityEventsCounts);
      Object.entries(counts).forEach(([id, count]) => {
        newCounts.set(id, count);
      });
      set({ communityEventsCounts: newCounts });
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },

  addNotification: (notification: Notification) => {
    const { notifications } = get();
    set({
      notifications: [notification, ...notifications],
      unreadCount: get().unreadCount + 1
    });
  },

  setNotifications: (notifications: Notification[]) => {
    const unreadCount = notifications.filter(n => !n.isRead).length;
    set({ notifications, unreadCount });
  },

  markAllAsRead: () => {
    const { notifications } = get();
    set({
      notifications: notifications.map(n => ({ ...n, isRead: true })),
      unreadCount: 0
    });
  },

  clearNotifications: () => {
    set({ notifications: [], unreadCount: 0 });
  },

  clearMessagesCount: () => {
    set({ unreadMessagesCount: 0 });
  },

  setRecentlyActive: (users: RecentlyActiveUser[]) => {
    const recentlyActiveMap = new Map<string, RecentlyActiveUser>();
    users.forEach(user => {
      recentlyActiveMap.set(user._id, user);
    });
    set({ recentlyActive: recentlyActiveMap });
  },

  requestCommunityActiveCounts: (communityIds: string[]) => {
    const { socket } = get();
    if (socket?.connected && communityIds.length > 0) {
      socket.emit('community:getActiveCounts', { communityIds });
    }
  },

  joinCommunityRoom: (communityId: string) => {
    const { socket } = get();
    if (socket?.connected) {
      socket.emit('community:join', { communityId });
    }
  },

  leaveCommunityRoom: (communityId: string) => {
    const { socket } = get();
    if (socket?.connected) {
      socket.emit('community:leave', { communityId });
    }
  },
}));
