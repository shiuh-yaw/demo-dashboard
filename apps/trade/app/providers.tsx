"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ThemeProvider } from "@dynamic-demos/ui";
import { DynamicInit } from "@/components/dynamic-init";
import { MockModeProvider } from "@/contexts/mock-mode-context";

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
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <MockModeProvider>
          <DynamicInit />
          {children}
        </MockModeProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
