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
 * Mirrors apps/dashboard DynamicInit pattern:
 * - Listens for tokenChanged → syncs to cookie
 * - Listens for logout → clears cookie
 * - On init: if already signed in, syncs token (returning users)
 *
 * Enables middleware and server components to verify auth via dynamic_jwt cookie.
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

        // Listen for token changes — sync to cookie on login/refresh
        const unsubToken = onEvent({
          event: "tokenChanged",
          listener: (args: { token?: string | null }) => {
            const token = args?.token;
            if (token) {
              void setDynamicJWT(token);
            } else {
              void clearAuthCookie();
            }
          },
        });

        // Listen for logout — clear cookie
        const unsubLogout = onEvent({
          event: "logout",
          listener: () => {
            void clearAuthCookie();
          },
        });

        cleanupRef.current = () => {
          unsubToken?.();
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
