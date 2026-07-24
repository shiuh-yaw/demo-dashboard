"use server";

/**
 * Onboarding gate dismissal (Phase 1). Sets a long-lived, httpOnly cookie so
 * the welcome/profile gate never re-shows on this browser once dismissed -
 * no DB write, no schema change. Called by both "Continue" and "Skip" on
 * both gate screens (the gate route itself lands in a later phase).
 */

import { cookies } from "next/headers";

import { getSessionUser } from "@/lib/auth/gtm";
import { canCreateRecord } from "@/lib/auth/policy";
import { services } from "@/lib/services";
import { getAllProspectProfiles } from "@/lib/actions/prospects";
import {
  ONBOARDING_SEEN_COOKIE,
  ONBOARDING_CHECKLIST_COOKIE,
  onboardingSeenCookieOptions,
  onboardingChecklistCookieOptions,
  getChecklistDismissed,
} from "@/lib/operator-prefs";

/** Mark onboarding as seen on this browser. */
export async function dismissOnboarding(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(
    ONBOARDING_SEEN_COOKIE,
    "true",
    onboardingSeenCookieOptions,
  );
}

/**
 * Dismiss the "Getting started" checklist on the dashboard home (Phase 3).
 * Long-lived, httpOnly cookie - no DB write, no schema change. Independent
 * of `dismissOnboarding()` above (separate cookie, separate surface).
 */
export async function dismissChecklist(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(
    ONBOARDING_CHECKLIST_COOKIE,
    "true",
    onboardingChecklistCookieOptions,
  );
}

/** Data the top-bar "Getting started" popover needs to render itself. */
export interface GettingStartedState {
  profileComplete: boolean;
  hasProspect: boolean;
  hasDemo: boolean;
  hasShare: boolean;
  dismissed: boolean;
  /** Gates whether the "prospect" item opens `NewProspectDialog` directly. */
  canCreateProspect: boolean;
  /** Deep-link target for the "demo" / "share" items. */
  demoHref: string;
}

/**
 * Lazy data source for the "Getting started" checklist (Phase 7 relayout):
 * unlike the dashboard-home card it replaces, the top bar renders on every
 * operator page, so this is never computed eagerly during a page's server
 * render - the popover's client component calls this itself (via TanStack
 * Query) only once it mounts. Same inputs as the old `OverviewPage`
 * computation (prospect profiles already fetched for other purposes + the
 * bounded share-link count), just relocated behind an action so any page can
 * ask for it cheaply.
 */
export async function getGettingStartedState(): Promise<GettingStartedState> {
  const user = await getSessionUser();
  if (!user) {
    // No session to report on - dismissed:true keeps the icon hidden rather
    // than rendering a checklist for a signed-out request.
    return {
      profileComplete: false,
      hasProspect: false,
      hasDemo: false,
      hasShare: false,
      dismissed: true,
      canCreateProspect: false,
      demoHref: "/dashboard/prospects",
    };
  }

  const cookieStore = await cookies();
  const dismissed = getChecklistDismissed(
    cookieStore.get(ONBOARDING_CHECKLIST_COOKIE)?.value,
  );

  const [{ profiles }, shareLinkCount] = await Promise.all([
    getAllProspectProfiles(),
    // Bounded count, not a list - see `ShareLinkService.countByUser`.
    services.shareLinks.countByUser(user.id),
  ]);

  const demoCounts = profiles.items.map(
    (p) => Object.values(p.demos).filter(Boolean).length,
  );
  const hasDemo = demoCounts.some((count) => count > 0);

  // Deep-link target for "add a demo" / "share a demo": the first prospect
  // that already has a demo, falling back to the first prospect at all, or
  // the prospect list when there isn't one yet to link to directly.
  const demoProspectId =
    profiles.items.find((_, i) => demoCounts[i] > 0)?.id ??
    profiles.items[0]?.id;
  const demoHref = demoProspectId
    ? `/dashboard/prospects/${demoProspectId}/demos`
    : "/dashboard/prospects";

  return {
    profileComplete: Boolean(user.displayName && user.schedulingUrl),
    hasProspect: profiles.items.length > 0,
    hasDemo,
    hasShare: shareLinkCount > 0,
    dismissed,
    canCreateProspect: canCreateRecord(user),
    demoHref,
  };
}
