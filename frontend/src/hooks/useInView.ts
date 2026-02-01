import { useEffect, useRef, useState } from 'react';

const defaultOptions: IntersectionObserverInit = {
  rootMargin: '100px 0px',
  threshold: 0,
};

/**
 * Returns a ref and boolean: true when the element is in viewport.
 * Used for lazy-rendering sections (e.g. landing Overview, Features).
 */
export function useInView(options: IntersectionObserverInit = defaultOptions) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) setInView(true);
    }, options);

    observer.observe(el);
    return () => observer.disconnect();
  }, [options.rootMargin, options.threshold]);

  return [ref, inView] as const;
}
