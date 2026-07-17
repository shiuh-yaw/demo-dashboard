"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DynamicProvider } from "@dynamic-labs-sdk/react-hooks";
import { useState } from "react";

import { getClient } from "@/lib/dynamic/client";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  // getClient() is null during SSR (the singleton only creates in the
  // browser), and DynamicProvider requires a client - so the provider
  // mounts client-side only. Safe: every react-hooks consumer renders
  // behind the isClientReady gate in WalletApp, and context providers
  // emit no DOM, so hydration output is identical.
  const client = getClient();

  return (
    <QueryClientProvider client={queryClient}>
      {client ? (
        <DynamicProvider client={client}>{children}</DynamicProvider>
      ) : (
        children
      )}
    </QueryClientProvider>
  );
}
