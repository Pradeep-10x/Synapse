import { useNavigate, useLocation } from 'react-router-dom';
import { Activity, Users, Send, Settings, User } from 'lucide-react';


const MENU_ITEMS = [
    { icon: Activity, label: 'Activity', path: '/feed' },

    { icon: Users, label: 'Community', path: '/communities' },
    { icon: User, label: 'Personal', path: '/personal' },
    { icon: Send, label: 'Messages', path: '/messages' },
    { icon: Settings, label: 'Settings', path: '/settings' },
];

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <>
             {/* Backdrop for mobile */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
                    onClick={onClose}
                />
            )}
            
            <aside className={`
                fixed top-0 left-0 z-50 h-screen w-[260px] 
                bg-[var(--synapse-bg)] border-r border-[var(--synapse-border)]
                flex flex-col transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
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
                            onClick={() => {
                                navigate(item.path);
                                onClose(); // Close sidebar on mobile when item clicked
                            }}
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

            {/* Status Footer - Optional placeholder */}
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
