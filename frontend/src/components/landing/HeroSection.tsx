import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import ScrollReveal from './ScrollReveal';

export default function HeroSection() {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      aria-label="Hero"
    >
      {/* Background: bg-image.png with overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/bg-image.png)' }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-black/40" aria-hidden />

      <ScrollReveal rootMargin="0px" className="relative z-10 max-w-2xl mx-auto text-center px-4 pt-20 pb-24">
        <div className="flex justify-center mb-8">
          <img
            src="/logo.png"
            alt=""
            className="w-24 h-24 sm:w-28 sm:h-28 object-contain"
            loading="eager"
            decoding="async"
            width={112}
            height={112}
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
            className="w-full sm:w-auto px-8 py-4 rounded-lg font-semibold text-white text-center transition-all duration-200 bg-gradient-to-r from-[#2563eb] to-[#3b82f6] hover:from-[#1d4ed8] hover:to-[#2563eb] shadow-[0_0_20px_rgba(59,130,246,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            Enter Synapse
          </Link>
          <a
            href="#overview"
            className="w-full sm:w-auto px-8 py-4 rounded-lg font-semibold text-white/90 text-center border border-white/30 bg-transparent hover:bg-white/10 transition-colors duration-200 inline-flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            <Plus className="w-5 h-5 shrink-0" aria-hidden />
            View Architecture
          </a>
        </div>
      </ScrollReveal>
    </section>
  );
}
