import { useNavigate, useLocation } from 'react-router-dom';
import { Activity, Users, Send, Settings, User } from 'lucide-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { memo, useCallback, useEffect } from 'react';

const MENU_ITEMS = [
    { icon: Activity, label: 'Activity', path: '/feed' },
    { icon: Users, label: 'Community', path: '/communities' },
    { icon: User, label: 'Personal', path: '/personal' },
    { icon: Send, label: 'Messages', path: '/messages' },
    { icon: Settings, label: 'Settings', path: '/settings' },
];

interface SidebarProps {
    isDrawerOpen?: boolean;
    onClose?: () => void;
}

export const Sidebar = memo(function Sidebar({ isDrawerOpen = false, onClose }: SidebarProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { isMobile, isTablet, isMidrange } = useMediaQuery();

    // Close drawer on Escape key
    useEffect(() => {
        if (!isMobile || !isDrawerOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose?.();
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isMobile, isDrawerOpen, onClose]);

    // Close drawer on route change
    useEffect(() => {
        if (isMobile && isDrawerOpen) onClose?.();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname]);

    const handleNav = useCallback((path: string) => {
        navigate(path);
        if (isMobile) onClose?.();
    }, [navigate, isMobile, onClose]);

    /* ─── Mobile (<640px): bottom icon bar ─── */
    if (isMobile) {
        return (
            <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[var(--synapse-surface)] border-t border-[var(--synapse-border)] z-50 flex items-center justify-around px-2 pb-safe">
                {MENU_ITEMS.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <button
                            key={item.label}
                            onClick={() => handleNav(item.path)}
                            className={`flex flex-col items-center justify-center w-full h-full gap-0.5 transition-colors duration-200 ${
                                isActive ? 'text-[var(--synapse-text)]' : 'text-[var(--synapse-text-muted)] hover:text-[var(--synapse-text)]'
                            }`}
                        >
                            <item.icon className={`w-5 h-5 ${isActive ? 'fill-current' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
                            <span className="text-[10px] font-medium leading-none">{item.label}</span>
                        </button>
                    );
                })}
            </nav>
        );
    }

    /* ─── Tablet + Midrange (640–1279px): mini collapsed sidebar ─── */
    if (isTablet || isMidrange) {
        return (
            <aside className="group/sidebar w-[72px] flex-shrink-0 bg-[var(--synapse-bg)] border-r border-[var(--synapse-border)] flex flex-col h-screen fixed left-0 top-0 z-50 overflow-hidden">
                {/* Brand Header */}
                <div className="h-16 flex items-center px-5 py-12 border-b border-[var(--synapse-border)]">
                    <div className="flex items-center">
                        <img
                            src="/logo.png"
                            alt="Synapse Logo"
                            className="w-8 shrink-0"
                            style={{ marginLeft: '2px' }}
                        />
                        <span className="sr-only">
                            SYNAPSE
                        </span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-6 px-3 space-y-2">
                    {MENU_ITEMS.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <button
                                key={item.label}
                                onClick={() => navigate(item.path)}
                                title={item.label}
                                className={`w-full flex items-center gap-3 px-3 py-3.5 text-lg font-medium rounded-sm transition-all duration-200 ${isActive
                                    ? 'bg-[var(--synapse-surface)] text-[var(--synapse-text)] border border-transparent'
                                    : 'text-[var(--synapse-text-muted)] hover:text-[var(--synapse-text)] hover:bg-[var(--synapse-surface)] border border-transparent'
                                    }`}
                            >
                                <item.icon className={`w-6 h-6 flex-shrink-0 ${isActive ? 'text-[var(--synapse-text)]' : 'text-current'}`} />
                                <span className="sr-only">
                                    {item.label}
                                </span>
                            </button>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-[var(--synapse-border)]">
                    <div className="flex items-center gap-2 text-sm text-[var(--synapse-text-muted)]">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse flex-shrink-0" />
                        <span className="sr-only">
                            System Operational
                        </span>
                    </div>
                </div>
            </aside>
        );
    }

    /* ─── Desktop (≥1280px): original fixed sidebar (unchanged) ─── */
    return (
        <aside className="hidden xl:flex w-[260px] flex-shrink-0 bg-[var(--synapse-bg)] border-r border-[var(--synapse-border)] flex-col h-screen fixed left-0 top-0 z-50">
            {/* Brand Header */}
            <div className="h-16 flex items-center px-6 py-12  border-b border-[var(--synapse-border)]">
                <div className="flex items-center ">
                    <img
                        src="/logo.png"
                        alt="Synapse Logo"


                        className="w-10 shrink-0"
                        style={{ marginRight: "-35px", marginTop: "1px", marginLeft: "-5px" }}
                    />
                    <span className="text-[var(--synapse-text)] text-3xl font-semibold tracking-wide ml-12 mt-1">
                        SYNAPSE
                    </span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 px-4 space-y-2">
                {MENU_ITEMS.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <button
                            key={item.label}
                            onClick={() => navigate(item.path)}
                            className={`w-full flex items-center gap-3 px-5 py-3.5 text-lg font-medium rounded-sm transition-all duration-200 ${isActive
                                ? 'bg-[var(--synapse-surface)] text-[var(--synapse-text)] border border-transparent'
                                : 'text-[var(--synapse-text-muted)] hover:text-[var(--synapse-text)] hover:bg-[var(--synapse-surface)] border border-transparent'
                                }`}
                        >
                            <item.icon className={`w-6 h-6 ${isActive ? 'text-[var(--synapse-text)]' : 'text-current'}`} />
                            {item.label}
                        </button>
                    );
                })}
            </nav>

            {/* Status Footer */}
            <div className="p-4 border-t border-[var(--synapse-border)]">
                <div className="flex items-center gap-2 text-sm text-[var(--synapse-text-muted)]">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                    System Operational
                </div>
            </div>
        </aside>
    );
});
