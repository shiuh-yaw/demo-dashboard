"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "@/lib/session/store";
import { BackendProvider } from "@/lib/backend";
import { DEMO_MODE } from "@/lib/mode";

/**
 * Client providers. The session store persists the five-beat journey across
 * routes and refreshes; the backend provider picks staged or live from
 * DEMO_MODE and never loads the Dynamic SDK in staged mode.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60 * 1000, refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider mode={DEMO_MODE}>
        <BackendProvider>{children}</BackendProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
