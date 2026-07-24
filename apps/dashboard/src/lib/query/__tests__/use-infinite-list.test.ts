// @vitest-environment jsdom
//
// Kept as `.test.ts` (not `.test.tsx`) so it stays inside the dashboard's
// existing vitest `include` globs without touching vitest.config.ts - the
// QueryClientProvider wrapper is built with `createElement` instead of JSX.

import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useInfiniteList } from "@/lib/query/use-infinite-list";
import type { Page } from "@/lib/services/types";

interface Item {
  id: string;
  label: string;
}

function createWrapper() {
  // staleTime: Infinity mirrors production (get-query-client.ts sets a
  // non-zero staleTime) and keeps the "no fetch on seed" test deterministic -
  // with staleTime 0, React Query's default refetchOnMount would issue a
  // background fetch even with initialData present.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

const pageOne: Page<Item> = {
  items: [
    { id: "1", label: "one" },
    { id: "2", label: "two" },
  ],
  nextCursor: "cursor-2",
};

const pageTwo: Page<Item> = {
  items: [{ id: "3", label: "three" }],
  nextCursor: null,
};

describe("useInfiniteList", () => {
  it("flattens pages across the list into a single items array", async () => {
    const fetchPage = vi.fn(async (cursor: string | null) =>
      cursor === null ? pageOne : pageTwo,
    );

    const { result } = renderHook(
      () => useInfiniteList<Item>({ queryKey: ["items"], fetchPage }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items).toEqual(pageOne.items);
    expect(result.current.hasNextPage).toBe(true);

    result.current.fetchNextPage();

    await waitFor(() => expect(result.current.hasNextPage).toBe(false));
    expect(result.current.items).toEqual([...pageOne.items, ...pageTwo.items]);
    expect(fetchPage).toHaveBeenNthCalledWith(1, null);
    expect(fetchPage).toHaveBeenNthCalledWith(2, "cursor-2");
  });

  it("seeds data from initialPage with no fetch call", () => {
    const fetchPage = vi.fn(async () => pageTwo);

    const { result } = renderHook(
      () =>
        useInfiniteList<Item>({
          queryKey: ["items", "seeded"],
          fetchPage,
          initialPage: pageOne,
        }),
      { wrapper: createWrapper() },
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.items).toEqual(pageOne.items);
    expect(fetchPage).not.toHaveBeenCalled();
  });
});
