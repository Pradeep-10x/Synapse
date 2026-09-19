import { useInfiniteQuery } from '@tanstack/react-query';
import { feedAPI } from '@/lib/api';
import { queryKeys } from './queryKeys';
import type { ApiEnvelope, FeedResponse } from '@/types/api';

/**
 * Paginated home feed via React Query's infinite query.
 * Replaces manual useEffect + page state + concat logic in Feed.tsx:
 *
 *   const { data, fetchNextPage, hasNextPage, isLoading } = useHomeFeed();
 *   const posts = data?.pages.flatMap((p) => p.posts) ?? [];
 */
export const useHomeFeed = (limit = 10) =>
  useInfiniteQuery({
    queryKey: queryKeys.feed,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const res = await feedAPI.getHomeFeed(pageParam, limit);
      return (res.data as ApiEnvelope<FeedResponse>).data;
    },
    getNextPageParam: (lastPage) =>
      lastPage.hasNext ? lastPage.page + 1 : undefined,
  });
