
import { Sidebar } from './Sidebar';
import { Outlet, useNavigate } from 'react-router-dom';
import { Bell, Mail, User, Settings, LogOut, HelpCircle, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useSocketStore } from '@/store/socketStore';

interface DashboardLayoutProps {
    children?: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();
    // Assuming we will add unreadMessagesCount to store soon, or use unreadNotifs for now? User asked for both.
    // I need to update store first to have `unreadMessagesCount`.
    // For now I will use `unreadNotifs` for notifications. For messages, I'll temporarily use 0 or a placeholder state if not in store yet.
    // Wait, the store I viewed had `unreadCount` which seemed to serve notifications.
    // I'll stick to `unreadNotifs` for the bell.
    // For Mail icon, I will use a local state or `unreadMessages` if I add it to store.
    // Let's assume I will add `unreadMessagesCount` to store in the next step. So I'll destructure it here even if it errors TS momentarily (I will fix store immediately).
    // actually, let's just use 0 for now and fix store, then update this file.
    // Or better, I update the store FIRST.
    // But I'm already in this tool call.
    // Okay, I will reference `unreadMessagesCount` and trust I update the store in the next step.
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

    return (
        <div className="min-h-screen bg-[var(--synapse-bg)] text-[var(--synapse-text)] flex">
            {/* Left Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <main className="flex-1 ml-[260px] min-h-screen flex flex-col">
                {/* Top Navbar */}
                <header className="h-20 flex items-center justify-end gap-6 px-10 border-b border-[var(--synapse-border)] bg-[var(--synapse-bg)] sticky top-0 z-40">
                    {/* Notification Icon */}
                    <button
                        onClick={() => {
                            navigate('/notifications');
                            // markAllAsRead(); // Logic handled in Notifications page usually, or clear badge here?
                            // User said "once opened market them as seen and removee dot and numbers"
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

                    {/* Message Icon */}
                    <button
                        onClick={() => navigate('/messages')}
                        className="relative p-2 rounded-xl hover:bg-[var(--synapse-surface)] transition-colors group"
                    >
                        <Mail className="w-6 h-6 text-[var(--synapse-text-muted)] group-hover:text-[var(--synapse-text)] transition-colors" />
                        {unreadMessagesCount > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[#7c3aed] rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1">
                                {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                            </span>
                        )}
                    </button>

                    {/* Profile Dropdown */}
                    <div className="relative ml-2" ref={profileRef}>
                        <button
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            className="flex items-center gap-3 p-1.5 rounded-md hover:bg-[var(--synapse-surface)] transition-colors border border-transparent hover:border-[var(--synapse-border)]"
                        >
                            <img
                                src={user?.avatar || "/default-avatar.jpg"}
                                alt="Profile"
                                className="w-10 h-10 rounded-full object-cover border-2 border-[var(--synapse-border)]"
                            />
                            <div className="hidden md:block text-left mr-1">
                                <p className="text-lg font-semibold text-[var(--synapse-text)] leading-none tracking-tight">{user?.username}</p>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-[var(--synapse-text-muted)] transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {isProfileOpen && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-[var(--synapse-surface)] border border-[var(--synapse-border)] rounded-md shadow-xl py-2 z-50">
                                {/* User Info */}
                                <div className="px-4 py-3 border-b border-[var(--synapse-border)]">
                                    <p className="text-md font-medium text-[var(--synapse-text)] truncate">{user?.fullName || user?.username || 'Guest User'}</p>
                                    <p className="text-sm text-[var(--synapse-text-muted)] truncate">{user?.email || 'guest@example.com'}</p>
                                </div>

                                {/* Menu Items */}
                                <div className="py-1">
                                    <button
                                        onClick={() => { navigate('/profile'); setIsProfileOpen(false); }}
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
                                    <button
                                        className="w-full flex items-center gap-3 px-4 py-2 text-md text-[var(--synapse-text-muted)] hover:text-[var(--synapse-text)] hover:bg-[var(--synapse-surface-hover)] transition-colors"
                                    >
                                        <HelpCircle className="w-4 h-4" />
                                        Help & Support
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
                </header>

                {/* Page Content */}
                <div className="flex-1 p-6 px-30">
                    <div className="max-w-8xl w-full">
                        {children || <Outlet />}
                    </div>
                </div>
            </main>
        </div>
    );
}

export default DashboardLayout;
