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
  getJWTFromCookies,
  type DynamicJwtPayload,
} from "@dynamic-demos/dynamic";

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
 * Check if user is authenticated for dashboard
 * Verifies the token is valid (not just present) to catch expired tokens
 */
export async function isDashboardAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

/**
 * Set Dynamic JWT token in cookie after successful authentication
 * Cookie maxAge is synced with JWT expiration to prevent stale cookies
 */
export async function setDynamicJWT(
  jwtToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cookieStore = await cookies();
    // Sync cookie expiration with JWT expiration
    const maxAge = getJwtExpirationSeconds(jwtToken);

    cookieStore.set(DYNAMIC_JWT_COOKIE_NAME, jwtToken, {
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
  const token = getJWTFromCookies(cookieStore);
  if (!token) return null;
  return verifyDynamicJWT(token);
}

/**
 * Clear expired token cookie
 * This is a separate server action that can be called to clear expired tokens
 */
export async function clearExpiredToken(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(DYNAMIC_JWT_COOKIE_NAME);
}
