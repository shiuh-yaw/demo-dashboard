"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DynamicProvider } from "@dynamic-labs-sdk/react-hooks";

import { getDynamicClient } from "@/lib/dynamic/client";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  // Create the Dynamic client during render (browser only - the singleton
  // returns null on the server). This is the load-bearing line: flow's
  // always-mounted IdentityBridge subscribes to SDK events via
  // useSyncExternalStore, whose `subscribe` runs before `getSnapshot` on
  // hydration - and the raw SDK throws ClientNotFoundError if no client has
  // been created yet. Creating it here (in the render phase, before any
  // effect) guarantees the client exists first, on every route including the
  // widget-less landing. Mirrors apps/wallet + apps/card.
  const dynamicClient = getDynamicClient();

  return (
    <QueryClientProvider client={queryClient}>
      {dynamicClient ? (
        <DynamicProvider client={dynamicClient}>{children}</DynamicProvider>
      ) : (
        children
      )}
    </QueryClientProvider>
  );
}
