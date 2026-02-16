import { useNavigate, useLocation } from 'react-router-dom';
import { Activity, Users, Send, User, PlusSquare } from 'lucide-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { memo } from 'react';

const MOBILE_MENU_ITEMS = [
    { icon: Activity, label: 'Feed', path: '/feed' },
    { icon: Users, label: 'Community', path: '/communities' },
    { icon: PlusSquare, label: 'Create', path: '/create' },
    { icon: Send, label: 'Messages', path: '/messages' },
    { icon: User, label: 'Profile', path: '/personal' },
];

export const MobileNav = memo(function MobileNav() {
    const navigate = useNavigate();
    const location = useLocation();
    const { isTablet, isMidrange } = useMediaQuery();

    // Only show for tablet (640–1019px) and midrange (1020–1279px)
    // Hidden on mobile (<640px — bottom sidebar handles it) and desktop (≥1280px — full sidebar)
    if (!isTablet && !isMidrange) return null;

    return (
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[var(--synapse-surface)] border-t border-[var(--synapse-border)] z-50 flex items-center justify-around px-2 pb-safe">
            {MOBILE_MENU_ITEMS.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                    <button
                        key={item.label}
                        onClick={() => navigate(item.path)}
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
});
