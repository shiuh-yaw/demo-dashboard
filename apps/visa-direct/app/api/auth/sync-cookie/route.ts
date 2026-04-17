import { cookies } from "next/headers";
import {
  DYNAMIC_JWT_COOKIE_NAME,
  getJwtExpirationSeconds,
} from "@/lib/auth/cookie-utils";
import { env } from "@/lib/env";

/**
 * POST /api/auth/sync-cookie
 *
 * Sets the Dynamic JWT as an httpOnly cookie without triggering RSC re-rendering.
 * Using a plain API route (not a server action) prevents redirect races during
 * OAuth login flows.
 */
export async function POST(req: Request) {
  try {
    const { token } = (await req.json()) as { token?: string };
    if (!token || typeof token !== "string") {
      return Response.json(
        { success: false, error: "Missing token" },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();
    const maxAge = getJwtExpirationSeconds(token);

    cookieStore.set(DYNAMIC_JWT_COOKIE_NAME, token, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge,
      path: "/",
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to set auth cookie",
      },
      { status: 500 },
    );
  }
}
