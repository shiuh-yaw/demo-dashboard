"use client";

/**
 * Theme Wrapper Component
 *
 * Applies CSS variables from the Remittance config to the document.
 * Derives hover, accent, and card gradient from primary/secondary colors.
 */

import { useEffect, type ReactNode } from "react";
import { useRemittanceConfig } from "@/contexts/remittance-config-context";
import { themeToCssVars } from "@/lib/remittance-config";

interface ThemeWrapperProps {
  children: ReactNode;
}

export function ThemeWrapper({ children }: ThemeWrapperProps) {
  const { theme } = useRemittanceConfig();

  useEffect(() => {
    const cssVars = themeToCssVars(theme);
    const root = document.documentElement;

    Object.entries(cssVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    return () => {
      Object.keys(cssVars).forEach((key) => {
        root.style.removeProperty(key);
      });
    };
  }, [theme]);

  return <>{children}</>;
}
