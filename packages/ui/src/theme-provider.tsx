"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type * as React from "react";

export type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;

/**
 * Theme provider wrapper around next-themes.
 * Provides light/dark mode support.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
