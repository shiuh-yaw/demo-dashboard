"use client";

import { useEffect, useRef } from "react";
import {
  isSignedIn,
  getJWTToken,
  waitForClientInitialized,
  setupAuthEventListeners,
} from "@/lib/dynamicClient";
import { setDynamicJWT, clearDashboardAuth } from "@/lib/auth/session";

/**
 * Component that initializes Dynamic SDK event listeners and syncs auth state.
 *
 * Responsibilities:
 * - Setup event listeners for token changes (cookie sync)
 * - Sync existing auth state to cookies (for returning users)
 *
 * This component prevents logout issues by ensuring:
 * 1. Token changes from SDK are synced to cookies
 * 2. Returning users have their existing auth state synced
 */
export function DynamicInit() {
  const cleanupRef = useRef<(() => void) | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    // Prevent double initialization in strict mode
    if (initializedRef.current) return;
    initializedRef.current = true;

    async function init() {
      try {
        // Wait for Dynamic client to be ready
        await waitForClientInitialized();

        // Setup event listeners for auth state changes
        // These sync token changes to cookies automatically
        cleanupRef.current = setupAuthEventListeners({
          onTokenChange: async (token) => {
            if (token) {
              await setDynamicJWT(token);
            }
          },
          onLogout: async () => {
            await clearDashboardAuth();
          },
        });

        // Check if user is already authenticated (returning user, page refresh, etc.)
        const authStatus = isSignedIn();
        if (!authStatus) {
          return; // Not authenticated, nothing to sync
        }

        // User is authenticated in Dynamic SDK - sync to server cookie
        const jwt = getJWTToken();
        if (jwt) {
          await setDynamicJWT(jwt);
        }
      } catch (error) {
        // Silently handle initialization errors - don't crash the app
        if (process.env.NODE_ENV === "development") {
          console.error("Dynamic initialization error:", error);
        }
      }
    }

    // Only initialize in browser
    if (typeof window !== "undefined") init();

    // Cleanup on unmount
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  return null;
}
