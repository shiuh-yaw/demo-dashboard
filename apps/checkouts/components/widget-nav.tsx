"use client";

/**
 * Widget Navigation Component
 *
 * A minimal, pill-style navigation bar for switching between widget views.
 * Positioned fixed at the bottom of the viewport for easy access.
 *
 * ## Design
 *
 * - Inset pill appearance with subtle shadow
 * - Active state indicated by light background
 * - Uses widget theme CSS variables for colors
 *
 * ## Extensibility
 *
 * Navigation items are configurable via the `items` prop.
 * Default items: Deposit (main widget) and Wallet (embedded wallet).
 *
 * @example
 * ```tsx
 * // Default navigation
 * <WidgetNav widgetId="abc123" />
 *
 * // Custom navigation items
 * <WidgetNav
 *   widgetId="abc123"
 *   items={[
 *     { label: "Deposit", path: "" },
 *     { label: "Wallet", path: "/wallet" },
 *     { label: "History", path: "/history" },
 *   ]}
 * />
 * ```
 */

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@dynamic-demos/utils";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Navigation item configuration.
 * Defines a single tab in the widget navigation.
 */
export interface NavItem {
  /** Display label shown in the navigation */
  label: string;
  /** URL path relative to widget base (e.g., "" for main, "/wallet" for wallet) */
  path: string;
}

/**
 * Default navigation items for embedded wallet-enabled widgets.
 * - Deposit: Main widget view at `/w/[id]`
 * - Wallet: Embedded wallet view at `/w/[id]/wallet`
 */
export const DEFAULT_NAV_ITEMS: NavItem[] = [
  { label: "Deposit", path: "" },
  { label: "Wallet", path: "/wallet" },
];

interface WidgetNavProps {
  /** Widget ID for building navigation URLs */
  widgetId: string;
  /** Custom navigation items (defaults to Deposit/Wallet) */
  items?: NavItem[];
}

// =============================================================================
// COMPONENT
// =============================================================================
export default function WidgetNav({
  widgetId,
  items = DEFAULT_NAV_ITEMS,
}: WidgetNavProps) {
  const pathname = usePathname();
  const basePath = `/w/${widgetId}`;

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div
        className={cn(
          "flex items-center gap-0.5 rounded-lg p-0.5",
          "bg-black/4 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]",
        )}
      >
        {items.map((item) => {
          const href = `${basePath}${item.path}`;
          const isActive =
            item.path === ""
              ? pathname === basePath
              : pathname.endsWith(item.path);

          return (
            <Link
              key={item.path}
              href={href}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs transition-all",
                isActive
                  ? "bg-white/60 text-(--brand-muted) font-medium"
                  : "text-(--brand-muted)/60 hover:text-(--brand-muted)",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
