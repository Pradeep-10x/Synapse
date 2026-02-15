import { useSyncExternalStore } from 'react';

function subscribe(callback: () => void) {
  const mql = [
    window.matchMedia('(max-width: 639px)'),
    window.matchMedia('(min-width: 640px) and (max-width: 1023px)'),
    window.matchMedia('(min-width: 1024px)'),
  ];
  mql.forEach((m) => m.addEventListener('change', callback));
  return () => mql.forEach((m) => m.removeEventListener('change', callback));
}

function getSnapshot() {
  const w = window.innerWidth;
  return w < 640 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop';
}

function getServerSnapshot() {
  return 'desktop' as const;
}

export function useMediaQuery() {
  const breakpoint = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop',
    breakpoint,
  };
}
