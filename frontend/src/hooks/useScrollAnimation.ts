import { useEffect, useRef, useState } from 'react';

const defaultOptions: IntersectionObserverInit = {
  rootMargin: '0px 0px -80px 0px', // trigger when 80px from bottom of viewport
  threshold: 0.1,
};

/**
 * Returns ref and isVisible: when element enters viewport, isVisible becomes true.
 * Use with .scroll-animate and .is-visible for fade/slide-up on scroll.
 */
export function useScrollAnimation(options: IntersectionObserverInit = defaultOptions) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setIsVisible(true);
      },
      options
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [options.rootMargin, options.threshold]);

  return [ref, isVisible] as const;
}
