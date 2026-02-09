import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import Header from '@/components/landing/Header';
import HeroSection from '@/components/landing/HeroSection';
import OverviewSection from '@/components/landing/OverviewSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import Footer from '@/components/landing/Footer';
import { useAuthStore } from '@/store/authStore';
import { useInView } from '@/hooks/useInView';

export default function Landing() {
  const { isAuthenticated, isCheckingAuth, isAuthChecked, checkAuth } = useAuthStore();
  const [overviewRef, overviewInView] = useInView();
  const [featuresRef, featuresInView] = useInView();

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
    <div className="min-h-dvh  flex flex-col bg-black">
      <Header />
      <main className="flex-1">
        <HeroSection />

        <div
          ref={overviewRef}
          id="overview"
          className="scroll-mt-16 min-h-[50vh]"
          aria-hidden={!overviewInView}
        >
          {overviewInView && <OverviewSection />}
        </div>

        <div
          ref={featuresRef}
          id="features"
          className="scroll-mt-16 min-h-[40vh]"
          aria-hidden={!featuresInView}
        >
          {featuresInView && <FeaturesSection />}
        </div>

        <div id="docs" className="scroll-mt-16">
          <Footer />
        </div>
      </main>
    </div>
  );
}
