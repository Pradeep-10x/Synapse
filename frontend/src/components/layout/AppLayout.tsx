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
      console.log('AppLayout: Initializing socket connection for user:', user.username);
      connect({
        _id: user._id,
        username: user.username,
        avatar: user.avatar
      });
    } else if (!user && isConnected) {
      // Handle logout case
      disconnect();
    }
  }, [user, isConnected, connect, disconnect]);



  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}
