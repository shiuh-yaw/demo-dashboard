"use client";

/**
 * Always-mounted identity bridge - calls `useIdentify` (fires the
 * `authenticated` milestone). Earn is multi-page ((auth) login group ->
 * (dashboard) app group), so unlike a single-screen container there is no
 * one component mounted across the whole session - this bridge lives in
 * `app/layout.tsx` (alongside `<DynamicInit />`, inside `<GtmTracker>`) so
 * identity fires on auth success regardless of which page the user is on.
 * Renders nothing.
 */

import { useIdentify } from "@dynamic-demos/analytics";
import { useDynamicUser } from "@/hooks/use-dynamic-user";
import { useInitStatus } from "@/hooks/use-init-status";

export function IdentityBridge() {
  const initStatus = useInitStatus();
  const isClientReady =
    initStatus === "initialized" || initStatus === "failed";
  const user = useDynamicUser();
  useIdentify(isClientReady ? (user ?? null) : null);
  return null;
}
