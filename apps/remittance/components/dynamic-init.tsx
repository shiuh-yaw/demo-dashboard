"use client";

import { useEffect, useRef } from "react";
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
  const cleanupRef = useRef<(() => void) | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    async function init() {
      try {
        await waitForClientInitialized();

        // Listen for logout — clear cookie
        const unsubLogout = onEvent({
          event: "logout",
          listener: () => {
            void clearAuthCookie();
          },
        });

        cleanupRef.current = () => {
          unsubLogout?.();
        };

        // Returning user: sync existing auth to cookie
        if (isSignedIn()) {
          const jwt = await getAuthToken();
          if (jwt) {
            await setDynamicJWT(jwt);
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("DynamicInit error:", error);
        }
      }
    }

    if (typeof window !== "undefined") void init();

    return () => {
      cleanupRef.current?.();
    };
  }, []);

  return null;
}
