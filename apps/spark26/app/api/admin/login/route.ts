import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { env } from "@/lib/env";
import { ipLimiter } from "@/lib/upstash/ratelimit";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_COOKIE_TTL_MS,
  signAdminSession,
} from "@/lib/auth/admin-session";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ password: z.string().min(1) });

function eq(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const limited = await ipLimiter().limit(`admin-login:${ip}`);
  if (!limited.success) {
    return NextResponse.json(
      { error: "rate limited" },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  }

  let parsed;
  try {
    parsed = bodySchema.safeParse(await req.json());
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }

  if (
    !env.SPARK26_ADMIN_SECRET ||
    !eq(parsed.data.password, env.SPARK26_ADMIN_SECRET)
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cookie = signAdminSession();
  const attrs = [
    `${ADMIN_COOKIE_NAME}=${cookie}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${Math.floor(ADMIN_COOKIE_TTL_MS / 1000)}`,
    process.env.NODE_ENV === "production" ? "Secure" : null,
  ]
    .filter(Boolean)
    .join("; ");

  return NextResponse.json(
    { ok: true },
    {
      status: 200,
      headers: { "Set-Cookie": attrs, "Cache-Control": "no-store" },
    },
  );
}
