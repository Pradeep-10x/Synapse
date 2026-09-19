/**
 * Central registry of React Query keys so cache reads/invalidations stay
 * consistent and typo-free across the app.
 */
export const queryKeys = {
  feed: ['feed'] as const,
  notifications: ['notifications'] as const,
  recentlyActive: ['recentlyActive'] as const,
  userProfile: (username: string) => ['userProfile', username] as const,
  joinedCommunities: ['communities', 'joined'] as const,
};
