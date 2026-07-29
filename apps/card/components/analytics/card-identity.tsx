"use client";

/**
 * Always-mounted analytics bridge for the auth milestones. The card app is
 * multi-page (`/` login -> `/apply` -> `/card`), so unlike wallet's single
 * `WalletApp` container there is no one screen mounted across the whole
 * session. This component lives in `app/layout.tsx` (inside both `Providers`
 * - for `useUser` - and `GtmTracker` - for `useTrack`) so `signed_in` and
 * `authenticated` fire on auth success regardless of which page the user is
 * on. Renders nothing.
 */

import { useEffect, useRef } from "react";
import { useUser } from "@dynamic-labs-sdk/react-hooks";

import { useMilestoneOnce } from "@/hooks/use-milestone-once";
import { useTrack, resolveUserIdentity } from "@dynamic-demos/analytics";

export function CardIdentity() {
  const { data: user, isPlaceholderData } = useUser();
  const milestoneOnce = useMilestoneOnce();
  const { milestone } = useTrack();

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

  // `authenticated` - carries the person-level join keys (Dynamic user id
  // always, verified email when present). Fired once per page LOAD (guarded
  // by this mount-scoped ref), NOT deduped across reloads via sessionStorage:
  // an already-logged-in user who reloads must still (re)resolve and send the
  // identity, and a returning session's user hydrates after mount - a
  // sessionStorage dedupe would let a stale/early fire permanently suppress
  // the email for the rest of the tab. `settledUser` gating ensures the email
  // is present when we fire; the ref stops duplicate fires within one load.
  const authFiredRef = useRef(false);
  useEffect(() => {
    if (authFiredRef.current) return;
    const identity = resolveUserIdentity(settledUser);
    if (!identity) return;
    authFiredRef.current = true;
    milestone("authenticated", {
      dynamicUserId: identity.dynamicUserId,
      ...(identity.email ? { email: identity.email } : {}),
    });
  }, [settledUser, milestone]);

  return null;
}
