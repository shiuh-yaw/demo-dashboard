/**
 * Operator UI preference cookies. Read server-side to set the initial shell
 * state (sidebar width, theme) so there is no flash; written client-side by
 * the shell controls. Operator-only - the public surface never reads these.
 */

export const SIDEBAR_COOKIE = "gtm-sidebar-collapsed";
export const THEME_COOKIE = "gtm-operator-theme";

/** User theme choice; "auto" resolves to prefers-color-scheme on the client. */
export type OperatorTheme = "light" | "dark" | "auto";

export function parseTheme(raw: string | undefined): OperatorTheme {
  // Default to "auto" (follow the OS) when no explicit choice is stored, so a
  // first-time operator gets system light/dark; a previously chosen light/dark
  // in the cookie wins.
  return raw === "dark" || raw === "auto" || raw === "light" ? raw : "auto";
}

/**
 * First-run onboarding gate dismissal. Presence of this cookie means the
 * gate has already been shown (and skipped or completed) on this browser -
 * detection is per-browser, not per-user, by design (no schema change).
 * Set httpOnly server-side only, via `dismissOnboarding()`
 * (`lib/actions/onboarding.ts`) - never written client-side.
 */
export const ONBOARDING_SEEN_COOKIE = "onboarding_seen";

/** ~1 year, in seconds - long-lived so the gate does not re-show. */
export const ONBOARDING_SEEN_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Options for `cookies().set(ONBOARDING_SEEN_COOKIE, ..., ...)`. */
export const onboardingSeenCookieOptions = {
  maxAge: ONBOARDING_SEEN_COOKIE_MAX_AGE,
  httpOnly: true,
  // process.env.NODE_ENV is inlined by Next at build (client-safe); the
  // @/env wrapper must not be imported here - this module is bundled into
  // client components (top-bar, operator-shell) and would trip the
  // server-only env guard.
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

/**
 * True once the operator has dismissed onboarding on this browser. The
 * operator layout renders the welcome gate inline whenever this is false
 * (`app/(operator)/layout.tsx`) - a plain cookie check, no redirect.
 */
export function getOnboardingSeen(raw: string | undefined): boolean {
  return raw !== undefined;
}

/**
 * "Getting started" checklist dismissal (Phase 3) - the non-blocking
 * checklist rendered on the dashboard home, above the prospect list.
 * Presence of this cookie means the operator has closed the checklist on
 * this browser; same presence-based pattern as `ONBOARDING_SEEN_COOKIE`
 * (no schema change). Set httpOnly server-side only, via
 * `dismissChecklist()` (`lib/actions/onboarding.ts`) - never written
 * client-side. Independent of `ONBOARDING_SEEN_COOKIE`: the checklist also
 * auto-hides once every item is complete, with no cookie involved in that
 * case.
 */
export const ONBOARDING_CHECKLIST_COOKIE = "onboarding_checklist_dismissed";

/** ~1 year, in seconds - long-lived so a dismissed checklist stays dismissed. */
export const ONBOARDING_CHECKLIST_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Options for `cookies().set(ONBOARDING_CHECKLIST_COOKIE, ..., ...)`. */
export const onboardingChecklistCookieOptions = {
  maxAge: ONBOARDING_CHECKLIST_COOKIE_MAX_AGE,
  httpOnly: true,
  // process.env.NODE_ENV is inlined by Next at build (client-safe); the
  // @/env wrapper must not be imported here - see the note above.
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

/** True once the operator has dismissed the checklist on this browser. */
export function getChecklistDismissed(raw: string | undefined): boolean {
  return raw !== undefined;
}
