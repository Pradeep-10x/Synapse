import { useQuery } from '@tanstack/react-query';
import { userAPI } from '@/lib/api';
import { queryKeys } from './queryKeys';
import type { ApiEnvelope, User } from '@/types/api';

export const useUserProfile = (username: string | undefined) =>
  useQuery({
    queryKey: queryKeys.userProfile(username ?? ''),
    enabled: Boolean(username),
    queryFn: async () => {
      const res = await userAPI.getUserProfile(username as string);
      return (res.data as ApiEnvelope<User>).data;
    },
  });
