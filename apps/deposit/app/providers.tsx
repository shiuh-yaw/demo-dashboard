"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { DepositNetworkProvider } from "@/contexts/deposit-network-context";
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
      <DepositNetworkProvider>{children}</DepositNetworkProvider>
    </QueryClientProvider>
  );
}
