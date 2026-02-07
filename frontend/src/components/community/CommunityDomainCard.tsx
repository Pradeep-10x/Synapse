import { BarChart2, Crown, Shield, User, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CommunityDomainCardProps {
    _id: string;
    name: string;
    description: string;
    membersCount: number;
    coverImage?: string;
    // Mocked Metrics for UI
    activeNow?: number;
    eventsCount?: number;
    icon?: React.ReactNode;
    userRole?: 'owner' | 'admin' | 'member';
}

export function CommunityDomainCard(props: CommunityDomainCardProps) {
    const navigate = useNavigate();
    const { _id, name, membersCount, coverImage, activeNow = 0, eventsCount = 0, userRole } = props;

    // Generate a predictable gradient based on name char codes if no image
    const seed = name.charCodeAt(0) % 5;
    const gradients = [
        'from-blue-600/20 to-purple-900/40',
        'from-emerald-600/20 to-teal-900/40',
        'from-amber-600/20 to-orange-900/40',
        'from-rose-600/20 to-pink-900/40',
        'from-indigo-600/20 to-violet-900/40',
    ];
    const bgGradient = gradients[seed];

    const getRoleBadge = () => {
        if (!userRole) return null;
        
        const config = {
            owner: {
                icon: <Crown className="w-3 h-3" />,
                label: 'Owner',
                bg: 'bg-amber-500/20',
                text: 'text-amber-400',
                border: 'border-amber-500/30'
            },
            admin: {
                icon: <Shield className="w-3 h-3" />,
                label: 'Admin',
                bg: 'bg-blue-500/20',
                text: 'text-blue-400',
                border: 'border-blue-500/30'
            },
            member: {
                icon: <User className="w-3 h-3" />,
                label: 'Member',
                bg: 'bg-white/10',
                text: 'text-white/70',
                border: 'border-white/20'
            }
        };
        
        const role = config[userRole];
        
        return (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-md ${role.bg} ${role.text} ${role.border} border backdrop-blur-sm text-[10px] font-medium uppercase tracking-wider`}>
                {role.icon}
                {role.label}
            </div>
        );
    };

    return (
        <div
            onClick={() => navigate(`/community/${_id}`)}
            className="group relative h-72 rounded-[var(--radius-sm)] overflow-hidden border border-[var(--synapse-border)] bg-[var(--synapse-surface)] hover:border-[var(--synapse-text-muted)] transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md"
        >
            {/* Background Image / Gradient */}
            <div className="absolute inset-0 z-0">
                {coverImage ? (
                    <img
                        src={coverImage}
                        alt={name}
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-70 group-hover:scale-105 transition-all duration-700 ease-out"
                    />
                ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${bgGradient}`} />
                )}
                {/* Dark Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            </div>

            {/* Content */}
            <div className="absolute inset-0 z-10 p-5 flex flex-col justify-between">
                {/* Header (Icon + Name + Members) */}
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                        {/* Icon placeholder (mocked logic or real avatar) */}
                        <div className="w-8 h-8 rounded-md bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 text-white/90">
                            <BarChart2 className="w-4 h-4" />
                        </div>
                        <h3 className="text-lg font-semibold text-white tracking-wide group-hover:text-white/100 transition-colors drop-shadow-sm">
                            {name}
                        </h3>
                    </div>
                    
                    {/* Members Count Badge */}
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/10 backdrop-blur-sm border border-white/10 text-white/80 text-xs font-medium">
                        <Users className="w-3 h-3" />
                        {membersCount.toLocaleString()}
                    </div>
                </div>

                {/* Footer Metrics + Role */}
                <div className="flex items-end justify-between">
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 text-xs font-medium text-white/90">
                            <span className="relative flex h-2 w-2">
                                {activeNow > 0 && (
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                )}
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${activeNow > 0 ? 'bg-emerald-500' : 'bg-gray-500'}`}></span>
                            </span>
                            {activeNow} Active Now
                        </div>
                        <div className="text-xs text-white/60 font-mono">
                            {eventsCount} events today
                        </div>
                    </div>
                    
                    {/* Role Badge */}
                    {getRoleBadge()}
                </div>
            </div>
        </div>
    );
}
