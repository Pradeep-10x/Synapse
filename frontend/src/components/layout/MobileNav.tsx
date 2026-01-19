import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Film, MessageSquare, User } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/components/ui/Button';

export default function MobileNav() {
    const location = useLocation();
    const pathname = location.pathname;
    const { user } = useAuthStore();

    const navItems = [
        { icon: Home, label: 'Home', href: '/' },
        { icon: Search, label: 'Search', href: '/search' },
        { icon: MessageSquare, label: 'Messages', href: '/messages' },
        { icon: Film, label: 'Reels', href: '/reels' },
        { icon: User, label: 'Profile', href: `/profile/${user?.username}` },
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-lg border-t border-gray-200 flex justify-around items-center px-2 z-50 shadow-lg">
            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                    <Link
                        key={item.href}
                        to={item.href}
                        className={cn(
                            "p-3 rounded-full transition-all",
                            isActive ? "text-gray-900" : "text-gray-500"
                        )}
                    >
                        <Icon
                            size={24}
                            className={cn(isActive && "text-black")}
                            strokeWidth={isActive ? 2.5 : 2}
                        />
                    </Link>
                );
            })}
        </div>
    );
}
