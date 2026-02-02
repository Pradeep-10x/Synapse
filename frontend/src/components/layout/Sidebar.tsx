import { useNavigate, useLocation } from 'react-router-dom';
import { Activity, LayoutGrid, Calendar, MessageSquare, Send } from 'lucide-react';

const MENU_ITEMS = [
    { icon: Activity, label: 'Activity', path: '/feed' },
    { icon: LayoutGrid, label: 'Domains', path: '/communities' },
    { icon: Calendar, label: 'Events', path: '/events' },
    { icon: MessageSquare, label: 'Messages', path: '/messages' },
    { icon: Send, label: 'Direct', path: '/direct' },
];

export function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <aside className="w-[260px] flex-shrink-0 bg-[var(--synapse-bg)] border-r border-[var(--synapse-border)] flex flex-col h-screen fixed left-0 top-0 z-50">
            {/* Brand Header */}
            <div className="h-16 flex items-center px-6 py-12  border-b border-[var(--synapse-border)]">
                <div className="flex items-center ">
                    <img
                        src="/logo.png"
                        alt="Synapse Logo"


                        className="w-43 shrink-0"
                        style={{ marginRight: "-105px", marginTop: "7px", marginLeft: "-60px" }}
                    />
                    <span className="text-[var(--synapse-text)] text-3xl font-semibold tracking-wide ml-12">
                        SYNAPSE
                    </span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 px-3 space-y-1">
                {MENU_ITEMS.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <button
                            key={item.label}
                            onClick={() => navigate(item.path)}
                            className={`w-full flex items-center gap-3 px-8 py-3 text-xl font-medium rounded-[var(--radius-sm)] transition-colors duration-200 ${isActive
                                ? 'bg-[var(--synapse-active)] text-[var(--synapse-blue)]'
                                : 'text-[var(--synapse-text-muted)] hover:text-[var(--synapse-text)] hover:bg-[var(--synapse-surface)]'
                                }`}
                        >
                            <item.icon className={`w-6 h-6 ${isActive ? 'text-[var(--synapse-blue)]' : 'text-current'}`} />
                            {item.label}
                        </button>
                    );
                })}
            </nav>

            {/* Status Footer - Optional placeholder */}
            <div className="p-4 border-t border-[var(--synapse-border)]">
                <div className="flex items-center gap-2 text-sm text-[var(--synapse-text-muted)]">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                    System Operational
                </div>
            </div>
        </aside>
    );
}
