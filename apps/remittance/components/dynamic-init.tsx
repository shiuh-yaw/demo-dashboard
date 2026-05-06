"use client";

import { DynamicInit as PackageDynamicInit } from "@dynamic-demos/dynamic/init";
import {
  isSignedIn,
  getAuthToken,
  waitForClientInitialized,
  onEvent,
} from "@/lib/dynamic";
import { setDynamicJWT, clearAuthCookie } from "@/lib/auth/session";

/**
 * Initializes Dynamic SDK auth event listeners and syncs auth state to cookies.
 *
 * Auth mutations (useVerifyOTP, useCompleteSocialAuth, useJwtAuth) explicitly
 * await setDynamicJWT before navigating, so DynamicInit does NOT sync on
 * tokenChanged — that would trigger RSC cache invalidation mid-navigation,
 * causing redirect races between router.push and server-side redirect.
 *
 * DynamicInit handles:
 * - Returning users: sync existing token to cookie on init
 * - Logout: clear cookie
 */
export function DynamicInit() {
  return (
    <PackageDynamicInit
      client={{
        isSignedIn,
        getAuthToken,
        waitForClientInitialized,
        onEvent: ({ event, listener }) =>
          // SDK enforces a typed event union; the package adapter is generic.
          // The cast is safe — only "logout" is subscribed in this adapter.
          onEvent({
            event: event as "logout",
            listener: listener as () => void,
          }),
      }}
      cookieSync={{
        set: (token) => setDynamicJWT(token),
        clear: () => clearAuthCookie(),
      }}
    />
  );
}
