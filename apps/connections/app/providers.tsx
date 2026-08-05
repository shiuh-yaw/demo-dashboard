"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Root providers. Deliberately only QueryClientProvider: the tree shape here
 * must be identical on the server and the client.
 *
 * This used to also mount `<DynamicProvider>`, conditionally - `getClient()` is
 * null during SSR, so the server rendered `children` bare while the client
 * rendered `<DynamicProvider>{children}</DynamicProvider>`. React sees a
 * different element type at that position, unmounts the whole subtree and
 * remounts it, which restarted the lazily-loaded widget and replayed its
 * skeleton (visibly, several times in dev with StrictMode double-invoking).
 *
 * `DynamicProvider` now lives inside the browser-only chunk instead, where the
 * client is always available on first render - see components/connect-widget.tsx.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
