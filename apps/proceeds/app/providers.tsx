"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { DynamicInit } from "@/components/dynamic-init";
import { ActiveNetworkProviderHost } from "@/components/active-network-provider-host";
import "@/lib/dynamic";

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

  return (
    <QueryClientProvider client={queryClient}>
      <DynamicInit />
      <ActiveNetworkProviderHost>{children}</ActiveNetworkProviderHost>
    </QueryClientProvider>
  );
}
