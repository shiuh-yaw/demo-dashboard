"use client";

import { ThemeProvider } from "@dynamic-demos/ui";
import { DynamicInit } from "@/components/dynamic-init";
import { QueryProvider } from "@/lib/query/query-provider";
import "@/lib/dynamicClient";

/**
 * Application Providers
 *
 * Wraps the application with all necessary context providers:
 * - ThemeProvider: forced light - operator pages hardcode light backgrounds
 * - DynamicInit: Handles Dynamic SDK auth state sync (prevents logout issues)
 * - QueryProvider: TanStack Query cache (SSR-safe per-request/browser client)
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      forcedTheme="light"
      disableTransitionOnChange
    >
      <DynamicInit />
      <QueryProvider>{children}</QueryProvider>
    </ThemeProvider>
  );
}
