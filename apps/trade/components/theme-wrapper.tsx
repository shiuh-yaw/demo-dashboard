"use client";

/**
 * Theme Wrapper Component
 *
 * Applies CSS variables from the Trade config to the document.
 * Derives accent, hover, and muted colors from primary/secondary.
 * Supports dual light/dark mode via next-themes.
 */

import { useEffect, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { useTradeConfig } from "@/contexts/trade-config-context";
import { themeToCssVars } from "@/lib/trade-config";

interface ThemeWrapperProps {
  children: ReactNode;
}

export function ThemeWrapper({ children }: ThemeWrapperProps) {
  const { theme } = useTradeConfig();
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const cssVars = themeToCssVars(theme, resolvedTheme === "dark");
    const root = document.documentElement;

    Object.entries(cssVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    return () => {
      Object.keys(cssVars).forEach((key) => {
        root.style.removeProperty(key);
      });
    };
  }, [theme, resolvedTheme]);

  return <>{children}</>;
}
