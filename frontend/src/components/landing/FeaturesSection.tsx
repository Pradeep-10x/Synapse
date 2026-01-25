import { motion } from 'framer-motion';
import { FileText, MessageCircle, Heart, Bell, Video } from 'lucide-react';

const features = [
  { icon: FileText, label: 'Post', color: '#a855f7' },
  { icon: MessageCircle, label: 'Community', color: '#06b6d4' },
  { icon: Heart, label: 'Connection', color: '#a855f7' },
  { icon: Bell, label: 'Message', color: '#06b6d4' },
  { icon: Video, label: 'Call', color: '#a855f7' },
];

const featureHighlights = [
  'Smart feed',
  'Community groups',
  'Stories with expiry',
  'Real-time chat',
  'WebRTC calls',
  'Verified profiles',
  'Privacy-first blocking & reporting',
];

export default function FeaturesSection() {
  return (
    <section className="relative py-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="text-center mb-20"
        >
          <h2 className="text-5xl sm:text-6xl font-bold mb-4">
            <span className="text-gradient">Features</span>
          </h2>
        </motion.div>

        {/* Timeline/Orbit Layout */}
        <div className="relative mb-20">
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 lg:gap-12">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.3, delay: index * 0.08, ease: [0.4, 0, 0.2, 1] }}
                className="flex flex-col items-center gap-4 relative"
                style={{ willChange: 'transform' }}
              >
                <div
                  className="glass-card rounded-xl p-6 transition-all duration-300 hover:scale-110 hover:glow-purple"
                  style={{ borderColor: `${feature.color}40` }}
                >
                  <feature.icon
                    className="w-8 h-8"
                    style={{ color: feature.color }}
                  />
                </div>
                <span className="text-sm text-[#9ca3af] font-medium">
                  {feature.label}
                </span>
                {index < features.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 left-full w-8 h-0.5 bg-[#a855f7] opacity-20" />
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {featureHighlights.map((highlight, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.3, delay: index * 0.03, ease: [0.4, 0, 0.2, 1] }}
              className="glass-card rounded-lg p-4 text-center transition-transform duration-200 hover:border-[rgba(168,85,247,0.3)]"
              style={{ willChange: 'transform' }}
            >
              <span className="text-sm text-[#e5e7eb] font-medium">
                {highlight}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
