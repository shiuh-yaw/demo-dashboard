import { redirect } from "next/navigation";
import Providers from "@/lib/providers";
import { isDashboardAuthenticated } from "@/lib/auth/session";
import { getSessionUser, GTM_DENIED_PATH } from "@/lib/auth/gtm";
import { cookies } from "next/headers";
import DashboardLoginForm from "@/components/login-form";
import { BrandGateLayout } from "@/components/brand-gate-layout";
import { WelcomeGate } from "@/components/welcome-gate";
import { OperatorShell } from "@/components/operator-shell";
import { Toaster } from "@/components/droplet-client";
import { getScopeContext } from "@/lib/actions/scope";
import {
  ONBOARDING_SEEN_COOKIE,
  SIDEBAR_COOKIE,
  THEME_COOKIE,
  getOnboardingSeen,
  parseTheme,
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

  const [scope, cookieStore] = await Promise.all([
    getScopeContext(),
    cookies(),
  ]);

  // First-run onboarding gate - a pure cookie check. Cookie absent (or unset)
  // means this browser has not seen onboarding, so render the welcome gate
  // inline, full-screen, outside the operator shell. Rendering inline instead
  // of redirecting to a separate route means there is no cross-route
  // transition - nothing to loop and no dashboard skeleton to flash. The gate
  // dismisses itself by setting the cookie (`dismissOnboarding`), after which
  // this check falls through to the shell.
  if (!getOnboardingSeen(cookieStore.get(ONBOARDING_SEEN_COOKIE)?.value)) {
    return (
      <Providers>
        <BrandGateLayout>
          <WelcomeGate
            displayName={user.displayName}
            schedulingUrl={user.schedulingUrl}
          />
        </BrandGateLayout>
        <Toaster />
      </Providers>
    );
  }

  const collapsed = cookieStore.get(SIDEBAR_COOKIE)?.value === "true";
  const theme = parseTheme(cookieStore.get(THEME_COOKIE)?.value);

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
