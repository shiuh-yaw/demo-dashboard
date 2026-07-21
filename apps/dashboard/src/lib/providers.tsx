"use client";

import { ThemeProvider } from "@dynamic-demos/ui";
import { DynamicInit } from "@/components/dynamic-init";
import "@/lib/dynamicClient";

/**
 * Application Providers
 *
 * Wraps the application with all necessary context providers:
 * - ThemeProvider: forced light - operator pages hardcode light backgrounds
 * - DynamicInit: Handles Dynamic SDK auth state sync (prevents logout issues)
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
      {children}
    </ThemeProvider>
  );
}
