"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/top-bar";
import { BreadcrumbProvider } from "@/components/breadcrumbs";
import { Sheet, SheetContent, SheetTitle } from "@/components/droplet-client";
import { SIDEBAR_COOKIE, THEME_COOKIE } from "@/lib/operator-prefs";
import type { OperatorTheme } from "@/lib/operator-prefs";
import type { UserRole } from "@/lib/services";

/**
 * Client shell for the operator L-shape. Desktop (lg+): collapsible fixed
 * sidebar + in-card top bar + scrolling outlet, collapse state seeded from a
 * server-read cookie (no flash). Mobile (<lg): the sidebar becomes an
 * off-canvas Sheet opened from a top-bar hamburger; the content is full-width.
 */

export interface OperatorShellProps {
  children: ReactNode;
  role: UserRole;
  user: { sub: string; email?: string };
  teams: { id: string; name: string }[];
  isAdmin: boolean;
  activeCtx: string;
  initialCollapsed: boolean;
  initialTheme: OperatorTheme;
}

const THEME_CYCLE: Record<OperatorTheme, OperatorTheme> = {
  light: "dark",
  dark: "auto",
  auto: "light",
};

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`;
}

export function OperatorShell({
  children,
  role,
  user,
  teams,
  isAdmin,
  activeCtx,
  initialCollapsed,
  initialTheme,
}: OperatorShellProps) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<OperatorTheme>(initialTheme);
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      writeCookie(SIDEBAR_COOKIE, String(next));
      return next;
    });
  }

  function cycleTheme() {
    setTheme((prev) => {
      const next = THEME_CYCLE[prev];
      writeCookie(THEME_COOKIE, next);
      return next;
    });
  }

  const resolvedDark = theme === "dark" || (theme === "auto" && systemDark);
  const dataTheme = resolvedDark ? "dark" : "light";

  // Droplet Sheet/Dialog/Dropdown/Tooltip portals attach to <body>, outside the
  // operator subtree, so mirror the operator surface + theme onto <body> while
  // the shell is mounted. The `.dark` class carries droplet's own dark chrome
  // tokens (overlay, tray, shadows) that live under `.dark`, not data-theme -
  // without it a portaled dialog gets a light chrome halo around dark content.
  // Public routes never mount this shell, so <body> stays untagged (light).
  useEffect(() => {
    const { body } = document;
    body.dataset.surface = "operator";
    body.dataset.theme = dataTheme;
    body.classList.toggle("dark", dataTheme === "dark");
    return () => {
      delete body.dataset.surface;
      delete body.dataset.theme;
      body.classList.remove("dark");
    };
  }, [dataTheme]);

  return (
    <div
      data-surface="operator"
      data-theme={dataTheme}
      className={`h-screen overflow-hidden bg-muted text-foreground ${
        resolvedDark ? "dark" : ""
      }`}
    >
      <BreadcrumbProvider>
        <Sidebar
          role={role}
          collapsed={collapsed}
          className="hidden lg:flex"
        />

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-64 overflow-hidden rounded-r-2xl p-0" showCloseButton={false}>
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <Sidebar
              role={role}
              variant="drawer"
              onNavigate={() => setMobileOpen(false)}
            />
          </SheetContent>
        </Sheet>

        <div
          className={`fixed inset-y-0 right-0 left-0 flex flex-col bg-muted p-1.5 transition-[left] duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none lg:pl-0 ${
            collapsed ? "lg:left-12" : "lg:left-60"
          }`}
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border-divider bg-background">
            <TopBar
              user={user}
              teams={teams}
              isAdmin={isAdmin}
              activeCtx={activeCtx}
              onOpenNav={() => setMobileOpen(true)}
              collapsed={collapsed}
              onToggleCollapsed={toggleCollapsed}
              theme={theme}
              onCycleTheme={cycleTheme}
            />
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
              {children}
            </div>
          </div>
        </div>
      </BreadcrumbProvider>
    </div>
  );
}
