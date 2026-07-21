/**
 * Dashboard Layout
 *
 * Layout for authenticated dashboard pages on the default (no-config)
 * route. Theme + branding come from the root layout's
 * `EarnConfigProvider` (hydrated with `null`, falling back to package
 * defaults). PayoutDemoProvider gives SE demo state (localStorage, reset
 * from user menu). CreatorBalanceProvider shares Total balance with Add
 * funds (same logic).
 */

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SiteFooter, SiteHeader } from "@dynamic-demos/ui";
import { Header } from "@/components/header";
import { UserMenu } from "@/components/user-menu";
import { PayoutDemoProvider } from "@/contexts/payout-demo-context";
import { CreatorBalanceProvider } from "@/contexts/creator-balance-context";
import { getCurrentUser } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // If user is null the JWT failed verification (expired / invalid). The
  // middleware's auth gate only checks cookie *presence*, so leaving the
  // bad cookie in place would loop: /earn → layout redirects to /login
  // → middleware redirects to /earn (authed user on /login →
  // defaultReturnPath) → repeat.
  //
  // The middleware factory has a built-in escape hatch: visiting any
  // public route with `?sessionExpired=1` clears the auth cookie and
  // passes through. We redirect to `/?sessionExpired=1` (the scenario
  // front door is the login surface) so that path executes inside
  // middleware (a Route Handler-equivalent context) instead of trying
  // to mutate cookies here — Next.js disallows cookie writes inside
  // Server Components.
  if (!user) {
    redirect("/?sessionExpired=1");
  }

  // Unbranded: ONE merged bar - the shared SiteHeader in its full-width
  // variant with earn's user panel in the trailing slot (no second app
  // header, no doubled Dynamic logo); the marketing CTAs the trailing
  // slot displaces move to the shared SiteFooter (`showCtas`). Branded
  // (?theme=): the Dynamic chrome disappears entirely - earn's own
  // Header carries the brand.
  const headersList = await headers();
  const hasSiteChrome = !headersList.get("x-earn-config-id");

  return (
    <PayoutDemoProvider>
      <CreatorBalanceProvider>
        <div className="min-h-screen bg-earn-light flex flex-col">
          {hasSiteChrome ? (
            <SiteHeader
              homeHref="https://dynamic.dev"
              chip="Earn"
              fullWidth
              trailing={<UserMenu user={user} />}
            />
          ) : (
            <Header user={user} />
          )}
          <div className="flex flex-1">
            <main className="flex-1">{children}</main>
          </div>
          {/* Footer renders on branded views too - unlike the header,
              the Dynamic footer stays under every theme (same as the
              scenario page, which always passes SiteFooter). The
              marketing CTAs do NOT: a branded demo never advertises
              "Get a free account" (Book a call stays reachable via the
              user menu). */}
          <SiteFooter fullWidth showCtas={hasSiteChrome} />
        </div>
      </CreatorBalanceProvider>
    </PayoutDemoProvider>
  );
}
