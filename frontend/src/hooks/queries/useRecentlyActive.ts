import { useQuery } from '@tanstack/react-query';
import { userAPI } from '@/lib/api';
import { queryKeys } from './queryKeys';
import type { ApiEnvelope, RecentlyActiveUser } from '@/types/api';

export const useRecentlyActive = () =>
  useQuery({
    queryKey: queryKeys.recentlyActive,
    queryFn: async () => {
      const res = await userAPI.getRecentlyActive();
      return (res.data as ApiEnvelope<RecentlyActiveUser[]>).data;
    },
  });
