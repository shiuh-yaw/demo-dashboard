"use client";

/**
 * Earn Layout Client
 *
 * Client component that applies the theme CSS variables.
 */

import { ThemeWrapper } from "@/components/theme-wrapper";

interface EarnLayoutClientProps {
  children: React.ReactNode;
}

export function EarnLayoutClient({ children }: EarnLayoutClientProps) {
  return <ThemeWrapper>{children}</ThemeWrapper>;
}
