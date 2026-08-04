"use client";

/**
 * Always-mounted identity bridge - calls `useIdentify` (fires the
 * `authenticated` milestone). Flow is multi-scenario (checkout/deposit/
 * kyc-deposit/withdraw, each its own route), so unlike a single-screen
 * container there is no one component mounted across the whole session -
 * this bridge lives in `app/layout.tsx` (inside `<GtmTracker>`) so identity
 * fires on a verified session regardless of which scenario the user is on.
 * Renders nothing.
 */

import { useIdentify } from "@dynamic-demos/analytics";
import { useAuthenticatedUser } from "@/hooks/use-authenticated-user";
import { useClientInitialized } from "@/hooks/use-client-initialized";

export function IdentityBridge() {
  const isClientReady = useClientInitialized();
  const user = useAuthenticatedUser();
  useIdentify(isClientReady ? user : null);
  return null;
}
