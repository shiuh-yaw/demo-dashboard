/**
 * Generic Infinite List Hook
 *
 * Wraps `useInfiniteQuery` around the cursor-based `Page<T>` contract
 * shared by every scoped `list` service method (see
 * `@/lib/services/types`). Flattens pages into a single array so
 * consumers never deal with the `{ pages, pageParams }` shape directly.
 */

import { useInfiniteQuery, type QueryKey } from "@tanstack/react-query";
import type { Page } from "@/lib/services/types";

export interface UseInfiniteListOptions<T extends { id: string }> {
  queryKey: QueryKey;
  fetchPage: (cursor: string | null) => Promise<Page<T>>;
  /** Server-fetched first page. Seeds the cache with NO initial fetch. */
  initialPage?: Page<T>;
}

export interface UseInfiniteListResult<T> {
  items: T[];
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
}

export function useInfiniteList<T extends { id: string }>({
  queryKey,
  fetchPage,
  initialPage,
}: UseInfiniteListOptions<T>): UseInfiniteListResult<T> {
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchPage(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: Page<T>) => lastPage.nextCursor,
    initialData: initialPage
      ? { pages: [initialPage], pageParams: [null] }
      : undefined,
  });

  const items = query.data ? query.data.pages.flatMap((page) => page.items) : [];

  return {
    items,
    fetchNextPage: () => {
      void query.fetchNextPage();
    },
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isLoading: query.isLoading,
  };
}
