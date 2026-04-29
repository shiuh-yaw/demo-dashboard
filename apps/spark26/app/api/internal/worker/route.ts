import { NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { z } from "zod";
import { runCventPostback } from "@/lib/cvent/postback";

const bodySchema = z.object({
  confirmation: z.string().regex(/^[A-Za-z0-9]{1,32}$/),
});

async function handler(req: Request) {
  // Read raw body so we can log it on a schema miss — 400 tells QStash to
  // stop retrying, so without this log we have no way to diagnose why a
  // genuinely mangled delivery was rejected.
  const rawBody = await req.text().catch(() => "");
  let payload: unknown = {};
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    // non-JSON body: payload stays {} and schema will reject below
  }
  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    console.warn(
      `[spark26][worker] bad body rejected (400): body=${rawBody.slice(0, 200)} | zod=${JSON.stringify(parsed.error.issues).slice(0, 200)}`,
    );
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  const result = await runCventPostback(parsed.data.confirmation);
  if (result.ok) {
    return NextResponse.json(result, { status: 200 });
  }
  // Permanent failure → 200 so QStash stops retrying.
  if (!result.retry) {
    return NextResponse.json({ ok: true, failed: result.error }, { status: 200 });
  }
  // Transient → 500 so QStash retries with backoff.
  return NextResponse.json({ error: result.error }, { status: 500 });
}

export const POST = verifySignatureAppRouter(handler);
