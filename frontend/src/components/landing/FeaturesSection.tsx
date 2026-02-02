import { Zap, Globe, Radio, ShieldCheck } from 'lucide-react';
import ScrollReveal from './ScrollReveal';

const features = [
  {
    icon: Zap,
    title: 'Real-time updates',
    description: 'Events and activity stream instantly. No refresh, no delay—stay in sync with your communities.',
  },
  {
    icon: Globe,
    title: 'Dynamic domains',
    description: 'Create and join spaces that adapt to your interests. Cross-domain sharing with a single identity.',
  },
  {
    icon: Radio,
    title: 'Live presence',
    description: 'See who’s online and what’s happening now. Presence, typing indicators, and live activity feeds.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure & private',
    description: 'End-to-end security and privacy controls. Your data and conversations stay under your control.',
  },
];

export default function FeaturesSection() {
  return (
    <section
      id = "features"
      className="realtive py-80 bg-[#08080c]  
      scroll-mt-50"
      aria-labelledby="features-heading"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <h2
          id="features-heading"
          className="sr-only"
        >
          Features
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {features.map(({ icon: Icon, title, description }, index) => (
            <ScrollReveal key={title} delay={index * 80}>
              <article
                className="group rounded-xl border border-white/10 bg-white/[0.02] p-6 transition-colors duration-200 hover:border-[#3b82f6]/30 hover:bg-white/[0.04] focus-within:ring-2 focus-within:ring-[#3b82f6]/50 focus-within:ring-offset-2 focus-within:ring-offset-[#08080c]"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#3b82f6]/15 text-[#60a5fa] mb-4 group-hover:bg-[#3b82f6]/25 transition-colors duration-200">
                  <Icon className="w-5 h-5" aria-hidden />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-white/60 leading-relaxed">{description}</p>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
