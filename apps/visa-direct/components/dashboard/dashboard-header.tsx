"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@dynamic-demos/ui";
import { useLogout } from "@/hooks/use-mutations";
import { useVisaDirectConfig } from "@/contexts/visa-direct-config-context";
import { AppLogo } from "@/components/ui/app-logo";

const NAV_LINKS = [
  { href: "/payment-methods", label: "Payout methods" },
  { href: "/wallet", label: "My wallet" },
  { href: "/transactions", label: "Transactions" },
] as const;

/**
 * Dashboard header for the Visa Direct demo.
 * Logo + optional banner come from config resolved at the root layout via
 * `?theme=` / cookie. Defaults to the Dynamic wordmark.
 */
export function DashboardHeader() {
  const logoutMutation = useLogout();
  const pathname = usePathname();
  const { branding } = useVisaDirectConfig();

  return (
    <div>
      {/* Demo banner */}
      {branding.bannerText && (
        <div className="px-4 py-2 text-xs font-medium text-amber-800 bg-amber-50 border-l-4 border-l-amber-500">
          {branding.bannerText}
        </div>
      )}

      {/* Main header */}
      <header className="border-b border-(--brand-border) bg-(--brand-bg)/95 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link
              href="/payment-methods"
              className="flex items-center hover:opacity-80 transition-opacity"
              aria-label="Home"
            >
              <AppLogo size={32} logoUrl={branding.logoUrl} />
            </Link>

            {/* Right: sign out */}
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
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>

          {/* Nav tabs */}
          <div className="flex items-center gap-1 -mb-px">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? "border-(--brand-primary) text-(--brand-primary)"
                      : "border-transparent text-(--brand-muted) hover:text-(--brand-fg) hover:border-(--brand-border)"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      </header>
    </div>
  );
}
