import { useNavigate, useLocation } from 'react-router-dom';
import { Activity, Users, Send, User, PlusSquare } from 'lucide-react';

const MOBILE_MENU_ITEMS = [
    { icon: Activity, label: 'Feed', path: '/feed' },
    { icon: Users, label: 'Community', path: '/communities' },
    { icon: PlusSquare, label: 'Create', path: '/create' }, // Highlighted action
    { icon: Send, label: 'Messages', path: '/messages' },
    { icon: User, label: 'Profile', path: '/personal' },
];

export function MobileNav() {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[var(--synapse-surface)] border-t border-[var(--synapse-border)] z-50 flex items-center justify-around px-2 pb-safe">
            {MOBILE_MENU_ITEMS.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                    <button
                        key={item.label}
                        onClick={() => navigate(item.path)}
                        className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors duration-200 ${
                            isActive ? 'text-[var(--synapse-text)]' : 'text-[var(--synapse-text-muted)] hover:text-[var(--synapse-text)]'
                        }`}
                    >
                        <item.icon className={`w-6 h-6 ${isActive ? 'fill-current' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
                        {/* Use this label if needed, but usually icon-only is cleaner on small screens, or very small text */}
                        {/* <span className="text-[10px] font-medium">{item.label}</span> */}
                    </button>
                );
            })}
        </nav>
    );
}
