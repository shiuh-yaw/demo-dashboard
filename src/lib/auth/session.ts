"use server";

/**
 * Session Management
 *
 * Server actions for managing authentication sessions via cookies.
 * Uses Dynamic JWT tokens stored in httpOnly cookies.
 */

import { cookies } from "next/headers";
import { env } from "@/env";
import {
  verifyDynamicJWT,
  type DynamicJwtPayload,
  TokenExpiredError,
} from "./dynamic-jwt";

const DYNAMIC_JWT_COOKIE_NAME = "dynamic_jwt";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

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
 * This is called from the client after Dynamic authentication succeeds
 */
export async function setDynamicJWT(
  jwt: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cookieStore = await cookies();
    cookieStore.set(DYNAMIC_JWT_COOKIE_NAME, jwt, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
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

  if (!jwtCookie?.value) return null;

  try {
    // Returns null if verification fails (e.g., invalid signature)
    return await verifyDynamicJWT(jwtCookie.value);
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      // Token is expired - return null, login form will replace cookie
      return null;
    }
    // For other errors, return null (already logged in verifyDynamicJWT)
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
