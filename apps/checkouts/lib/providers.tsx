"use client";

import { ThemeProvider } from "@dynamic-demos/ui";
import "@/lib/dynamicClient";

/**
 * Application Providers
 *
 * Wraps the application with all necessary context providers:
 * - ThemeProvider: Handles light/dark mode theming
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
