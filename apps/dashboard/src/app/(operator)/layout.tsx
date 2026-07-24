import { redirect } from "next/navigation";
import Providers from "@/lib/providers";
import { isDashboardAuthenticated } from "@/lib/auth/session";
import { getSessionUser, GTM_DENIED_PATH } from "@/lib/auth/gtm";
import { cookies, headers } from "next/headers";
import DashboardLoginForm from "@/components/login-form";
import { BrandGateLayout } from "@/components/brand-gate-layout";
import { OperatorShell } from "@/components/operator-shell";
import { Toaster } from "@/components/droplet-client";
import { getScopeContext } from "@/lib/actions/scope";
import {
  ONBOARDING_SEEN_COOKIE,
  SIDEBAR_COOKIE,
  THEME_COOKIE,
  parseTheme,
  shouldRedirectToOnboarding,
} from "@/lib/operator-prefs";

interface OperatorLayoutProps {
  children: React.ReactNode;
}

/**
 * Operator Layout
 *
 * Auth boundary for the operator UI. No Dynamic session -> login form. A
 * valid session that is off-domain, deactivated, or otherwise not allowlisted
 * -> the denied page (the allowlist thus applies to every operator URL).
 * Only an allowlisted `User` reaches the app. Nav is cosmetic; every mutation
 * re-checks server-side.
 */
export default async function OperatorLayout({
  children,
}: OperatorLayoutProps) {
  const hasSession = await isDashboardAuthenticated();

  if (!hasSession) {
    return (
      <Providers>
        <BrandGateLayout backLink={{ href: "/", label: "Back to demos" }}>
          <DashboardLoginForm />
        </BrandGateLayout>
      </Providers>
    );
  }

  const user = await getSessionUser();
  if (!user) redirect(GTM_DENIED_PATH);

  const [scope, cookieStore, requestHeaders] = await Promise.all([
    getScopeContext(),
    cookies(),
    headers(),
  ]);
  const collapsed = cookieStore.get(SIDEBAR_COOKIE)?.value === "true";
  const theme = parseTheme(cookieStore.get(THEME_COOKIE)?.value);

  // First-run gate (Phase 2): a not-yet-onboarded browser (cookie absent) is
  // sent to the welcome route before it reaches anything else, unless it's
  // already headed there (avoids a redirect loop). `x-pathname` is set by
  // `middleware.ts` for every operator route.
  if (
    shouldRedirectToOnboarding(
      cookieStore.get(ONBOARDING_SEEN_COOKIE)?.value,
      requestHeaders.get("x-pathname"),
    )
  ) {
    redirect("/dashboard/welcome");
  }

  // The onboarding gate owns the full screen: render it outside the operator
  // shell (no sidebar / top bar), while the auth + allowlist checks above
  // still apply. Its own chrome lives in `dashboard/welcome/layout.tsx`.
  if (requestHeaders.get("x-pathname") === "/dashboard/welcome") {
    return (
      <Providers>
        <div data-surface="operator">{children}</div>
        <Toaster />
      </Providers>
    );
  }

  return (
    <Providers>
      <OperatorShell
        role={user.role}
        user={{ sub: user.dynamicUserId ?? user.id, email: user.email }}
        teams={scope.teams}
        isAdmin={scope.isAdmin}
        activeCtx={scope.activeCtx}
        initialCollapsed={collapsed}
        initialTheme={theme}
      >
        {children}
      </OperatorShell>
      <Toaster />
    </Providers>
  );
}
