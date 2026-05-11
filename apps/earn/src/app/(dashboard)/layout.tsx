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

import { redirect } from "next/navigation";
import { Header } from "@/components/header";
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
  // passes through. We redirect to `/login?sessionExpired=1` so that
  // path executes inside middleware (a Route Handler-equivalent
  // context) instead of trying to mutate cookies here — Next.js
  // disallows cookie writes inside Server Components.
  if (!user) {
    redirect("/login?sessionExpired=1");
  }

  return (
    <PayoutDemoProvider>
      <CreatorBalanceProvider>
        <div className="min-h-screen bg-earn-light flex flex-col">
          <Header user={user} />
          <div className="flex flex-1 pt-14">
            <main className="flex-1">{children}</main>
          </div>
        </div>
      </CreatorBalanceProvider>
    </PayoutDemoProvider>
  );
}
