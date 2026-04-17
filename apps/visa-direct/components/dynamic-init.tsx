"use client";

import { useEffect, useRef } from "react";
import {
  isSignedIn,
  getAuthToken,
  waitForClientInitialized,
  onEvent,
} from "@/lib/dynamic";
import { setDynamicJWT, clearAuthCookie } from "@/lib/auth/session";
import { env } from "@/lib/env";

/**
 * Initializes Dynamic SDK auth event listeners and syncs auth state to cookies.
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

        const unsubLogout = onEvent({
          event: "logout",
          listener: () => {
            void clearAuthCookie();
          },
        });

        cleanupRef.current = () => {
          unsubLogout?.();
        };

        if (isSignedIn()) {
          const jwt = await getAuthToken();
          if (jwt) {
            await setDynamicJWT(jwt);
          }
        }
      } catch (error) {
        if (env.NODE_ENV === "development") {
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
