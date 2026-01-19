import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, MessageSquare, Search, Film, Settings, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/components/ui/Button';
import { useEffect, useState } from 'react';
import { api } from '@/lib/axios';

export default function Sidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const pathname = location.pathname;
    const { user, logout } = useAuthStore();
    const [unreadMessages, setUnreadMessages] = useState(0);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    useEffect(() => {
        const fetchUnreadCounts = async () => {
            try {
                const { data: conversations } = await api.get('/message/conversations');
                const totalUnreadMsg = conversations.data?.reduce((sum: number, conv: any) => sum + (conv.unreadCount || 0), 0) || 0;
                setUnreadMessages(totalUnreadMsg);
            } catch (error) {
                console.error('Failed to fetch unread counts');
            }
        };
        fetchUnreadCounts();
    }, []);

    const navItems = [
        { icon: Home, label: 'Home', href: '/', badge: null },
        { icon: Search, label: 'Search', href: '/search', badge: null },
        { icon: MessageSquare, label: 'Messages', href: '/messages', badge: unreadMessages > 0 ? unreadMessages : null },
        { icon: Film, label: 'Reels', href: '/reels', badge: null },
        { icon: Settings, label: 'Settings', href: '/settings', badge: null },
    ];

    return (
        <div className="hidden md:flex flex-col w-72 h-[calc(100vh-64px)] fixed left-0 top-16 bg-white z-50 border-r border-gray-200">
            {/* Navigation Menu */}
            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            to={item.href}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-full transition-all duration-200 relative group",
                                isActive
                                    ? "bg-black text-white font-semibold shadow-md"
                                    : "text-gray-700 hover:bg-gray-100"
                            )}
                        >
                            <Icon
                                size={20}
                                className={cn(
                                    "transition-transform group-hover:scale-110",
                                    isActive ? "text-white" : "text-gray-600"
                                )}
                                strokeWidth={isActive ? 2.5 : 2}
                            />
                            <span className="text-sm">{item.label}</span>
                            {item.badge && (
                                <span className="ml-auto w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                                    {item.badge}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Profile Section */}
            <div className="p-4 border-t border-gray-100 flex items-center gap-2">
                <Link
                    to={`/profile/${user?.username}`}
                    className={cn(
                        "flex flex-1 items-center gap-3 px-4 py-3 rounded-full transition-all duration-200 hover:bg-gray-100 group",
                        pathname.startsWith('/profile') ? "bg-gray-50 font-semibold" : ""
                    )}
                >
                    <div className="relative w-8 h-8 rounded-full overflow-hidden border border-gray-200 flex-shrink-0">
                        <img
                            src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.username || 'User'}&size=32`}
                            alt={user?.username}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                            {user?.fullName || user?.username || 'User'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">@{user?.username || 'username'}</p>
                    </div>
                </Link>
                <button
                    onClick={handleLogout}
                    className="p-3 rounded-full hover:bg-red-50 text-red-500 transition-colors"
                    title="Logout"
                >
                    <LogOut size={20} strokeWidth={2.5} />
                </button>
            </div>
        </div>
    );
}
