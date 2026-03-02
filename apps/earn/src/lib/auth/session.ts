"use server";

/**
 * Session Management
 *
 * Server actions for managing authentication sessions via cookies.
 * Uses Dynamic JWT tokens stored in httpOnly cookies.
 * Cookie expiration is synced with JWT expiration for consistency.
 */

import { cookies } from "next/headers";
import { env } from "@/env";
import jwt from "jsonwebtoken";
import {
  verifyDynamicJWT,
  type DynamicJwtPayload,
  TokenExpiredError,
} from "./dynamic-jwt";

const DYNAMIC_JWT_COOKIE_NAME = "dynamic_jwt";
const DEFAULT_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days fallback

/**
 * Extract expiration time from JWT and calculate remaining seconds
 * Returns the time until expiration, or default if not available
 */
function getJwtExpirationSeconds(token: string): number {
  try {
    const decoded = jwt.decode(token) as { exp?: number } | null;
    if (decoded?.exp) {
      const now = Math.floor(Date.now() / 1000);
      const remaining = decoded.exp - now;
      // Return remaining time, but cap at default max and ensure at least 60 seconds
      return Math.max(60, Math.min(remaining, DEFAULT_COOKIE_MAX_AGE));
    }
  } catch {
    // If decoding fails, use default
  }
  return DEFAULT_COOKIE_MAX_AGE;
}

/**
 * Check if user is authenticated
 * Verifies the token is valid (not just present) to catch expired tokens
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

/**
 * Set Dynamic JWT token in cookie after successful authentication
 * Cookie maxAge is synced with JWT expiration to prevent stale cookies
 */
export async function setDynamicJWT(
  token: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const cookieStore = await cookies();
    // Sync cookie expiration with JWT expiration
    const maxAge = getJwtExpirationSeconds(token);

    cookieStore.set(DYNAMIC_JWT_COOKIE_NAME, token, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge,
      path: "/",
    });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to set auth cookie",
    };
  }
}

/**
 * Clear dashboard auth cookie (logout)
 */
export async function clearDashboardAuth(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(DYNAMIC_JWT_COOKIE_NAME);
}

/**
 * Get current authenticated user from JWT cookie
 * Returns null if not authenticated or token is invalid/expired
 *
 * Note: Cannot clear cookies in Server Components. Invalid cookies will be
 * replaced when the user authenticates again via the login form.
 */
export async function getCurrentUser(): Promise<DynamicJwtPayload | null> {
  const cookieStore = await cookies();
  const jwtCookie = cookieStore.get(DYNAMIC_JWT_COOKIE_NAME);

  if (!jwtCookie?.value) {
    return null;
  }

  try {
    // Returns null if verification fails (e.g., invalid signature)
    const user = await verifyDynamicJWT(jwtCookie.value);
    return user;
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      // Token is expired - return null, login form will replace cookie
      return null;
    }
    // For other errors, return null
    return null;
  }
}

/**
 * Clear expired token cookie
 * This is a separate server action that can be called to clear expired tokens
 */
export async function clearExpiredToken(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(DYNAMIC_JWT_COOKIE_NAME);
}
