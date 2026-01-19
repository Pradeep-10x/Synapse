import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import Header from './Header';
import { useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useEffect } from 'react';
import { cn } from '@/components/ui/Button';
import { io, Socket } from 'socket.io-client';

export default function AppShell() {
    const location = useLocation();
    const navigate = useNavigate();
    const pathname = location.pathname;
    const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');
    const { checkAuth, isAuthenticated, isCheckingAuth, user } = useAuthStore();
    const { fetchUnreadCount, incrementCount } = useNotificationStore();

    // Basic protected route logic
    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    // Initialize socket.io for real-time notifications
    useEffect(() => {
        if (!isAuthenticated || !user?._id || isAuthPage) return;

        const socketUrl = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5000';
        const socket: Socket = io(socketUrl, {
            query: { userId: user._id }
        });

        // Emit user online status
        socket.emit('user:online', user._id);

        // Listen for new notifications
        socket.on('notification:new', () => {
            incrementCount(); // Increment unread count
        });

        // Fetch initial unread count
        fetchUnreadCount();

        return () => {
            socket.off('notification:new');
            socket.close();
        };
    }, [isAuthenticated, user?._id, isAuthPage, incrementCount, fetchUnreadCount]);

    useEffect(() => {
        if (!isCheckingAuth && !isAuthenticated && !isAuthPage) {
            navigate('/login');
        }
    }, [isCheckingAuth, isAuthenticated, isAuthPage, navigate]);

    if (isCheckingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-gray-50 to-blue-50">
                <div className="flex flex-col items-center gap-4">
                    <img
                        src="/src/assets/logo.png"
                        alt="Loading..."
                        className="h-20 w-auto object-contain animate-pulse"
                    />
                    <div className="w-12 h-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-black animate-infinite-scroll w-1/2" />
                    </div>
                </div>
            </div>
        );
    }

    if (isAuthPage) {
        return <Outlet />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-gray-50 to-blue-50 flex flex-col relative">
            {/* Background gradient overlay */}
            <div className="fixed inset-0 bg-gradient-to-br from-purple-50/50 via-gray-50/50 to-blue-50/50 pointer-events-none" />

            <Header />

            <div className="flex flex-1 relative">
                <Sidebar />

                <main className={cn(
                    "flex-1 md:ml-72 min-h-screen pt-16 pb-16 md:pb-0 relative z-10",
                    location.pathname === '/reels' || location.pathname === '/messages' || location.pathname === '/media' ? "pb-0" : ""
                )}>
                 
<div className={cn(
    "w-full mx-auto relative",
    location.pathname === '/reels' || location.pathname === '/messages' || location.pathname === '/media'
        ? "h-full"
        : "max-w-8xl pt-2 md:pt-2"  // ← This max-w-8xl is limiting the width
)}>
                        <Outlet />
                    </div>
                </main>
            </div>

            <MobileNav />
        </div>
    );
}
