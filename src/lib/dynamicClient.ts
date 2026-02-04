"use client";

/**
 * Dynamic Client - Centralized SDK Integration Layer
 *
 * This module provides a singleton-based, SSR-safe interface for the Dynamic SDK.
 * Simplified version for dashboard authentication (email OTP only).
 */

import {
  createDynamicClient,
  type DynamicClient,
  type DynamicInitStatus,
  logout as sdkLogout,
  isSignedIn as sdkIsSignedIn,
  waitForClientInitialized as sdkWaitForClientInitialized,
  sendEmailOTP as sdkSendEmailOTP,
  verifyOTP as sdkVerifyOTP,
  onEvent as sdkOnEvent,
  OTPVerification,
  VerifyResponse,
} from "@dynamic-labs-sdk/client";
import { env } from "@/env";

export const environmentId = env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID || "";

// Singleton state
let _client: DynamicClient | null = null;
let _initError: Error | null = null;

/**
 * Gets or creates the Dynamic client instance (singleton pattern)
 * Returns null if environment ID is not configured (allows graceful degradation)
 */
const getClient = (): DynamicClient | null => {
  // SSR guard - return null to prevent hydration mismatches
  if (typeof window === "undefined") return null;

  // Return null if we already know initialization failed
  if (_initError) return null;

  // Return null if environment ID is not set
  if (!environmentId) {
    _initError = new Error(
      "NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID is required for authentication"
    );
    console.warn("Dynamic SDK not initialized:", _initError.message);
    return null;
  }

  // Create client on first access
  if (!_client) {
    try {
      _client = createDynamicClient({
        environmentId,
        autoInitialize: true,
        metadata: {
          name: "Demo Dashboard",
          url: window.location.origin,
        },
      });
    } catch (err) {
      _initError =
        err instanceof Error
          ? err
          : new Error("Failed to create Dynamic client");
      console.error("Failed to create Dynamic client:", _initError);
      return null;
    }
  }

  return _client;
};

/**
 * Proxy-wrapped Dynamic client for lazy initialization
 *
 * This proxy intercepts all property access and lazily initializes the client.
 * Safe to import and use immediately - handles SSR and initialization automatically.
 */
export const dynamicClient = new Proxy({} as DynamicClient, {
  get(_target, prop) {
    const client = getClient();
    if (!client) return null;
    return (client as Record<string | symbol, unknown>)[prop];
  },
});

/**
 * SSR-safe wrappers for Dynamic SDK functions
 */

export const logout = (): Promise<void> => {
  const client = getClient();
  if (!client) return Promise.resolve();
  return sdkLogout();
};

/**
 * Get the current initialization status of the Dynamic client
 * @returns 'uninitialized' | 'in-progress' | 'finished' | 'failed'
 */
export const getInitStatus = (): DynamicInitStatus => {
  const client = getClient();
  if (!client) return "uninitialized";
  return client.initStatus;
};

/**
 * Wait for the Dynamic client to be fully initialized
 * Returns a promise that resolves when the client is ready
 */
export const waitForClientInitialized = async (): Promise<void> => {
  const client = getClient();
  if (!client) return;
  return sdkWaitForClientInitialized(client);
};

/**
 * Send email OTP for authentication
 * @param email - Email address to send OTP to
 */
export const sendEmailOTP = async (params: {
  email: string;
}): Promise<OTPVerification> => {
  const client = getClient();
  if (!client) {
    throw new Error(
      environmentId
        ? "Dynamic client not initialized"
        : "NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID is required. Please configure it in your .env file."
    );
  }

  // Wait for client to be fully initialized before sending OTP
  await sdkWaitForClientInitialized(client);

  return sdkSendEmailOTP({ email: params.email });
};

/**
 * Verify OTP code for email authentication
 * @param otpVerification - OTP verification object from sendEmailOTP
 * @param verificationToken - OTP code entered by user
 */
export const verifyOTP = async (params: {
  otpVerification: OTPVerification;
  verificationToken: string;
}): Promise<VerifyResponse> => {
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");

  // Wait for client to be fully initialized before verifying OTP
  await sdkWaitForClientInitialized(client);

  return sdkVerifyOTP({
    otpVerification: params.otpVerification,
    verificationToken: params.verificationToken,
  });
};

/**
 * Get the current JWT token from the Dynamic client
 * @returns The JWT token string, or null if not available
 */
export const getJWTToken = (): string | null => {
  const client = getClient();
  if (!client) return null;

  // Access token property safely
  const token = (client as { token?: string }).token;
  return token || null;
};

/**
 * Check if user is signed in (has authenticated or connected wallet)
 * @returns true if signed in, false otherwise
 */
export const isSignedIn = (): boolean => {
  const client = getClient();
  if (!client) return false;
  return sdkIsSignedIn();
};

/**
 * Get the current authenticated user
 * @returns User object or null if not authenticated
 */
export const getUser = (): DynamicClient["user"] | null => {
  const client = getClient();
  if (!client) return null;
  return client.user ?? null;
};

/**
 * Setup auth event listeners for cookie sync
 *
 * The SDK handles token refresh internally - we just need to listen for
 * tokenChanged events and sync to cookies. No custom scheduling needed.
 *
 * @param callbacks.onTokenChange - Callback when token changes (should update cookie)
 * @param callbacks.onLogout - Callback when user logs out (should clear cookie)
 * @returns Cleanup function to remove event listeners
 */
export function setupAuthEventListeners(callbacks: {
  onTokenChange?: (token: string | null) => void;
  onLogout?: () => void;
}): () => void {
  const unsubscribers: Array<(() => void) | null> = [];

  // Listen for token changes - SDK handles refresh internally
  // The SDK passes an object { token: string | null }
  const unsubToken = sdkOnEvent({
    event: "tokenChanged" as Parameters<typeof sdkOnEvent>[0]["event"],
    listener: (args: { token: string | null }) => {
      if (args.token) {
        callbacks.onTokenChange?.(args.token);
      } else {
        callbacks.onLogout?.();
      }
    },
  });
  unsubscribers.push(unsubToken || null);

  // Listen for logout events
  const unsubLogout = sdkOnEvent({
    event: "logout" as Parameters<typeof sdkOnEvent>[0]["event"],
    listener: () => {
      callbacks.onLogout?.();
    },
  });
  unsubscribers.push(unsubLogout || null);

  // Return cleanup function
  return () => {
    unsubscribers.forEach((unsub) => unsub?.());
  };
}

export type { OTPVerification, DynamicInitStatus };
