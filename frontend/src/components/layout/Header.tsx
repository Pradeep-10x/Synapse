import { useState, useEffect } from 'react';
import { PlusSquare, Bell } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import CreateModal from '../feed/CreateModal';
import { useNotificationStore } from '@/store/notificationStore';
import { api } from '@/lib/axios';

export default function Header() {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const { unreadCount, fetchUnreadCount, resetCount } = useNotificationStore();
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        // Fetch initial count
        fetchUnreadCount();
        
        // Refresh count every 30 seconds
        const interval = setInterval(fetchUnreadCount, 30000);
        
        return () => clearInterval(interval);
    }, [fetchUnreadCount, location.pathname]);

    const handleNotificationClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        
        // Mark all notifications as read
        try {
            if (unreadCount > 0) {
                await api.put('/notification/read');
                resetCount(); // Reset unread count immediately
            }
        } catch (error) {
            console.error('Failed to mark notifications as read', error);
        }
        
        // Navigate to notifications page
        navigate('/notifications');
    };

    return (
        <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 z-[60] flex items-center justify-between px-4 md:px-8 shadow-sm">
            {/* Left: Create Post */}
            <div className="flex-1 flex items-center">
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="p-2.5 rounded-xl hover:bg-gray-100/80 transition-all active:scale-95 group"
                    title="Create Post"
                >
                    <PlusSquare size={24} className="text-gray-700 group-hover:text-black transition-colors" />
                </button>
            </div>

            {/* Center: Website Logo */}
            <Link to="/" className="flex-shrink-0 flex items-center justify-center">
                <img
                    src="/src/assets/logo.png"
                    alt="ORBIT"
                    className="h-16 w-auto "
                />
            </Link>

            {/* Right: Notifications */}
            <div className="flex-1 flex items-center justify-end">
                <button
                    onClick={handleNotificationClick}
                    className="p-2.5 rounded-xl hover:bg-gray-100/80 transition-all active:scale-95 group relative"
                    title="Notifications"
                >
                    <Bell size={24} className="text-gray-700 group-hover:text-black transition-colors" />
                    {/* Dynamic badge for unread notifications */}
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </button>
            </div>

            <CreateModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />
        </header>
    );
}
