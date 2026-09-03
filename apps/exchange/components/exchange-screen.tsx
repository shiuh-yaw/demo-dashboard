"use client";

/**
 * The exchange app frame, gated on a live session. Every post-sign-in route
 * renders inside it. A lost device or a signed-out session goes back to the
 * scenario page, which is also the sign-in surface.
 */

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SiteHeader } from "@dynamic-demos/ui";
import { useBackend } from "@/lib/backend";
import { useSession } from "@/lib/session/store";
import { useExchangeConfig } from "@/contexts/exchange-config-context";
import { Wordmark } from "@/components/wordmark";
import { Badge, Spinner } from "@/components/primitives";
import { PresenterRail } from "@/components/presenter-rail";
import { DEMO_MODE } from "@/lib/mode";

const NAV = [
  { href: "/portfolio", label: "Portfolio" },
  { href: "/markets", label: "Markets" },
  { href: "/earn", label: "Earn" },
  { href: "/activity", label: "Activity" },
] as const;

export function ExchangeScreen({ children }: { children: ReactNode }) {
  const { state, hydrated } = useSession();
  const backend = useBackend();
  const router = useRouter();
  const ok = hydrated && backend.ready && backend.sessionActive && !!state.person && !!state.wallet && !state.deviceLost;

  useEffect(() => {
    if (hydrated && backend.ready && !ok) router.replace("/");
  }, [hydrated, backend.ready, ok, router]);

  if (!ok) {
    return (
      <div className="min-h-dvh grid place-items-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className={`min-h-dvh flex flex-col bg-ground ${state.presenter ? "lg:pr-[380px]" : ""}`}>
      <Header />
      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-6 sm:py-8 flex-1">{children}</main>
      <footer className="px-6 py-3 text-[11px] text-muted flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line">
        <span className="font-semibold text-ink-2">Confidential — Not for onward distribution</span>
        <span>Exchange is a fictional client</span>
        <span>Testnet only · {DEMO_MODE === "live" ? "Ethereum Sepolia" : "Staged simulation"}</span>
        <span className="ml-auto">
          Press <kbd className="px-1 rounded border border-line bg-card">P</kbd> for presenter
        </span>
      </footer>
      <PresenterRail />
    </div>
  );
}

function Nav({ onDark = false }: { onDark?: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1">
      {NAV.map((n) => {
        const active = pathname?.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            className={`h-9 px-3.5 rounded-lg text-[14px] font-medium transition-colors ${
              active ? (onDark ? "bg-white/10 text-white" : "bg-ground text-ink") : onDark ? "text-white/70 hover:bg-white/10" : "text-ink-2 hover:bg-ground"
            }`}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}

function AccountChip() {
  const { state } = useSession();
  const backend = useBackend();
  const person = state.person!;
  return (
    <div className="flex items-center gap-3">
      {state.device === "B" && <Badge tone="info">New device</Badge>}
      {backend.busy && (
        <span className="hidden sm:inline-flex items-center gap-2 text-[13px] text-muted" aria-live="polite">
          <Spinner className="h-3.5 w-3.5" />
          {backend.busy}
        </span>
      )}
      <div className="flex items-center gap-2.5">
        <span className="h-8 w-8 rounded-full bg-brand-2 text-brand grid place-items-center text-[12px] font-bold">{person.initials}</span>
        <div className="hidden sm:block leading-tight text-left">
          <div className="text-[13px] font-semibold text-ink">{person.name}</div>
          <div className="text-[11px] text-muted">{person.email}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Earn's merged-header rule: unbranded, the shared SiteHeader IS the app bar
 * (Demos / Exchange crumb, nav in the centre slot, the account in the trailing
 * slot). Branded (?theme=) - or the presenter's immersive switch - drops the
 * Dynamic chrome and keeps the exchange's own bar.
 */
function Header() {
  const { isBranded } = useExchangeConfig();
  const { state } = useSession();
  const siteChrome = !isBranded && !state.immersive;

  if (siteChrome) {
    return (
      <div className="relative z-20 shrink-0">
        <SiteHeader chip="Exchange" fullWidth center={<Nav />} trailing={<AccountChip />} />
      </div>
    );
  }
  return (
    <header className="sticky top-0 z-30 bg-card/90 backdrop-blur border-b border-line">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center gap-6">
        <Link href="/portfolio" aria-label="Home">
          <Wordmark small />
        </Link>
        <div className="hidden md:block">
          <Nav />
        </div>
        <div className="ml-auto">
          <AccountChip />
        </div>
      </div>
      <div className="md:hidden border-t border-line px-2">
        <Nav />
      </div>
    </header>
  );
}
