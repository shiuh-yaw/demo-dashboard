"use client";

/**
 * App Shell Component
 *
 * Top nav bar layout: logo on left, utility icons on right.
 * Content area below fills remaining viewport height.
 */

import { type ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { AppLogo } from "@/components/ui/app-logo";
import { ConnectButton } from "@/components/ui/connect-button";
import { NetworkSwitcher } from "@/components/ui/network-switcher";
import { NavBar } from "./nav-bar";

interface AppShellProps {
  children: ReactNode;
}

function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    // Placeholder to prevent layout shift
    return <div className="w-9 h-9" />;
  }

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="w-9 h-9 flex items-center justify-center rounded-xl text-trade-text-secondary hover:text-trade-text-primary hover:bg-trade-accent-muted transition-all"
      aria-label="Toggle theme"
    >
      {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-trade-bg">
      {/* Top header - overflow-visible so logo is fully shown (matches remittance), z-20 so dropdowns render above main content */}
      <header className="relative z-20 shrink-0 bg-trade-bg overflow-visible">
        <div className="flex items-center justify-between h-14 lg:h-16 px-4 lg:px-8">
          {/* Left: Logo - clickable, links to app root */}
          <Link
            href="/"
            className="flex items-center overflow-visible min-h-8 hover:opacity-80 transition-opacity"
            aria-label="Go to home"
          >
            <AppLogo size={40} />
          </Link>

          {/* Right: Theme toggle + network switcher + wallet button */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NetworkSwitcher />
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* Content area */}
      <main className="flex-1 overflow-auto px-4 lg:px-8 pt-3 lg:pt-4 pb-24 scrollbar-thin">
        {children}
      </main>

      {/* Floating bottom nav */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <NavBar />
      </div>
    </div>
  );
}
