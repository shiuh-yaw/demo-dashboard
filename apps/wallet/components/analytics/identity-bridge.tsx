"use client";

/**
 * Always-mounted identity bridge - calls `useIdentify` (fires the
 * `authenticated` milestone). Lives in `app/layout.tsx` (inside
 * `<GtmTracker>`) so identity fires on auth success regardless of which
 * screen `WalletApp` is currently rendering. Renders nothing.
 */

import { useIdentify } from "@dynamic-demos/analytics";
import { useAuth } from "@/hooks/use-auth";
import { useAuthenticatedIdentity } from "@/hooks/use-authenticated-identity";
import { useClientInitialized } from "@/hooks/use-client-initialized";

export function IdentityBridge() {
  const isClientReady = useClientInitialized();
  const isLoggedIn = useAuth();
  const identity = useAuthenticatedIdentity();

  // Gate on `isClientReady` + `isLoggedIn` so the fully-restored user (with
  // email) is read before the hook's one-shot fire; `identity` is already
  // resolved via `getAuthenticatedIdentity` (which uses the shared
  // `resolveUserEmail`), so it's re-shaped to the hook's `DynamicIdentityUser`
  // input here.
  useIdentify(
    isClientReady && isLoggedIn && identity
      ? { id: identity.dynamicUserId, email: identity.email ?? undefined }
      : null,
  );

  return null;
}
