import { Sidebar } from './Sidebar';
import { LivePresence } from './LivePresence';
import { Outlet } from 'react-router-dom';

interface DashboardLayoutProps {
    children?: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
    return (
        <div className="min-h-screen bg-[var(--synapse-bg)] text-[var(--synapse-text)] flex">
            {/* Left Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <main className="flex-1 ml-[260px] xl:mr-[280px] p-6 min-h-screen">
                <div className="max-w-4xl mx-auto w-full">
                    {children || <Outlet />}
                </div>
            </main>

            {/* Right Panel */}
            <LivePresence />
        </div>
    );
}

export default DashboardLayout;
