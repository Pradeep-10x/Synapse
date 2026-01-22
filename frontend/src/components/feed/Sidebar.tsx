import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Users, MessageCircle, User, Plus, Settings, Bell } from 'lucide-react';
import Logo from '@/components/Logo';
import { useSocketStore } from '@/store/socketStore';

const navItems = [
  { icon: Home, label: 'Feed', path: '/feed' },
  { icon: Users, label: 'Community', path: '/community' },
  { icon: Search, label: 'Search', path: '/search' },
  { icon: Bell, label: 'Notifications', path: '/notifications', showBadge: true },
  { icon: MessageCircle, label: 'Messages', path: '/messages' },
  { icon: User, label: 'Profile', path: '/profile' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export default function Sidebar() {
  const location = useLocation();
  const { unreadCount } = useSocketStore();

  return (
    <aside className="fixed left-0 top-0 h-full w-20 lg:w-64 border-r border-[rgba(168,85,247,0.15)] glass-panel z-40">
      <div className="flex flex-col h-full p-4">
        {/* Logo */}
        <Link to="/feed" className="mb-8 flex items-center gap-3 px-2 py-3">
          <Logo className="ml-5 h-15  rounded-lg" />
        </Link>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const showNotificationBadge = item.showBadge && unreadCount > 0;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group relative ${isActive
                  ? 'bg-[#7c3aed]/20 border border-[rgba(168,85,247,0.3)]'
                  : 'hover:bg-[rgba(168,85,247,0.1)]'
                  }`}
              >
                <div className="relative">
                  <item.icon
                    className={`w-6 h-6 flex-shrink-0 ${isActive ? 'text-[#a855f7]' : 'text-[#9ca3af] group-hover:text-[#e5e7eb]'
                      } transition-colors`}
                  />
                  {showNotificationBadge && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                <span
                  className={`hidden lg:block text-base font-medium ${isActive ? 'text-[#e5e7eb]' : 'text-[#9ca3af] group-hover:text-[#e5e7eb]'
                    } transition-colors`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Create Button */}
        <Link
          to="/create"
          className="mt-4 flex items-center gap-3 px-3 py-3 rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] transition-colors duration-200"
        >
          <Plus className="w-6 h-6 text-white" />
          <span className="hidden lg:block text-base font-semibold text-white">Create</span>
        </Link>
      </div>
    </aside>
  );
}

