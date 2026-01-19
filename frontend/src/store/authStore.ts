import { create } from 'zustand';
import { api } from '@/lib/axios';
import { toast } from 'react-hot-toast';

export interface User {
    _id: string;
    username: string;
    email: string;
    fullName: string;
    bio?: string;
    avatar?: string;
    followersCount: number;
    followingCount: number;
    isVerified: boolean;
    VerificationBadge?: "Gold" | "Silver" | null;
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isCheckingAuth: boolean;
    login: (credentials: any) => Promise<void>;
    register: (data: any) => Promise<void>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set: any) => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    isCheckingAuth: true,

    login: async (credentials) => {
        try {
            set({ isLoading: true });
            const { data } = await api.post('/user/login', credentials);
            set({ user: data.data, isAuthenticated: true, isLoading: false });
            toast.success('Logged in successfully');
        } catch (error: any) {
            set({ isLoading: false });
            toast.error(error.response?.data?.message || 'Login failed');
            throw error;
        }
    },

    register: async (credentials) => {
        try {
            set({ isLoading: true });
            const { data } = await api.post('/user/register', credentials);
            set({ user: data.data, isAuthenticated: true, isLoading: false });
            toast.success('Registration successful');
        } catch (error: any) {
            set({ isLoading: false });
            toast.error(error.response?.data?.message || 'Registration failed');
            throw error;
        }
    },

    logout: async () => {
        try {
            await api.post('/user/logout');
            toast.success('Logged out');
        } catch (error) {
            console.error('Logout failed', error);
        } finally {
            set({ user: null, isAuthenticated: false });
        }
    },

    checkAuth: async () => {
        try {
            set({ isCheckingAuth: true });
            const { data } = await api.get('/user/me');
            set({ user: data.data, isAuthenticated: true, isCheckingAuth: false });
        } catch (error) {
            // Functional failure to get user means not logged in
            set({ user: null, isAuthenticated: false, isCheckingAuth: false });
        }
    },
}));
