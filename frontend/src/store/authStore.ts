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
    isAuthChecked: boolean;
    login: (credentials: { username?: string; email?: string; password: string }) => Promise<void>;
    register: (data: { username: string; email: string; password: string; fullName?: string }) => Promise<void>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
}

// Track if checkAuth is currently running to prevent duplicate calls
let isCheckingAuthInProgress = false;

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    isCheckingAuth: false,
    isAuthChecked: false,

    login: async (credentials) => {
        try {
            set({ isLoading: true });
            const { data } = await api.post('/user/login', credentials);
            // Backend returns user directly in data.data (not data.data.user)
            const userData = data.data;
            // Token is set via httpOnly cookie, but we can store a flag
            localStorage.setItem('token', 'authenticated');
            set({ user: userData, isAuthenticated: true, isLoading: false, isAuthChecked: true });
            toast.success('Logged in successfully');
        } catch (error: any) {
            set({ isLoading: false });
            const errorMessage = error.response?.data?.message || 'Login failed';
            toast.error(errorMessage);
            throw new Error(errorMessage);
        }
    },

    register: async (formData) => {
        try {
            set({ isLoading: true });
            await api.post('/user/register', formData);
            set({ isLoading: false });
            toast.success('Registration successful! Please login.');
            // Don't set authenticated - user needs to login after registration
        } catch (error: any) {
            set({ isLoading: false });
            const errorMessage = error.response?.data?.message || 'Registration failed';
            toast.error(errorMessage);
            throw new Error(errorMessage);
        }
    },

    logout: async () => {
        try {
            await api.post('/user/logout');
            localStorage.removeItem('token');
            toast.success('Logged out');
        } catch (error) {
            console.error('Logout failed', error);
            localStorage.removeItem('token');
        } finally {
            set({ user: null, isAuthenticated: false, isAuthChecked: true });
        }
    },

    checkAuth: async () => {
        // Prevent duplicate simultaneous calls
        if (isCheckingAuthInProgress) {
            return;
        }

        // Check if there's a token first - if not, skip the API call
        const token = localStorage.getItem('token');
        if (!token) {
            set({ user: null, isAuthenticated: false, isCheckingAuth: false, isAuthChecked: true });
            return;
        }

        try {
            isCheckingAuthInProgress = true;
            set({ isCheckingAuth: true });
            
            // Add timeout to prevent infinite loading
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const { data } = await api.get('/user/me', { signal: controller.signal });
            clearTimeout(timeoutId);
            
            set({ user: data.data, isAuthenticated: true, isCheckingAuth: false, isAuthChecked: true });
        } catch (error: any) {
            console.error('Auth check failed:', error?.message || error);
            localStorage.removeItem('token');
            set({ user: null, isAuthenticated: false, isCheckingAuth: false, isAuthChecked: true });
        } finally {
            isCheckingAuthInProgress = false;
        }
    },
}));

