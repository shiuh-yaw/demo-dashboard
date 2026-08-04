"use client";

/**
 * `useIdentify(user)` - fleet-wide identity bridge: given a Dynamic user,
 * resolves person-level identity (Dynamic user id always, verified email
 * when present) and, exactly once per mount, fires BOTH the session-level
 * `identify()` call and the `authenticated` milestone (kept for the funnel's
 * existing authenticated/completed stages - do not remove). Extracted from
 * the fire-once patterns originally duplicated in `apps/wallet`
 * (`wallet-app.tsx`) and `apps/card` (`card-identity.tsx`) so every demo
 * emits identically.
 *
 * `useAuthenticatedMilestone` is kept as a deprecated alias (same function)
 * for existing callers - this package's exported name going forward is
 * `useIdentify`.
 *
 * Dynamic-agnostic by design: takes the already-resolved Dynamic user as an
 * argument. This package never imports a Dynamic SDK - callers read their own
 * user (via whatever Dynamic hook/context their app uses) and pass it in.
 *
 * Fires at most once per mount, as soon as `resolveUserIdentity` first
 * resolves a non-null identity. Not deduped via sessionStorage across
 * reloads: an already-logged-in user who reloads must still (re)resolve and
 * send the identity, since the SDK user can restore/hydrate after mount - a
 * sessionStorage dedupe would let a stale or early id-only read permanently
 * suppress the email for the rest of the tab. The mount-scoped ref is what
 * stops duplicate fires within one load. Callers that need the user to be
 * fully settled before the first resolve (e.g. waiting out placeholder/
 * loading data) should hold off passing a user until then.
 */

import { useEffect, useRef } from "react";
import { useTrack } from "./use-track";
import { resolveUserIdentity } from "./identity";
import type { DynamicIdentityUser } from "./identity";

export function useIdentify(
  user: DynamicIdentityUser | null | undefined,
): void {
  const { identify, milestone } = useTrack();
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    const identity = resolveUserIdentity(user);
    if (!identity) return;
    firedRef.current = true;
    identify(
      identity.dynamicUserId,
      identity.email ? { email: identity.email } : undefined,
    );
    milestone("authenticated", {
      dynamicUserId: identity.dynamicUserId,
      ...(identity.email ? { email: identity.email } : {}),
    });
  }, [user, identify, milestone]);
}

/** @deprecated - use `useIdentify`. Kept as an alias for existing callers. */
export const useAuthenticatedMilestone = useIdentify;
