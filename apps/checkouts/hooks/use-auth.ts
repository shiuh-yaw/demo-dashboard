"use client";

/**
 * Auth Hook
 *
 * Reactive hook for tracking Dynamic SDK auth state.
 * Uses useSyncExternalStore for proper React integration.
 */

import { useSyncExternalStore } from "react";
import { isSignedIn, onEvent } from "@/lib/dynamicClient";

/** Events that indicate potential auth state changes */
const AUTH_EVENTS = [
  "userChanged",
  "walletAccountsChanged",
  "logout",
  "initStatusChanged",
] as const;

/**
 * Subscribe to auth-related SDK events
 * Returns cleanup function to unsubscribe
 */
function subscribeToAuthEvents(callback: () => void): () => void {
  const unsubscribes = AUTH_EVENTS.map((event) =>
    onEvent({ event: event as any, listener: callback }),
  );
  return () => unsubscribes.forEach((unsub) => unsub?.());
}

/**
 * Get current auth state from SDK
 */
function getAuthSnapshot(): boolean {
  return isSignedIn();
}

/**
 * Server-side snapshot - always returns false since auth requires browser
 */
function getAuthServerSnapshot(): boolean {
  return false;
}

/**
 * Hook to reactively track Dynamic auth state
 *
 * Uses React's useSyncExternalStore to subscribe to Dynamic SDK auth events.
 * This pattern ensures the component re-renders when auth state changes
 * without requiring polling or manual state management.
 *
 * @returns true if user is authenticated, false otherwise
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isLoggedIn = useAuth();
 *   return isLoggedIn ? <Dashboard /> : <LoginScreen />;
 * }
 * ```
 */
export function useAuth(): boolean {
  return useSyncExternalStore(
    subscribeToAuthEvents,
    getAuthSnapshot,
    getAuthServerSnapshot,
  );
}
