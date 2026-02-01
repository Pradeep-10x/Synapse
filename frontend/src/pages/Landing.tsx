import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import Header from '@/components/landing/Header';
import HeroSection from '@/components/landing/HeroSection';
import Footer from '@/components/landing/Footer';
import { useAuthStore } from '@/store/authStore';

export default function Landing() {
  const { isAuthenticated, isCheckingAuth, isAuthChecked, checkAuth } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated && !isCheckingAuth && !isAuthChecked) {
      checkAuth();
    }
  }, [isAuthenticated, isCheckingAuth, isAuthChecked, checkAuth]);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a12] text-[#9ca3af]">
        Checking your session...
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/feed" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <Header />
      <main className="flex-1">
        <HeroSection />
      </main>
      <Footer />
    </div>
  );
}
