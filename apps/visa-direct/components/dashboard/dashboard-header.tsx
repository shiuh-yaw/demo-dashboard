"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button, SiteHeader } from "@dynamic-demos/ui";
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
  const { branding, isBranded } = useVisaDirectConfig();

  const navTabs = (
    <nav className="flex items-center gap-0.5">
      {NAV_LINKS.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              isActive
                ? "bg-[#4779FF]/10 text-[#4779FF]"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );

  const signOut = (
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
  );

  return (
    <div>
      {branding.bannerText && (
        <div className="px-4 py-2 text-xs font-medium text-amber-800 bg-amber-50 border-l-4 border-l-amber-500">
          {branding.bannerText}
        </div>
      )}
      <SiteHeader
        // The demo's name, reading after the "Demos /" crumb. MTLco is the
        // onramp entity behind the payouts, not what this demo is called - it
        // stays in the API and env references only.
        chip="Liquidity"
        // Branded: drops the "Demos" crumb + chip so a prospect's product isn't
        // advertising the Dynamic demos catalog. This console has no hero to put
        // a ScenarioBrandRow in, so the header carries the brand instead.
        isBranded={isBranded}
        fullWidth
        center={navTabs}
        trailing={signOut}
        logo={branding.logoUrl ? <AppLogo size={32} logoUrl={branding.logoUrl} /> : undefined}
      />
    </div>
  );
}
