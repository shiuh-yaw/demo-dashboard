"use client";

/**
 * Theme Wrapper Component
 *
 * No-op wrapper retained for compatibility with older imports.
 */

import { type ReactNode } from "react";

interface ThemeWrapperProps {
  children: ReactNode;
}

export function ThemeWrapper({ children }: ThemeWrapperProps) {
  return <>{children}</>;
}
