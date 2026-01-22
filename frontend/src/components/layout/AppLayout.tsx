import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '@/components/feed/Sidebar';
import LiveOrbitPanel from '@/components/feed/LiveOrbitPanel';
import CommunityLiveOrbitPanel from '@/components/feed/CommunityLiveOrbitPanel';
import RightPanel from '@/components/feed/RightPanel';
import { useAuthStore } from '@/store/authStore';
import { useSocketStore } from '@/store/socketStore';

export default function AppLayout() {
  const location = useLocation();
  const { user } = useAuthStore();
  const { connect, disconnect, isConnected } = useSocketStore();
  
  const isCommunityPage = location.pathname === '/community' || location.pathname.startsWith('/community/');
  const isFeedPage = location.pathname === '/feed';
  const showLiveOrbit = isFeedPage || isCommunityPage;

  // Initialize socket connection when user is authenticated
  useEffect(() => {
    if (user?._id && !isConnected) {
      connect(user._id);
    }

    return () => {
      // Cleanup on unmount (logout)
      disconnect();
    };
  }, [user?._id]);

  return (
    <div className="min-h-screen flex">
      {/* Left Sidebar - Always visible */}
      <Sidebar />

      {/* Layout: Centered Feed+Live Orbit | Tools */}
      <div className="flex-1 ml-20 lg:ml-64 xl:mr-80 flex gap-4 xl:gap-6 h-screen">
        {/* Centered Container: Feed + Live Orbit Combined */}
        <div className="flex-1 flex justify-center min-w-0">
          <div className="flex max-w-[1400px] w-full">
            {/* Feed Column */}
            <main className={`${showLiveOrbit ? 'flex-[0.75]' : 'flex-1'} min-w-0 bg-[#0a0a12] overflow-y-auto scrollbar-hide`}>
              <Outlet />
            </main>

            {/* Live Orbit Column - Only show on Feed and Community pages */}
            {showLiveOrbit && (
              <div className="hidden xl:block flex-[0.33] min-w-0 h-full">
                {isCommunityPage ? <CommunityLiveOrbitPanel /> : <LiveOrbitPanel />}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tools Column (Fixed) - Action Mode */}
      <RightPanel />
    </div>
  );
}
