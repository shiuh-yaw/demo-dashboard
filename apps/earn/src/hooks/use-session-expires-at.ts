"use client";

/**
 * Hook to get session expiration timestamp.
 * Automatically updates when user state changes.
 *
 * Useful for showing session expiration warnings or auto-logout.
 *
 * @example
 * ```tsx
 * const sessionExpiresAt = useSessionExpiresAt();
 *
 * if (sessionExpiresAt) {
 *   const expiresIn = sessionExpiresAt - Date.now();
 *   if (expiresIn < 5 * 60 * 1000) {
 *     // Show "session expiring soon" warning
 *   }
 * }
 * ```
 */

import { useClientState } from "./use-client-state";

export const useSessionExpiresAt = () =>
  useClientState("userChanged", (client) => client.sessionExpiresAt);
