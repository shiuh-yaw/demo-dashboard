/**
 * Query Client Factory
 *
 * Canonical TanStack Query "Advanced SSR" pattern for the Next.js App
 * Router: https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr
 * A fresh `QueryClient` per server request avoids leaking cache state
 * across requests/users; a memoized singleton on the client avoids
 * recreating the cache (and refetching) on every re-render.
 */

import { QueryClient, defaultShouldDehydrateQuery, isServer } from "@tanstack/react-query";

/** SSR-seeded data stays fresh for this long before a client refetch fires. */
const DEFAULT_STALE_TIME_MS = 60 * 1000;

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: DEFAULT_STALE_TIME_MS,
      },
      dehydrate: {
        // Include pending queries in dehydration so Suspense-driven
        // server prefetches can stream in on the client.
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === "pending",
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * Server: always returns a new `QueryClient` (per request - React Server
 * Components re-run the module per request, but a module-level singleton
 * would still be wrong under concurrent requests).
 * Browser: returns a memoized singleton so client-side navigations reuse
 * the same cache instead of refetching everything.
 */
export function getQueryClient(): QueryClient {
  if (isServer) {
    return makeQueryClient();
  }
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
