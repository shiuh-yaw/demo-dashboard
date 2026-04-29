import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ADMIN_COOKIE_NAME,
  verifyAdminSession,
} from "@/lib/auth/admin-session";
import { runCventPostback } from "@/lib/cvent/postback";

export const dynamic = "force-dynamic";

const confirmationSchema = z.string().regex(/^[A-Za-z0-9]{1,32}$/);

function extractCookie(req: Request): string | null {
  const header = req.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === ADMIN_COOKIE_NAME) return rest.join("=");
  }
  return null;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ confirmation: string }> },
) {
  const cookie = extractCookie(req);
  if (!cookie || !verifyAdminSession(cookie).ok) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  const { confirmation } = await params;
  const parsed = confirmationSchema.safeParse(confirmation);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "bad confirmation" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  const result = await runCventPostback(parsed.data);
  // Distinguish transient (retryable) from permanent Cvent failures so the
  // admin UI doesn't invite endless retries of a doomed call. `runCventPostback`
  // marks 4xx (except 429) as `retry=false` — those become 422 here.
  const status = result.ok ? 200 : result.retry ? 502 : 422;
  return NextResponse.json(result, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
