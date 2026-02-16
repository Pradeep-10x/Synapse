import { useSyncExternalStore } from 'react';

function subscribe(callback: () => void) {
  const mql = [
    window.matchMedia('(max-width: 639px)'),
    window.matchMedia('(min-width: 640px) and (max-width: 1019px)'),
    window.matchMedia('(min-width: 1020px) and (max-width: 1429px)'),
    window.matchMedia('(min-width: 1430px)'),
  ];
  mql.forEach((m) => m.addEventListener('change', callback));
  return () => mql.forEach((m) => m.removeEventListener('change', callback));
}

function getSnapshot() {
  const w = window.innerWidth;
  return w < 640 ? 'mobile' : w < 1020 ? 'tablet' : w < 1430 ? 'midrange' : 'desktop';
}

function getServerSnapshot() {
  return 'desktop' as const;
}

export function useMediaQuery() {
  const breakpoint = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isMidrange: breakpoint === 'midrange',
    isDesktop: breakpoint === 'desktop',
    breakpoint,
  };
}
