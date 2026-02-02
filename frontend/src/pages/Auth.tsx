import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import AuthCard from '@/components/auth/AuthCard';

export default function AuthPage() {
  const { isAuthenticated, checkAuth, isCheckingAuth } = useAuthStore();
  const navigate = useNavigate();
  const hasCheckedAuth = useRef(false);

  useEffect(() => {
    // Only check auth once on mount
    if (!hasCheckedAuth.current) {
      hasCheckedAuth.current = true;
      checkAuth();
    }
  }, []); // Empty dependency array - only run once

  useEffect(() => {
    // Only redirect if auth check is complete and user is authenticated
    if (!isCheckingAuth && isAuthenticated) {
      navigate('/feed', { replace: true });
    }
  }, [isAuthenticated, isCheckingAuth, navigate]);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a12]">
        <div className="text-[#9ca3af]">Loading...</div>
      </div>
    );
  }

  return (
    
    <div className="min-h-screen w-full bg-[#18181B] flex flex-col items-center justify-center p-4">
      <div>
      <img src="logo.png" alt="Logo" width={250} style={{marginTop: '-60px',}}/>
      </div>
      <AuthCard />
    </div>
    
  );
}

