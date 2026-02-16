
import { Sidebar } from './Sidebar';
import { Outlet, useNavigate } from 'react-router-dom';
import { Bell, User, Settings, LogOut, ChevronDown, Send } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useSocketStore } from '@/store/socketStore';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface DashboardLayoutProps {
    children?: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();
    const { isMobile, isTablet, isMidrange } = useMediaQuery();
    
    const { unreadCount, unreadMessagesCount } = useSocketStore();

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const handleCloseDrawer = useCallback(() => setIsDrawerOpen(false), []);

    // Compute main margin based on breakpoint
    // mobile: no sidebar (bottom bar), midrange: no sidebar at all, tablet: mini 72px, desktop: 260px
    const mainMargin = isMobile ? 'ml-0' : (isTablet || isMidrange) ? 'ml-[72px]' : 'ml-[260px]';

    // Bottom padding for bottom nav: mobile has bottom sidebar bar, others have side nav
    const bottomPadding = isMobile ? 'mb-16' : 'mb-0';

    return (
        <div className="min-h-screen bg-[var(--synapse-bg)] text-[var(--synapse-text)] flex">
            {/* Sidebar */}
            <Sidebar isDrawerOpen={isDrawerOpen} onClose={handleCloseDrawer} />

            {/* Main Content Area */}
            <main className={`flex-1 ${mainMargin} min-h-screen flex flex-col ${bottomPadding}`}>
                {/* Top Navbar */}
                <header className={`h-16 xl:h-20 flex items-center ${isMobile ? 'justify-between' : 'justify-end'} gap-4 xl:gap-6 px-4 xl:px-10 border-b border-[var(--synapse-border)] bg-[var(--synapse-bg)] sticky top-0 z-40`}>
                    {/* Brand in navbar — only on mobile where there's no sidebar */}
                    {isMobile && (
                        <div className="flex items-center gap-2">
                            <img
                                src="/logo.png"
                                alt="Synapse Logo"
                                className="w-7 shrink-0"
                            />
                        </div>
                    )}

                    <div className="flex items-center gap-4 xl:gap-6">
                        {/* Notification Icon */}
                        <button
                            onClick={() => {
                                navigate('/notifications');
                            }}
                            className="relative p-2 rounded-xl hover:bg-[var(--synapse-surface)] transition-colors group"
                        >
                            <Bell className="w-6 h-6 text-[var(--synapse-text-muted)] group-hover:text-[var(--synapse-text)] transition-colors" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </button>

                        {/* Message Icon — hidden on mobile, bottom bar has Messages */}
                        {!isMobile && (
                            <button
                                onClick={() => navigate('/messages')}
                                className="relative p-2 rounded-xl hover:bg-[var(--synapse-surface)] transition-colors group"
                            >
                                <Send className="w-6 h-6 text-[var(--synapse-text-muted)] group-hover:text-[var(--synapse-text)] transition-colors" />
                                {unreadMessagesCount > 0 && (
                                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[#7c3aed] rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1">
                                        {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                                    </span>
                                )}
                            </button>
                        )}

                        {/* Profile Dropdown */}
                        <div className="relative ml-2" ref={profileRef}>
                            <button
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className="flex items-center gap-2 xl:gap-3 p-1.5 rounded-md hover:bg-[var(--synapse-surface)] transition-colors border border-transparent hover:border-[var(--synapse-border)]"
                            >
                                <div className="w-8 h-8 xl:w-10 xl:h-10 rounded-full overflow-hidden border-2 border-[var(--synapse-border)]">
                                    <img
                                        src={user?.avatar || "/default-avatar.jpg"}
                                        alt="Profile"
                                        className="w-full h-full object-cover scale-125"
                                    />
                                </div>
                                <div className="hidden xl:block text-left mr-1">
                                    <p className="text-lg font-semibold text-[var(--synapse-text)] leading-none tracking-tight">{user?.fullName}</p>
                                </div>
                                <ChevronDown className={`w-4 h-4 text-[var(--synapse-text-muted)] transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Dropdown Menu */}
                            {isProfileOpen && (
                                <div className="absolute right-0 top-full mt-2 w-56 bg-[var(--synapse-surface)] border border-[var(--synapse-border)] rounded-md shadow-xl py-2 z-50">
                                    {/* User Info */}
                                    <div className="px-4 py-3 border-b border-[var(--synapse-border)]">
                                        <p className="text-md font-medium text-[var(--synapse-text)] truncate">{user?.username || 'Guest User'}</p>
                                        <p className="text-sm text-[var(--synapse-text-muted)] truncate">{user?.email || 'guest@example.com'}</p>
                                    </div>

                                    {/* Menu Items */}
                                    <div className="py-1">
                                        <button
                                            onClick={() => { navigate('/personal'); setIsProfileOpen(false); }}
                                            className="w-full flex items-center gap-3 px-4 py-2 text-md text-[var(--synapse-text-muted)] hover:text-[var(--synapse-text)] hover:bg-[var(--synapse-surface-hover)] transition-colors"
                                        >
                                            <User className="w-4 h-4" />
                                            View Profile
                                        </button>
                                        <button
                                            onClick={() => { navigate('/settings'); setIsProfileOpen(false); }}
                                            className="w-full flex items-center gap-3 px-4 py-2 text-md text-[var(--synapse-text-muted)] hover:text-[var(--synapse-text)] hover:bg-[var(--synapse-surface-hover)] transition-colors"
                                        >
                                            <Settings className="w-4 h-4" />
                                            Settings
                                        </button>
                                        
                                    </div>

                                    {/* Logout */}
                                    <div className="border-t border-[var(--synapse-border)] pt-1 mt-1">
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-3 px-4 py-2 text-md text-red-400 hover:text-red-300 hover:bg-[var(--synapse-surface-hover)] transition-colors"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            Log Out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 p-4 xl:p-6 xl:px-30">
                    <div className="max-w-8xl w-full mx-auto">
                        {children || <Outlet />}
                    </div>
                </div>
            </main>

        </div>
    );
}

export default DashboardLayout;
