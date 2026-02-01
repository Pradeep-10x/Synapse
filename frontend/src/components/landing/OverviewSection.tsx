import { Link } from 'react-router-dom';
import { Github } from 'lucide-react';
import ScrollReveal from './ScrollReveal';

/** Placeholder UI graphic (CHIRON-style): dark panel with blue glow, charts, progress. */
function DashboardGraphic() {
  return (
    <div
      className="relative rounded-xl border border-[#3b82f6]/40 bg-[#0a0a0f]/90 p-4 shadow-[0_0_40px_rgba(59,130,246,0.15)]"
      aria-hidden
    >
      <div className="absolute inset-0 rounded-xl border border-[#3b82f6]/20 pointer-events-none" />
      <div className="text-[10px] font-medium text-[#3b82f6]/80 uppercase tracking-wider mb-3">
        CHIRON
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="h-16 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
          <div className="flex gap-1.5 items-end">
            {[40, 65, 45, 80, 55].map((h, i) => (
              <div
                key={i}
                className="w-2 rounded-t bg-[#3b82f6]/70"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
        <div className="h-16 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-2 border-[#3b82f6]/60 flex items-center justify-center text-xs font-semibold text-[#3b82f6]">
            75%
          </div>
        </div>
      </div>
      <div className="mt-3 h-px bg-white/10" />
      <div className="mt-3 flex gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full w-2/3 rounded-full bg-[#3b82f6]/60" />
        </div>
        <div className="flex-1 h-1.5 rounded-full bg-[#3b82f6]/30" />
      </div>
    </div>
  );
}

export default function OverviewSection() {
  return (
    <section
      className="relative py-16 md:py-24 bg-[#0a0a0f]"
      aria-labelledby="overview-heading"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <ScrollReveal>
            <h2
              id="overview-heading"
              className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight mb-4"
            >
              Real-time interaction system for live communities
            </h2>
            <p className="text-lg text-white/70 mb-8 max-w-xl leading-relaxed">
              Connect in the moment. Share across domains. Experience events as they happen.
            </p>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <Link
                to="/register"
                className="w-full sm:w-auto px-6 py-3.5 rounded-lg font-semibold text-white text-center transition-all duration-200 bg-gradient-to-r from-[#2563eb] to-[#3b82f6] hover:from-[#1d4ed8] hover:to-[#2563eb] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f]"
              >
                Get Started
              </Link>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-6 py-3.5 rounded-lg font-semibold text-white/90 text-center border border-white/30 bg-transparent hover:bg-white/10 transition-colors duration-200 inline-flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f]"
              >
                <Github className="w-5 h-5 shrink-0" aria-hidden />
                Get to GitHub
              </a>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={120}>
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-sm">
                <DashboardGraphic />
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
