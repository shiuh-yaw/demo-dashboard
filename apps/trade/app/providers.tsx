"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { usePathname } from "next/navigation";
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

  // The scenario front door at "/" renders the light-only Dynamic site
  // chrome (SiteHeader/CodePanel), so dark mode is forced off there;
  // the user's system/manual theme resumes on navigation into the app.
  const pathname = usePathname();

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      forcedTheme={pathname === "/" ? "light" : undefined}
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
