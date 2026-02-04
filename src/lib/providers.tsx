"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { DynamicInit } from "@/components/dynamic-init";
import "@/lib/dynamicClient";

/**
 * Application Providers
 *
 * Wraps the application with all necessary context providers:
 * - ThemeProvider: Handles light/dark mode theming
 * - DynamicInit: Handles Dynamic SDK auth state sync (prevents logout issues)
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <DynamicInit />
      {children}
    </ThemeProvider>
  );
}
