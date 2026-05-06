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
 * Auth mutations (useVerifyOTP) explicitly await syncCookie before
 * navigating, so DynamicInit does NOT sync on tokenChanged — that would
 * trigger RSC cache invalidation mid-navigation, causing redirect races.
 *
 * - Returning users: sync existing token to cookie on init.
 * - Logout: clear cookie.
 */
export function DynamicInit() {
  return (
    <PackageDynamicInit
      client={{
        isSignedIn,
        getAuthToken,
        waitForClientInitialized,
        onEvent: ({ event, listener }) =>
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
