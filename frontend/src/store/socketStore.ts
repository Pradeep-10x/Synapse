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

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: Set<string>;
  notifications: Notification[];
  unreadCount: number;
  
  // Actions
  connect: (userId: string) => void;
  disconnect: () => void;
  addNotification: (notification: Notification) => void;
  setNotifications: (notifications: Notification[]) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

const getSocketUrl = () => {
  const baseURL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000';
  return baseURL.replace('/api/v1', '');
};

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  onlineUsers: new Set(),
  notifications: [],
  unreadCount: 0,

  connect: (userId: string) => {
    const { socket: existingSocket } = get();
    
    // Don't create duplicate connections
    if (existingSocket?.connected) {
      return;
    }

    const socketUrl = getSocketUrl();
    const socket = io(socketUrl, {
      query: { userId },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      set({ isConnected: true });
      
      // Register user as online
      socket.emit('user:online', userId);
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

    // Handle user online/offline status
    socket.on('user:status', (data: { userId: string; status: 'online' | 'offline' }) => {
      const { onlineUsers } = get();
      const newOnlineUsers = new Set(onlineUsers);
      
      if (data.status === 'online') {
        newOnlineUsers.add(data.userId);
      } else {
        newOnlineUsers.delete(data.userId);
      }
      
      set({ onlineUsers: newOnlineUsers });
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
}));
