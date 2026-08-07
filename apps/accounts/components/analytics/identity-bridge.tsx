"use client";

/**
 * Always-mounted identity bridge - calls `useIdentify`, which fires the
 * `authenticated` milestone. Lives in `app/layout.tsx` inside `<GtmTracker>`
 * so identity fires on auth success regardless of which screen the widget is
 * on. Renders nothing.
 */

import { useIdentify } from "@dynamic-demos/analytics";
import { useAuth } from "@/hooks/use-auth";
import { useAuthenticatedIdentity } from "@/hooks/use-authenticated-identity";
import { useClientInitialized } from "@/hooks/use-client-initialized";

export function IdentityBridge() {
  const isClientReady = useClientInitialized();
  const isLoggedIn = useAuth();
  const identity = useAuthenticatedIdentity();

  // Gated on `isClientReady` + `isLoggedIn` so the fully-restored user (with
  // email) is read before the hook's one-shot fire.
  useIdentify(
    isClientReady && isLoggedIn && identity
      ? { id: identity.dynamicUserId, email: identity.email ?? undefined }
      : null,
  );

  return null;
}
