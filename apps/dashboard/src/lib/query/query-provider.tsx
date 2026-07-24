"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query/get-query-client";

/**
 * Mounts the TanStack Query cache for the app. `getQueryClient()` returns a
 * new client per server render and a memoized singleton in the browser -
 * see `get-query-client.ts`.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
