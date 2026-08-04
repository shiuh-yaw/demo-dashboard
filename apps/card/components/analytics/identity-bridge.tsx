"use client";

/**
 * Always-mounted identity bridge for the auth milestones. The card app is
 * multi-page (`/` login -> `/apply` -> `/card`), so unlike wallet's single
 * `WalletApp` container there is no one screen mounted across the whole
 * session. This component lives in `app/layout.tsx` (inside both `Providers`
 * - for `useUser` - and `GtmTracker` - for `useTrack`) so `signed_in` and
 * `authenticated` fire on auth success regardless of which page the user is
 * on. Renders nothing.
 */

import { useEffect } from "react";
import { useUser } from "@dynamic-labs-sdk/react-hooks";

import { useMilestoneOnce } from "@/hooks/use-milestone-once";
import { useIdentify } from "@dynamic-demos/analytics";

export function IdentityBridge() {
  const { data: user, isPlaceholderData } = useUser();
  const milestoneOnce = useMilestoneOnce();

  // Wait for `useUser` to settle before reading identity. While
  // `isPlaceholderData` is true the hook may hand back a stale/half-hydrated
  // user (id present, email not yet) - notably on a returning already-logged-
  // in session, where the user hydrates in stages.
  const settledUser = isPlaceholderData ? undefined : user;

  // `signed_in` - fires once per tab session once a settled user exists. No
  // props: identity stays share-link-only, matching wallet's semantics.
  useEffect(() => {
    if (settledUser) milestoneOnce("signed_in");
  }, [settledUser, milestoneOnce]);

  // `authenticated` - shared fleet-wide primitive (@dynamic-demos/analytics).
  // `settledUser` gating ensures the email is present (not stale/half-
  // hydrated) when the hook's one-shot fire resolves identity off it.
  useIdentify(settledUser);

  return null;
}
