"use client";

/**
 * Generic Dynamic SDK init component.
 *
 * Replaces per-app `dynamic-init.tsx` boilerplate. The component is decoupled
 * from a specific SDK version: apps pass a `client` adapter (the per-app
 * `lib/dynamic` barrel exports the right SDK functions) and `cookieSync`
 * callbacks (server actions or fetch wrappers).
 *
 * Behavior:
 *   - On mount, wait for client init.
 *   - Subscribe to `logout` event → clears auth cookie.
 *   - If signed-in (returning user), fetch current token and set the cookie.
 *
 * The component never auto-syncs on `tokenChanged` because mid-OAuth-callback
 * RSC re-renders cause redirect races. Apps explicitly call `cookieSync.set`
 * inside their auth mutations (verifyOTP, completeSocialAuth, jwtAuth) when
 * they have a fresh token in hand.
 */

import { useEffect, useRef } from "react";

export interface DynamicInitClientAdapter {
  /** Returns true if the SDK reports the user is signed in. */
  isSignedIn: () => boolean;
  /** Returns the current JWT, or null if none. */
  getAuthToken: () => Promise<string | null>;
  /** Resolves once the client finished its initial setup. */
  waitForClientInitialized: () => Promise<void>;
  /** Subscribe to a Dynamic SDK event; returns an unsubscribe. */
  onEvent: (params: {
    event: string;
    listener: (...args: unknown[]) => void;
  }) => (() => void) | undefined | null;
}

export interface DynamicInitCookieSync {
  /** Persist the JWT to the auth cookie (server action or fetch wrapper). */
  set: (token: string) => Promise<unknown> | void;
  /** Clear the auth cookie on logout. */
  clear: () => Promise<unknown> | void;
}

export interface DynamicInitProps {
  client: DynamicInitClientAdapter;
  cookieSync: DynamicInitCookieSync;
  /** Optional logger. Defaults to console.error in development. */
  onError?: (error: unknown) => void;
}

export function DynamicInit({ client, cookieSync, onError }: DynamicInitProps) {
  const cleanupRef = useRef<(() => void) | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    let cancelled = false;

    async function init() {
      try {
        await client.waitForClientInitialized();
        if (cancelled) return;

        const unsubLogout = client.onEvent({
          event: "logout",
          listener: () => {
            void Promise.resolve(cookieSync.clear()).catch((err) => {
              onError?.(err);
            });
          },
        });

        cleanupRef.current = () => {
          unsubLogout?.();
        };

        if (client.isSignedIn()) {
          const token = await client.getAuthToken();
          if (token && !cancelled) {
            await cookieSync.set(token);
          }
        }
      } catch (error) {
        if (onError) onError(error);
        else if (process.env.NODE_ENV === "development") {
          // eslint-disable-next-line no-console
          console.error("[DynamicInit] init error:", error);
        }
      }
    }

    if (typeof window !== "undefined") void init();

    return () => {
      cancelled = true;
      cleanupRef.current?.();
    };
  }, [client, cookieSync, onError]);

  return null;
}
