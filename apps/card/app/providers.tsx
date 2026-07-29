"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DynamicProvider } from "@dynamic-labs-sdk/react-hooks";
import { useState } from "react";

import { getClient } from "@/lib/dynamic-client";
import { DynamicGate, FullScreenSpinner } from "@/components/dynamic-gate";
import { BalanceWatchProvider } from "@/contexts/balance-watch-context";
import { WidgetNoticeProvider } from "@/contexts/widget-notice-context";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60 * 1000, refetchOnWindowFocus: false },
        },
      }),
  );

  // getClient() is null during SSR (singleton is browser-only). Render the
  // same spinner the gate shows so hydration output matches, then let the
  // gate take over once the client exists client-side.
  const client = getClient();

  return (
    <QueryClientProvider client={queryClient}>
      <BalanceWatchProvider>
        <WidgetNoticeProvider>
          {client ? (
            <DynamicProvider client={client}>
              <DynamicGate>{children}</DynamicGate>
            </DynamicProvider>
          ) : (
            <FullScreenSpinner />
          )}
        </WidgetNoticeProvider>
      </BalanceWatchProvider>
    </QueryClientProvider>
  );
}
