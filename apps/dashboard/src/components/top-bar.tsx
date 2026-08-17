import {
  Menu,
  Sun,
  Moon,
  Monitor,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import AuthMenu from "./auth-menu";
import { TeamSwitcher } from "./team-switcher";
import { Breadcrumbs } from "./breadcrumbs";
import { GettingStartedPopover } from "./getting-started-popover";
import { InboundBadge } from "./inbound-badge";
import { TooltipProvider } from "@/components/droplet-client";
import type { OperatorTheme } from "@/lib/operator-prefs";

/**
 * Top bar - the pinned first row inside the operator content card. Far left is
 * the sidebar collapse toggle (desktop), then the team switcher and a route
 * breadcrumb; right region carries the "Getting started" checklist popover,
 * the theme toggle, and the account menu. Hairline bottom rule inset from the
 * card edges; only the outlet below scrolls.
 */

interface TopBarProps {
  user: {
    sub: string;
    email?: string;
  } | null;
  teams: { id: string; name: string }[];
  isAdmin: boolean;
  activeCtx: string;
  onOpenNav?: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  theme?: OperatorTheme;
  onCycleTheme?: () => void;
}

const THEME_META: Record<OperatorTheme, { Icon: typeof Sun; label: string }> = {
  light: { Icon: Sun, label: "Theme: light" },
  dark: { Icon: Moon, label: "Theme: dark" },
  auto: { Icon: Monitor, label: "Theme: auto" },
};

export function TopBar({
  user,
  teams,
  isAdmin,
  activeCtx,
  onOpenNav,
  collapsed = false,
  onToggleCollapsed,
  theme = "light",
  onCycleTheme,
}: TopBarProps) {
  const ThemeIcon = THEME_META[theme].Icon;
  const CollapseIcon = collapsed ? PanelLeftOpen : PanelLeftClose;
  const collapseLabel = collapsed ? "Expand sidebar" : "Collapse sidebar";
  return (
    <TooltipProvider delayDuration={0}>
    <header className="relative flex h-12 shrink-0 items-center gap-2 pl-3 pr-3.5 after:absolute after:inset-x-3.5 after:bottom-0 after:border-b after:border-border-divider">
      {onOpenNav && (
        <button
          type="button"
          onClick={onOpenNav}
          aria-label="Open navigation"
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>
      )}
      {onToggleCollapsed && (
        <>
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapseLabel}
            className="hidden size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground lg:inline-flex"
          >
            <CollapseIcon className="h-4 w-4" />
          </button>
          <div className="hidden h-4 w-px shrink-0 bg-border-divider lg:block" />
        </>
      )}
      <div className="flex min-w-0 items-center gap-2">
        <TeamSwitcher teams={teams} isAdmin={isAdmin} activeCtx={activeCtx} />
        <div className="hidden h-4 border-l border-border-divider sm:block" />
        <div className="hidden min-w-0 sm:block">
          <Breadcrumbs />
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        {onCycleTheme && (
          <button
            type="button"
            onClick={onCycleTheme}
            aria-label={THEME_META[theme].label}
            title={THEME_META[theme].label}
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
          >
            <ThemeIcon className="h-4 w-4" />
          </button>
        )}
        <InboundBadge />
        <GettingStartedPopover />
        <div className="h-4 border-l border-border-divider" />
        <AuthMenu user={user} />
      </div>
    </header>
    </TooltipProvider>
  );
}
