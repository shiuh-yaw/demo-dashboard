"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Copy, Check } from "lucide-react";
import { Button } from "@dynamic-demos/ui";
import { AppLogo } from "@/components/ui/app-logo";
import { useRemittanceConfig } from "@/contexts/remittance-config-context";
import { useLogout } from "@/hooks/use-mutations";
import { useCopyFeedback } from "@/hooks/use-copy-feedback";
import { truncateAddress } from "@dynamic-demos/utils";
import { getAppNavItems } from "@/lib/nav-items";

interface DashboardHeaderProps {
  navItems?: readonly { href: string; label: string }[];
  walletAddress?: string;
  brandHref?: string;
  brandLabel?: string;
}

export function DashboardHeader({
  navItems: navItemsProp,
  walletAddress,
  brandHref,
  brandLabel = "Remittance",
}: DashboardHeaderProps) {
  const pathname = usePathname();
  const configMatch = pathname.match(/^\/r\/([^/]+)/);
  const basePath = configMatch ? `/r/${configMatch[1]}` : "";
  const navItems = navItemsProp ?? getAppNavItems(basePath);
  const logoutMutation = useLogout();
  const { copied, copy } = useCopyFeedback();
  const { branding } = useRemittanceConfig();

  return (
    <header className="border-b border-(--widget-border) bg-(--widget-bg)/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <AppLogo
              className="h-7 w-auto text-(--widget-fg)"
              logoUrl={branding.logoUrl}
            />
            {brandHref ? (
              <Link
                href={brandHref}
                className="text-sm font-medium text-(--widget-muted) hover:text-(--widget-primary) transition-colors"
              >
                {brandLabel}
              </Link>
            ) : (
              <span className="text-sm font-medium text-(--widget-muted)">
                {brandLabel}
              </span>
            )}
          </div>

          {/* Nav links — hidden on small screens */}
          <nav className="hidden sm:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    isActive
                      ? "bg-(--widget-primary)/10 text-(--widget-primary) font-medium cursor-pointer"
                      : "text-(--widget-muted) hover:text-(--widget-fg) hover:bg-(--widget-row-hover) cursor-pointer"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right: address pill + sign out */}
          <div className="flex items-center gap-3">
            {walletAddress && (
              <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-(--widget-row-bg) text-(--widget-muted) border border-(--widget-border)">
                <span>{truncateAddress(walletAddress)}</span>
                <button
                  onClick={() => copy(walletAddress)}
                  className="p-0.5 rounded hover:bg-(--widget-row-hover) text-(--widget-muted) hover:text-(--widget-fg) transition-colors cursor-pointer"
                  aria-label="Copy address"
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-(--widget-success)" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              danger
              onClick={() =>
                logoutMutation.mutateAsync().then(() => {
                  window.location.href = "/login";
                })
              }
              loading={logoutMutation.isPending}
            >
              {!logoutMutation.isPending && <LogOut className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
