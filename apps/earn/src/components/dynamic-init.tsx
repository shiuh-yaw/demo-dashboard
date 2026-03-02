"use client";

import { useEffect, useRef } from "react";
import {
  initializeDynamic,
  checkAuthStatus,
  getAuthToken,
  waitForClientInitialized,
  setupAuthEventListeners,
} from "@/lib/dynamic";
import {
  createWaasWalletAccounts,
  getChainsMissingWaasWalletAccounts,
} from "@dynamic-labs-sdk/client/waas";
import { setDynamicJWT, clearDashboardAuth } from "@/lib/auth/session";

/**
 * Check if current URL has OAuth callback parameters
 */
function hasOAuthParams(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  // Dynamic OAuth uses 'code' and 'state' params
  return params.has("code") && params.has("state");
}

/**
 * Component that initializes Dynamic SDK and syncs auth state.
 * 
 * Responsibilities:
 * - Initialize Dynamic SDK
 * - Setup event listeners for token changes (cookie sync)
 * - Sync existing auth state to cookies (for returning users)
 * 
 * IMPORTANT: Does NOT handle OAuth - useCompleteSocialAuth hook handles that.
 * This component only syncs existing auth state for returning users.
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
        // Initialize Dynamic client
        await initializeDynamic();
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

        // If we're on login page with OAuth params, let useCompleteSocialAuth handle it
        // Don't try to sync or redirect - that would cause race conditions
        if (window.location.pathname === "/login" && hasOAuthParams()) {
          return;
        }

        // Check if user is already authenticated (returning user, page refresh, etc.)
        const authStatus = checkAuthStatus();
        if (!authStatus) {
          return; // Not authenticated, nothing to sync
        }

        // User is authenticated in Dynamic SDK - sync to server cookie
        
        // Ensure embedded wallet exists
        const missingChains = getChainsMissingWaasWalletAccounts();
        if (missingChains.includes("EVM")) {
          try {
            await createWaasWalletAccounts({ chains: ["EVM"] });
            // Wait for token to update with new wallet
            await new Promise((resolve) => setTimeout(resolve, 500));
          } catch {
            // Wallet might already exist, which is fine
          }
        }

        // Sync JWT to cookie
        const jwt = await getAuthToken();
        if (jwt) {
          await setDynamicJWT(jwt);

          // If we're on the login page but authenticated (no OAuth params), redirect to earn
          // This handles returning users who are already logged in
          if (window.location.pathname === "/login") {
            window.location.href = "/earn";
          }
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
