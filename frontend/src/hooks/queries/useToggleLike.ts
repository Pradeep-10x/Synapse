import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { likeAPI } from '@/lib/api';
import { queryKeys } from './queryKeys';
import type { FeedResponse, Post } from '@/types/api';

/**
 * Optimistically toggles a like on a post and rolls back on error.
 * Demonstrates the React Query mutation pattern for instant UI feedback.
 */
export const useToggleLike = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => likeAPI.likeUnlikePost(postId),
    onMutate: async (postId: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.feed });
      const previous = queryClient.getQueryData<InfiniteData<FeedResponse>>(queryKeys.feed);

      queryClient.setQueryData<InfiniteData<FeedResponse>>(queryKeys.feed, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            posts: page.posts.map((post: Post) =>
              post._id === postId
                ? {
                    ...post,
                    isLiked: !post.isLiked,
                    likesCount: post.likesCount + (post.isLiked ? -1 : 1),
                  }
                : post
            ),
          })),
        };
      });

      return { previous };
    },
    onError: (_err, _postId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.feed, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feed });
    },
  });
};
