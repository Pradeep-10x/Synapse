import { Sidebar } from './Sidebar';
import { Outlet, useNavigate } from 'react-router-dom';
import { Bell, Mail, User, Settings, LogOut, HelpCircle, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface DashboardLayoutProps {
    children?: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

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

    const handleLogout = () => {
        // Add logout logic here
        localStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-[var(--synapse-bg)] text-[var(--synapse-text)] flex">
            {/* Left Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <main className="flex-1 ml-[260px] min-h-screen flex flex-col">
                {/* Top Navbar */}
                <header className="h-20 flex items-center justify-end gap-4 px-15 border-b border-[var(--synapse-border)] bg-[var(--synapse-bg)] sticky top-0 z-40">
                    {/* Notification Icon */}
                    <button className="relative p-3 rounded-lg hover:bg-[var(--synapse-surface)] transition-colors group">
                        <Bell className="w-7 h-7 text-[var(--synapse-text-muted)] group-hover:text-[var(--synapse-text)]" />
                        <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full"></span>
                    </button>

                    {/* Message Icon */}
                    <button className="relative p-3 rounded-lg hover:bg-[var(--synapse-surface)] transition-colors group">
                        <Mail className="w-7 h-7 text-[var(--synapse-text-muted)] group-hover:text-[var(--synapse-text)]" />
                        <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-blue-500 rounded-full"></span>
                    </button>

                    {/* Profile Dropdown */}
                    <div className="relative ml-2" ref={profileRef}>
                        <button 
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            className="flex items-center gap-2 p-1.5 rounded-sm hover:bg-[var(--synapse-surface)] transition-colors"
                        >
                            <img 
                                src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop" 
                                alt="Profile" 
                                className="w-10 h-10 rounded-full object-cover border-2 border-[var(--synapse-border)]" 
                            />
                            <ChevronDown className={`w-5 h-5 text-[var(--synapse-text-muted)] transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {isProfileOpen && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-[var(--synapse-surface)] border border-[var(--synapse-border)] rounded-lg shadow-xl py-2 z-50">
                                {/* User Info */}
                                <div className="px-4 py-3 border-b border-[var(--synapse-border)]">
                                    <p className="text-sm font-medium text-[var(--synapse-text)]">John Doe</p>
                                    <p className="text-xs text-[var(--synapse-text-muted)]">john@example.com</p>
                                </div>

                                {/* Menu Items */}
                                <div className="py-1">
                                    <button 
                                        onClick={() => { navigate('/profile'); setIsProfileOpen(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[var(--synapse-text-muted)] hover:text-[var(--synapse-text)] hover:bg-[var(--synapse-surface-hover)] transition-colors"
                                    >
                                        <User className="w-4 h-4" />
                                        View Profile
                                    </button>
                                    <button 
                                        onClick={() => { navigate('/settings'); setIsProfileOpen(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[var(--synapse-text-muted)] hover:text-[var(--synapse-text)] hover:bg-[var(--synapse-surface-hover)] transition-colors"
                                    >
                                        <Settings className="w-4 h-4" />
                                        Settings
                                    </button>
                                    <button 
                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[var(--synapse-text-muted)] hover:text-[var(--synapse-text)] hover:bg-[var(--synapse-surface-hover)] transition-colors"
                                    >
                                        <HelpCircle className="w-4 h-4" />
                                        Help & Support
                                    </button>
                                </div>

                                {/* Logout */}
                                <div className="border-t border-[var(--synapse-border)] pt-1 mt-1">
                                    <button 
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-[var(--synapse-surface-hover)] transition-colors"
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
