"use client";

/**
 * Always-mounted identity bridge - calls `useIdentify` (fires the
 * `authenticated` milestone). Lives in `app/layout.tsx` (inside
 * `<GtmTracker>`) so identity fires on auth success regardless of which
 * screen `DepositWidget` is currently rendering. Renders nothing.
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
