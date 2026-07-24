/**
 * Onboarding gate (Phase 2). Two skippable screens shown once per browser on
 * first run - see `shouldRedirectToOnboarding` (`lib/operator-prefs.ts`) and
 * the redirect in `app/(operator)/layout.tsx`. Nothing here is required:
 * "Skip for now" on either screen dismisses the gate immediately. Reachable
 * directly at any time (e.g. a returning user can revisit it).
 */

import { requireUser } from "@/lib/auth/gtm";
import { WelcomeGate } from "./components/welcome-gate";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const user = await requireUser();

  return (
    <WelcomeGate
      displayName={user.displayName}
      schedulingUrl={user.schedulingUrl}
    />
  );
}
