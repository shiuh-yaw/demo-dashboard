"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/droplet-client";
import { DynamicLogo } from "@/components/dynamic-logo";
import {
  navGroupsForRole,
  isNavItemActive,
  type NavItem,
} from "@/components/nav-items";
import type { UserRole } from "@/lib/services";

/**
 * Grouped-section sidebar (Dynamic-console style). Fixed rail on desktop; can
 * collapse to a centered icon-only rail. The collapse toggle lives in the top
 * bar, not here. The `drawer` variant renders the same nav for the mobile
 * off-canvas Sheet (always expanded). Role-gated groups are cosmetic; every
 * action re-checks the role server-side.
 *
 * Collapse never reflows the item layout: the icon slot is fixed at `px-2` in
 * both states so icons stay anchored, and only the label opacity (and the
 * section-header title/dot cross-fade) animates while the aside width glides.
 */

// Console collapse feel: labels fade fast, width glides on the same ease.
const FADE =
  "transition-opacity duration-[130ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";

type SidebarProps = {
  role: UserRole;
  variant?: "fixed" | "drawer";
  collapsed?: boolean;
  onNavigate?: () => void;
  /** Extra classes for the fixed aside (e.g. responsive visibility). */
  className?: string;
};

export function Sidebar({
  role,
  variant = "fixed",
  collapsed = false,
  onNavigate,
  className = "",
}: SidebarProps) {
  const pathname = usePathname();
  const groups = navGroupsForRole(role);
  const isCollapsed = variant === "fixed" && collapsed;

  const renderItem = (item: NavItem) => {
    const active = isNavItemActive(item, pathname ?? "");
    const link = (
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        onClick={onNavigate}
        className={`flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] transition-colors ${
          active ? "bg-accent font-semibold" : "hover:bg-accent"
        }`}
      >
        <item.icon
          className={`h-[18px] w-[18px] shrink-0 ${
            active ? "text-action" : "text-muted-foreground"
          }`}
        />
        <span
          className={`min-w-0 flex-1 truncate ${FADE} ${
            active ? "text-foreground" : "text-muted-foreground"
          } ${isCollapsed ? "opacity-0" : "opacity-100"}`}
        >
          {item.label}
        </span>
      </Link>
    );

    // Expanded shows the label inline - no tooltip. Collapsed swaps the native
    // title (unstyled box) for a styled droplet Tooltip anchored to the right.
    if (!isCollapsed) return <div key={item.href}>{link}</div>;
    return (
      <Tooltip key={item.href}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  };

  const nav = (
    <TooltipProvider delayDuration={0}>
    <nav className="flex-1 space-y-5 overflow-y-auto overflow-x-hidden px-2 pt-2">
      {groups.map((group) => (
        <div key={group.label} className="space-y-0.5">
          {variant === "fixed" ? (
            // Fixed slot: title and collapsed-dot cross-fade in place, so the
            // header never changes height and the items below never shift.
            <div className="relative h-6">
              <p
                className={`absolute inset-0 flex items-center px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground ${FADE} ${
                  isCollapsed ? "opacity-0" : "opacity-100"
                }`}
              >
                {group.label}
              </p>
              <div
                aria-hidden
                className={`absolute inset-0 flex items-center justify-center ${FADE} ${
                  isCollapsed ? "opacity-100" : "opacity-0"
                }`}
              >
                <div className="h-1 w-1 rounded-full bg-muted-foreground/40" />
              </div>
            </div>
          ) : (
            <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {group.label}
            </p>
          )}
          {group.items.map(renderItem)}
        </div>
      ))}
    </nav>
    </TooltipProvider>
  );

  if (variant === "drawer") {
    return (
      <div className="flex h-full flex-col bg-muted">
        <div className="flex h-12 items-center px-4">
          <Link href="/dashboard" aria-label="GTM home" onClick={onNavigate}>
            <DynamicLogo
              width={104}
              height={20}
              wordmarkOnly
              className="text-foreground dark:text-white"
            />
          </Link>
        </div>
        {nav}
      </div>
    );
  }

  return (
    <aside
      className={`fixed z-40 flex h-full flex-col overflow-hidden bg-muted transition-[width] duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[width] motion-reduce:transition-none ${
        isCollapsed ? "w-12" : "w-60"
      } ${className}`}
    >
      {/* mt-[7px] = 6px canvas gap + 1px card border, so the logo row shares
          the top bar's centerline. The mark stays anchored at px-4/left. */}
      <div className="mt-[7px] flex h-12 shrink-0 items-center px-4">
        <Link
          href="/dashboard"
          aria-label="GTM home"
          className="relative inline-flex h-5 items-center"
        >
          <DynamicLogo
            width={22}
            height={22}
            markOnly
            className={`${FADE} ${isCollapsed ? "opacity-100" : "opacity-0"}`}
          />
          <span
            className={`absolute left-0 ${FADE} ${
              isCollapsed ? "opacity-0" : "opacity-100"
            }`}
          >
            <DynamicLogo
              width={104}
              height={20}
              wordmarkOnly
              className="text-foreground dark:text-white"
            />
          </span>
        </Link>
      </div>
      {nav}
    </aside>
  );
}
