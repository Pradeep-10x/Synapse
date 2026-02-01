import { type ReactNode } from 'react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  /** Delay in ms before animation runs (for stagger). */
  delay?: number;
  /** Optional: trigger earlier (e.g. rootMargin bottom). */
  rootMargin?: string;
}

export default function ScrollReveal({
  children,
  className = '',
  delay = 0,
  rootMargin = '0px 0px -60px 0px',
}: ScrollRevealProps) {
  const [ref, isVisible] = useScrollAnimation({ rootMargin, threshold: 0.1 });

  return (
    <div
      ref={ref}
      className={`scroll-animate ${isVisible ? 'is-visible' : ''} ${className}`.trim()}
      style={delay > 0 ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
