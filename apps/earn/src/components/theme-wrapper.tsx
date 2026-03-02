"use client";

/**
 * Theme Wrapper Component
 *
 * Applies CSS variables from the Earn config to the document.
 * Should wrap the root content when using custom themes.
 */

import { useEffect, type ReactNode } from "react";
import { useEarnConfig } from "@/contexts/earn-config-context";
import { themeToCssVars } from "@/lib/earn-config";

interface ThemeWrapperProps {
  children: ReactNode;
}

export function ThemeWrapper({ children }: ThemeWrapperProps) {
  const { theme } = useEarnConfig();

  useEffect(() => {
    // Apply CSS variables to the document root
    const cssVars = themeToCssVars(theme);
    const root = document.documentElement;

    Object.entries(cssVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Cleanup on unmount
    return () => {
      Object.keys(cssVars).forEach((key) => {
        root.style.removeProperty(key);
      });
    };
  }, [theme]);

  return <>{children}</>;
}
