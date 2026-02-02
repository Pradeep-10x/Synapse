import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useSocketStore } from '@/store/socketStore';
import DashboardLayout from './DashboardLayout';

export default function AppLayout() {
  const { user } = useAuthStore();
  const { connect, disconnect, isConnected } = useSocketStore();

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
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}
