import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background: user's bg-image.png with dark overlay for text readability */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/bg-image.png)' }}
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-black/40"
        aria-hidden
      />

      <div className="relative z-10 max-w-2xl mx-auto text-center px-4 pt-20 pb-24">
        {/* Central logo from public/logo.png */}
        <div className="flex justify-center mb-8">
          <img
            src="/logo.png"
            alt=""
            className="w-24 h-24 sm:w-28 sm:h-28 object-contain"
          />
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-white tracking-tight mb-6">
          Synapse
        </h1>

        <p className="text-lg sm:text-xl text-white/90 font-normal mb-10 max-w-lg mx-auto leading-relaxed">
          A real-time interaction system for communities
          <br />
          and live activity.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/register"
            className="w-full sm:w-auto px-8 py-4 rounded-lg font-semibold text-white text-center transition-all bg-gradient-to-r from-[#2563eb] to-[#3b82f6] hover:from-[#1d4ed8] hover:to-[#2563eb] shadow-[0_0_20px_rgba(59,130,246,0.35)]"
          >
            Enter Synapse
          </Link>
          <a
            href="#architecture"
            className="w-full sm:w-auto px-8 py-4 rounded-lg font-semibold text-white/90 text-center border border-white/30 bg-transparent hover:bg-white/10 transition-colors inline-flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            View Architecture
          </a>
        </div>
      </div>
    </section>
  );
}
