import { useNavigate, useLocation } from 'react-router-dom';
import { Activity, Users, Send, Settings, User, X } from 'lucide-react';
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
    const { isMobile, isTablet } = useMediaQuery();

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

    /* ─── Mobile: slide-in drawer ─── */
    if (isMobile) {
        return (
            <>
                {/* Backdrop */}
                {isDrawerOpen && (
                    <div
                        className="drawer-backdrop animate-in fade-in duration-200"
                        onClick={onClose}
                        aria-hidden
                    />
                )}
                {/* Panel */}
                <aside
                    className={`drawer-panel bg-[var(--synapse-bg)] border-r border-[var(--synapse-border)] flex flex-col ${isDrawerOpen ? 'open' : ''}`}
                >
                    {/* Header */}
                    <div className="h-16 flex items-center justify-between px-5 border-b border-[var(--synapse-border)]">
                        <div className="flex items-center">
                            <img
                                src="/logo.png"
                                alt="Synapse Logo"
                                className="w-8 shrink-0"
                                style={{ marginRight: '-30px', marginTop: '1px', marginLeft: '-4px' }}
                            />
                            <span className="text-[var(--synapse-text)] text-2xl font-semibold tracking-wide ml-12 mt-0.5">
                                SYNAPSE
                            </span>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-[var(--synapse-surface)] text-[var(--synapse-text-muted)] hover:text-[var(--synapse-text)] transition-colors"
                            aria-label="Close sidebar"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 py-6 px-4 space-y-2">
                        {MENU_ITEMS.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <button
                                    key={item.label}
                                    onClick={() => handleNav(item.path)}
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

                    {/* Footer */}
                    <div className="p-4 border-t border-[var(--synapse-border)]">
                        <div className="flex items-center gap-2 text-sm text-[var(--synapse-text-muted)]">
                            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                            System Operational
                        </div>
                    </div>
                </aside>
            </>
        );
    }

    /* ─── Tablet: mini collapsed sidebar ─── */
    if (isTablet) {
        return (
            <aside className="group/sidebar w-[72px] hover:w-[260px] flex-shrink-0 bg-[var(--synapse-bg)] border-r border-[var(--synapse-border)] flex flex-col h-screen fixed left-0 top-0 z-50 transition-[width] duration-200 overflow-hidden">
                {/* Brand Header */}
                <div className="h-16 flex items-center px-5 py-12 border-b border-[var(--synapse-border)]">
                    <div className="flex items-center">
                        <img
                            src="/logo.png"
                            alt="Synapse Logo"
                            className="w-8 shrink-0"
                            style={{ marginLeft: '2px' }}
                        />
                        <span className="text-[var(--synapse-text)] text-2xl font-semibold tracking-wide ml-3 mt-0.5 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 whitespace-nowrap">
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
                                <span className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 whitespace-nowrap">
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
                        <span className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                            System Operational
                        </span>
                    </div>
                </div>
            </aside>
        );
    }

    /* ─── Desktop: original fixed sidebar (unchanged) ─── */
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
