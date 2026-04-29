"use client";

/**
 * Auth Layout
 *
 * Shared layout for login and KYC screens: logo above content, PoweredByFooter below.
 * Used by trade and remittance apps for consistent auth flow UI.
 * Uses --widget-* CSS variables from the app's globals.css (define in :root and .dark
 * for light/dark mode). Includes a theme toggle so users can switch themes on the
 * auth screen.
 */

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { PoweredByFooter } from "./powered-by-footer";
import { DynamicLogo } from "./dynamic-logo";

export interface AuthLayoutProps {
  children: React.ReactNode;
  /** Custom logo. Defaults to DynamicLogo wordmark. */
  logo?: React.ReactNode;
  /** Max width for content area (default: 400px) */
  maxWidth?: string;
  /**
   * Optional theme overrides (e.g. --widget-primary, --widget-accent).
   * Applied as inline style for apps that need runtime overrides.
   */
  themeOverrides?: Record<string, string>;
  /**
   * Show the light/dark theme toggle in the top-right corner.
   * Set to false for apps that are single-theme only. Default: true.
   */
  showThemeToggle?: boolean;
}

function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="w-9 h-9" aria-hidden />;

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--widget-muted,#9a9a9a)] hover:text-[var(--widget-fg,#252731)] hover:bg-[var(--widget-row-hover,#eef1f1)] transition-colors"
      aria-label="Toggle theme"
    >
      {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

export function AuthLayout({
  children,
  logo,
  maxWidth = "400px",
  themeOverrides,
  showThemeToggle = true,
}: AuthLayoutProps) {
  return (
    <div
      className="relative min-h-dvh flex flex-col items-center p-6 w-full bg-[var(--widget-page-bg)]"
      style={themeOverrides as React.CSSProperties}
    >
      {showThemeToggle && (
        <div className="absolute top-4 right-4 z-10">
          <ThemeToggle />
        </div>
      )}

      {/* Centered content area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 w-full min-h-0">
        <div className="shrink-0 mb-2">
          {logo ?? <DynamicLogo wordmark className="h-10 w-auto" />}
        </div>
        <div
          className="w-full shrink-0 min-h-[200px]"
          style={{ maxWidth }}
        >
          {children}
        </div>
      </div>

      {/* Powered by Dynamic — fixed to bottom of viewport */}
      <div className="shrink-0 mt-auto pt-4">
        <PoweredByFooter />
      </div>
    </div>
  );
}
